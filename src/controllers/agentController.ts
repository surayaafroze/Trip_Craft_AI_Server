import { Request, Response } from "express";
import { getDB } from "../config/db";
import { ObjectId } from "mongodb";
import { ChatMessage } from "../types/chat";
import { env } from "../config/env";
import Anthropic from "@anthropic-ai/sdk";
import { toolsDefinition, executeTool } from "../services/agentService";

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
  const userId = (req as any).user?.id;
  const { tripId, message } = req.body;
  try {
    const db = getDB();
    console.log("Chat handler called. Active ANTHROPIC_API_KEY:", env.ANTHROPIC_API_KEY ? env.ANTHROPIC_API_KEY.substring(0, 15) + "..." : "undefined");

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

    const systemInstruction = "You are a helpful travel assistant. You can help the user plan trips, search for destinations, and update their itinerary. Use the provided tools when necessary. Always provide a friendly, concise response.";

    const anthropicMessages: Anthropic.MessageParam[] = [];

    for (const msg of recentMessages) {
      if (msg.role === "system") continue;

      if (msg.role === "user") {
        anthropicMessages.push({ role: "user", content: msg.content || "" });
      } else if (msg.role === "assistant") {
        const content: Anthropic.ContentBlockParam[] = [];
        if (msg.content) {
          content.push({ type: "text", text: msg.content });
        }
        if (msg.tool_calls) {
          for (const tc of msg.tool_calls) {
            content.push({
              type: "tool_use",
              id: tc.id,
              name: tc.function.name,
              input: JSON.parse(tc.function.arguments)
            });
          }
        }
        if (content.length > 0) {
          anthropicMessages.push({ role: "assistant", content });
        }
      } else if (msg.role === "tool") {
        const lastMsg = anthropicMessages[anthropicMessages.length - 1];
        
        const toolResultBlock: Anthropic.ToolResultBlockParam = {
          type: "tool_result",
          tool_use_id: msg.tool_call_id!,
          content: msg.content || ""
        };

        if (lastMsg && lastMsg.role === "user" && Array.isArray(lastMsg.content)) {
           lastMsg.content.push(toolResultBlock);
        } else {
           anthropicMessages.push({
             role: "user",
             content: [toolResultBlock]
           });
        }
      }
    }

    // ReAct Loop
    let keepRunning = true;
    let loopCount = 0;
    const MAX_LOOPS = 5;

    const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    
    while (keepRunning && loopCount < MAX_LOOPS) {
      loopCount++;
      keepRunning = false;

      let assistantContent = "";
      
      const stream = anthropic.messages.stream({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        system: systemInstruction,
        messages: anthropicMessages,
        tools: toolsDefinition as Anthropic.Tool[],
      });

      stream.on('text', (textDelta) => {
         assistantContent += textDelta;
         res.write(`data: ${JSON.stringify({ type: "text", content: textDelta })}\n\n`);
      });

      const message = await stream.finalMessage();
      
      const toolUses = message.content.filter(b => b.type === "tool_use") as Anthropic.ToolUseBlock[];

      if (toolUses.length > 0) {
        const toolCallsForDB = toolUses.map(tu => ({
          id: tu.id,
          type: "function",
          function: {
            name: tu.name,
            arguments: JSON.stringify(tu.input)
          }
        }));

        await db.collection("chatMessages").insertOne({
          tripId: new ObjectId(tripId as string),
          userId: new ObjectId(userId),
          role: "assistant",
          content: assistantContent || null,
          tool_calls: toolCallsForDB,
          createdAt: new Date()
        });
        
        anthropicMessages.push({ role: "assistant", content: message.content });

        const toolResultBlocks: Anthropic.ToolResultBlockParam[] = [];

        for (const tu of toolUses) {
          res.write(`data: ${JSON.stringify({ type: "tool_start", name: tu.name })}\n\n`);
          
          const args = tu.input as any;
          if (!args.tripId) args.tripId = tripId;

          let toolResultStr = "";
          try {
            const toolResult = await executeTool(tu.name, args);
            toolResultStr = JSON.stringify(toolResult);
          } catch (err: any) {
            console.error("Tool execution error:", err);
            toolResultStr = JSON.stringify({ error: err.message });
          }

          await db.collection("chatMessages").insertOne({
            tripId: new ObjectId(tripId as string),
            userId: new ObjectId(userId),
            role: "tool",
            content: toolResultStr,
            tool_call_id: tu.id,
            name: tu.name,
            createdAt: new Date()
          });

          toolResultBlocks.push({
            type: "tool_result",
            tool_use_id: tu.id,
            content: toolResultStr
          });

          res.write(`data: ${JSON.stringify({ type: "tool_end", name: tu.name })}\n\n`);
        }
        
        anthropicMessages.push({
          role: "user",
          content: toolResultBlocks
        });
        
        keepRunning = true;
      } else {
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

    if (loopCount >= MAX_LOOPS && keepRunning) {
      const fallbackMsg = "I had to stop thinking because it was taking too long. Please try asking in a different way.";
      res.write(`data: ${JSON.stringify({ type: "text", content: fallbackMsg })}\n\n`);
      await db.collection("chatMessages").insertOne({
        tripId: new ObjectId(tripId as string),
        userId: new ObjectId(userId),
        role: "assistant",
        content: fallbackMsg,
        createdAt: new Date()
      });
    }

    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (error: any) {
    console.error("Chat error:", error);
    const friendlyMsg = error.message || "Internal server error";
    res.write(`data: ${JSON.stringify({ type: "error", error: friendlyMsg })}\n\n`);
    res.end();
  }
};
