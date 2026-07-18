import { Request, Response } from "express";
import { getDB } from "../config/db";
import { ObjectId } from "mongodb";
import { ChatMessage } from "../types/chat";
import OpenAI from "openai";
import { toolsDefinition, executeTool } from "../services/agentService";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const getChatHistory = async (req: Request, res: Response) => {
  try {
    const db = getDB();
    const { tripId } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const messages = await db.collection<ChatMessage>("chatMessages")
      .find({ tripId: new ObjectId(tripId as string), userId: new ObjectId(userId) })
      .sort({ createdAt: 1 })
      .toArray();

    res.json(messages);
  } catch (error) {
    console.error("Error fetching chat history:", error);
    res.status(500).json({ error: "Failed to fetch chat history" });
  }
};

export const chat = async (req: Request, res: Response) => {
  try {
    const db = getDB();
    const userId = (req as any).user?.id;
    const { tripId, message } = req.body;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!tripId || !message) return res.status(400).json({ error: "Missing tripId or message" });

    // Validate trip ownership
    const trip = await db.collection("trips").findOne({ _id: new ObjectId(tripId as string), userId: new ObjectId(userId) });
    if (!trip) return res.status(404).json({ error: "Trip not found" });

    // Save user message
    const userMsg: ChatMessage = {
      tripId: new ObjectId(tripId as string),
      userId: new ObjectId(userId),
      role: "user",
      content: message,
      createdAt: new Date()
    };
    await db.collection("chatMessages").insertOne(userMsg);

    // Setup SSE response
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    // Fetch last 20 messages for context
    const recentMessages = await db.collection<ChatMessage>("chatMessages")
      .find({ tripId: new ObjectId(tripId as string) })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();
    
    recentMessages.reverse();

    const openAiMessages: any[] = [
      { role: "system", content: "You are a helpful travel assistant. You can help the user plan trips, search for destinations, and update their itinerary. Use the provided tools when necessary. Always provide a friendly, concise response." }
    ];

    for (const msg of recentMessages) {
      const formattedMsg: any = { role: msg.role, content: msg.content };
      if (msg.name) formattedMsg.name = msg.name;
      if (msg.tool_call_id) formattedMsg.tool_call_id = msg.tool_call_id;
      if (msg.tool_calls) formattedMsg.tool_calls = msg.tool_calls;
      openAiMessages.push(formattedMsg);
    }

    // ReAct Loop
    let keepRunning = true;
    while (keepRunning) {
      keepRunning = false;

      const stream = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: openAiMessages,
        tools: toolsDefinition,
        stream: true,
      });

      let assistantContent = "";
      const toolCallsMap = new Map<number, any>();

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;

        if (delta?.content) {
          assistantContent += delta.content;
          res.write(`data: ${JSON.stringify({ type: "text", content: delta.content })}\n\n`);
        }

        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            if (!toolCallsMap.has(tc.index)) {
              toolCallsMap.set(tc.index, { id: tc.id, type: "function", function: { name: tc.function?.name || "", arguments: "" } });
            }
            const existing = toolCallsMap.get(tc.index);
            if (tc.function?.arguments) {
              existing.function.arguments += tc.function.arguments;
            }
          }
        }
      }

      const toolCalls = Array.from(toolCallsMap.values());

      if (toolCalls.length > 0) {
        // We have tool calls. Let's save the assistant's tool call message
        const assistantToolMsg: ChatMessage = {
          tripId: new ObjectId(tripId as string),
          userId: new ObjectId(userId),
          role: "assistant",
          content: assistantContent || null,
          tool_calls: toolCalls,
          createdAt: new Date()
        };
        await db.collection("chatMessages").insertOne(assistantToolMsg);
        
        openAiMessages.push({
          role: "assistant",
          content: assistantContent || null,
          tool_calls: toolCalls
        });

        // Execute all tools
        for (const tc of toolCalls) {
          const args = JSON.parse(tc.function.arguments);
          try {
            res.write(`data: ${JSON.stringify({ type: "tool_start", name: tc.function.name })}\n\n`);
            
            // Add tripId implicitly if the tool requires it and we have it
            if (!args.tripId) args.tripId = tripId;

            const toolResult = await executeTool(tc.function.name, args);
            const toolResultStr = JSON.stringify(toolResult);
            
            const toolMsg: ChatMessage = {
              tripId: new ObjectId(tripId as string),
              userId: new ObjectId(userId),
              role: "tool",
              content: toolResultStr,
              tool_call_id: tc.id,
              name: tc.function.name,
              createdAt: new Date()
            };
            await db.collection("chatMessages").insertOne(toolMsg);
            
            openAiMessages.push({
              role: "tool",
              content: toolResultStr,
              tool_call_id: tc.id,
              name: tc.function.name
            });

            res.write(`data: ${JSON.stringify({ type: "tool_end", name: tc.function.name })}\n\n`);
          } catch (err: any) {
            console.error("Tool execution error:", err);
            const errStr = JSON.stringify({ error: err.message });
            
            await db.collection("chatMessages").insertOne({
              tripId: new ObjectId(tripId as string),
              userId: new ObjectId(userId),
              role: "tool",
              content: errStr,
              tool_call_id: tc.id,
              name: tc.function.name,
              createdAt: new Date()
            });

            openAiMessages.push({
              role: "tool",
              content: errStr,
              tool_call_id: tc.id,
              name: tc.function.name
            });
          }
        }
        
        // Loop again with the tool results
        keepRunning = true;
      } else {
        // No tool calls, just final text
        if (assistantContent) {
          await db.collection("chatMessages").insertOne({
            tripId: new ObjectId(tripId as string),
            userId: new ObjectId(userId),
            role: "assistant",
            content: assistantContent,
            createdAt: new Date()
          });
        }
      }
    }

    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (error) {
    console.error("Chat error:", error);
    res.write(`data: ${JSON.stringify({ type: "error", error: "Internal server error" })}\n\n`);
    res.end();
  }
};
