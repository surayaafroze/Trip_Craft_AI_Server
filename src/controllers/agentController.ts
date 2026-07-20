import { Request, Response } from "express";
import { getDB } from "../config/db";
import { ObjectId } from "mongodb";
import { ChatMessage } from "../types/chat";
import { env } from "../config/env";
import Groq from "groq-sdk";
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
    console.log("Chat handler called. Active GROQ_API_KEY:", env.GROQ_API_KEY ? env.GROQ_API_KEY.substring(0, 10) + "..." : "undefined");

    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!tripId || !message) return res.status(400).json({ error: "Missing tripId or message" });

    const trip = await db.collection("trips").findOne({ _id: new ObjectId(tripId as string), userId: new ObjectId(userId) });
    if (!trip) return res.status(404).json({ error: "Trip not found" });

    const userMsg: ChatMessage = {
      tripId: new ObjectId(tripId as string),
      userId: new ObjectId(userId),
      role: "user",
      content: message,
      createdAt: new Date()
    };
    await db.collection("chatMessages").insertOne(userMsg);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const recentMessages = await db.collection<ChatMessage>("chatMessages")
      .find({ tripId: new ObjectId(tripId as string) })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();
    
    recentMessages.reverse();

    const groqMessages: any[] = [];
    const systemInstruction = `You are an expert travel assistant AI with access to external tools.
CRITICAL INSTRUCTIONS:
- You MUST use the provided tools to search destinations, update itineraries, and estimate budgets whenever requested.
- DO NOT hallucinate or make up itinerary details without using tools. Use the updateItineraryDay tool to save the itinerary to the database.
- WORKFLOW: If the user asks to plan a trip:
  1. Use updateTripDetails FIRST to update the destination and budget if they changed.
  2. Use searchDestinations to find activities.
  3. Use updateItineraryDay to save the itinerary.
  4. Use estimateTripBudget to calculate the final cost.
- You implicitly have the user's current tripId. If a tool requires 'tripId', always pass 'current'.
- NEVER output raw JSON to the user. Always communicate in a friendly, conversational tone after using tools.
- IMPORTANT (PREVENT HALLUCINATED SUCCESS): If ANY tool returns an error, you MUST respond exactly with: "I couldn't save your itinerary because the tool failed." Do NOT say the itinerary has been saved unless the tool execution succeeded.

CURRENT TRIP STATE FROM DATABASE:
Title: ${trip.title}
Region: ${trip.region}
Target Budget: $${trip.budgetTarget}
Current Estimated Cost: $${trip.estimatedTotalCost || 0}
Current Itinerary Saved in Database:
${JSON.stringify(trip.itinerary || [], null, 2)}`;
    
    groqMessages.push({ role: "system", content: systemInstruction });

    for (const msg of recentMessages) {
      if (msg.role === "system") continue;

      if (msg.role === "user") {
        groqMessages.push({ role: "user", content: msg.content || "" });
      } else if (msg.role === "assistant") {
        const payload: any = { role: "assistant" };
        if (msg.content) payload.content = msg.content;
        if (msg.tool_calls) {
          payload.tool_calls = msg.tool_calls.map(tc => ({
            id: tc.id,
            type: "function",
            function: {
              name: tc.function.name,
              arguments: typeof tc.function.arguments === "string" ? tc.function.arguments : JSON.stringify(tc.function.arguments)
            }
          }));
        }
        groqMessages.push(payload);
      } else if (msg.role === "tool") {
        groqMessages.push({
          role: "tool",
          tool_call_id: msg.tool_call_id,
          name: msg.name,
          content: msg.content || ""
        });
      }
    }

    let keepRunning = true;
    let loopCount = 0;
    const MAX_LOOPS = 5;

    const groq = new Groq({ apiKey: env.GROQ_API_KEY });
    
    while (keepRunning && loopCount < MAX_LOOPS) {
      loopCount++;
      keepRunning = false;

      const stream = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: groqMessages,
        tools: toolsDefinition as any,
        tool_choice: "auto",
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
              toolCallsMap.set(tc.index, {
                id: tc.id,
                type: "function",
                function: { name: tc.function?.name, arguments: tc.function?.arguments || "" }
              });
            } else {
              const existing = toolCallsMap.get(tc.index);
              if (tc.function?.arguments) {
                existing.function.arguments += tc.function.arguments;
              }
            }
          }
        }
      }

      const toolCalls = Array.from(toolCallsMap.values());

      if (toolCalls.length > 0) {
        await db.collection("chatMessages").insertOne({
          tripId: new ObjectId(tripId as string),
          userId: new ObjectId(userId),
          role: "assistant",
          content: assistantContent || null,
          tool_calls: toolCalls,
          createdAt: new Date()
        });

        const assistantMsgPayload: any = { role: "assistant", tool_calls: toolCalls };
        if (assistantContent) assistantMsgPayload.content = assistantContent;
        groqMessages.push(assistantMsgPayload);

        for (const tc of toolCalls) {
          res.write(`data: ${JSON.stringify({ type: "tool_start", name: tc.function.name })}\n\n`);
          
          let args;
          let parseError = null;
          try {
            args = JSON.parse(tc.function.arguments);
          } catch (e: any) {
            parseError = e.message;
            args = {};
          }
          // Forcefully inject the correct tripId, ignoring whatever the LLM passed
          args.tripId = tripId;

          let toolResultStr = "";
          try {
            if (parseError) {
              const errMsg = `Failed to parse tool arguments: ${parseError}. Please ensure arguments are valid JSON.`;
              console.error(`[Tool Parse Error] Tool: ${tc.function.name}, Raw Args: ${tc.function.arguments}, Error: ${parseError}`);
              throw new Error(errMsg);
            }
            
            console.log("\n=========================================");
            console.log("Tool Called:", tc.function.name);
            console.log("Arguments:", JSON.stringify(args, null, 2));
            console.log("Executing tool...");
            
            const toolResult = await executeTool(tc.function.name, args);
            
            console.log("Tool execution completed.");
            console.log("Result:", JSON.stringify(toolResult, null, 2));
            console.log("=========================================\n");
            
            toolResultStr = JSON.stringify(toolResult);
          } catch (err: any) {
            console.error(`\n================= TOOL EXECUTION ERROR =================`);
            console.error(`Tool Name: ${tc.function.name}`);
            console.error(`Arguments: ${JSON.stringify(args, null, 2)}`);
            console.error(`Stack Trace: ${err.stack || err.message}`);
            console.error(`========================================================\n`);
            toolResultStr = JSON.stringify({ error: err.message || "Internal tool execution failed" });
          }

          await db.collection("chatMessages").insertOne({
            tripId: new ObjectId(tripId as string),
            userId: new ObjectId(userId),
            role: "tool",
            content: toolResultStr,
            tool_call_id: tc.id,
            name: tc.function.name,
            createdAt: new Date()
          });

          groqMessages.push({
            role: "tool",
            tool_call_id: tc.id,
            name: tc.function.name,
            content: toolResultStr
          });

          res.write(`data: ${JSON.stringify({ type: "tool_end", name: tc.function.name })}\n\n`);
        }
        
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
