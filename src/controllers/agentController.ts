import { Request, Response } from "express";
import { getDB } from "../config/db";
import { ObjectId } from "mongodb";
import { ChatMessage } from "../types/chat";
import { env } from "../config/env";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { toolsDefinition, executeTool } from "../services/agentService";

// Gemini instance will be created lazily when needed

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
    console.log("Chat handler called. Active GEMINI_API_KEY:", env.GEMINI_API_KEY ? env.GEMINI_API_KEY.substring(0, 15) + "..." : "undefined");

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

    const parseJSON = (str: string) => {
      try {
        return str ? JSON.parse(str) : {};
      } catch (e) {
        return { data: str };
      }
    };

    const geminiMessages: any[] = [];

    for (const msg of recentMessages) {
      if (msg.role === "system") continue;
      
      let role: string = msg.role;
      if (role === "assistant") role = "model";
      if (role === "tool") role = "user";
      
      const parts: any[] = [];
      if (msg.content && msg.role !== "tool") parts.push({ text: msg.content });

      if (msg.role === "assistant" && msg.tool_calls) {
        for (const tc of msg.tool_calls) {
          parts.push({
            functionCall: {
              name: tc.function.name,
              args: parseJSON(tc.function.arguments)
            }
          });
        }
      }

      if (msg.role === "tool") {
        parts.push({
          functionResponse: {
            name: msg.name,
            response: parseJSON(msg.content || "")
          }
        });
      }

      if (geminiMessages.length > 0 && geminiMessages[geminiMessages.length - 1].role === role) {
        geminiMessages[geminiMessages.length - 1].parts.push(...parts);
      } else {
        geminiMessages.push({ role, parts });
      }
    }

    // Helper: retry Gemini calls on 429 rate-limit errors with exponential backoff
    const callWithRetry = async (fn: () => Promise<any>, maxRetries = 3): Promise<any> => {
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await fn();
        } catch (err: any) {
          const is429 = err?.status === 429 || err?.code === 429 ||
            (typeof err?.message === "string" && err.message.includes("429"));

          if (is429 && attempt < maxRetries) {
            // Try to extract retryDelay from the error message, fallback to exponential
            let delayMs = Math.pow(2, attempt + 1) * 1000 + Math.random() * 500;
            try {
              const parsed = JSON.parse(err.message);
              const retryDelayStr = parsed?.error?.details?.find((d: any) => d["@type"]?.includes("RetryInfo"))?.retryDelay;
              if (retryDelayStr) {
                const secs = parseInt(retryDelayStr.replace("s", ""), 10);
                if (!isNaN(secs)) delayMs = secs * 1000 + 500;
              }
            } catch { /* ignore parse errors */ }

            console.warn(`Gemini 429 rate limit hit. Retrying in ${Math.round(delayMs / 1000)}s (attempt ${attempt + 1}/${maxRetries})...`);
            res.write(`data: ${JSON.stringify({ type: "status", message: `Rate limit reached. Retrying in ${Math.round(delayMs / 1000)}s...` })}\n\n`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
          } else {
            throw err;
          }
        }
      }
    };

    // ReAct Loop
    let keepRunning = true;
    const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: systemInstruction,
    });
    
    while (keepRunning) {
      keepRunning = false;

      const result = await callWithRetry(() => model.generateContentStream({
        contents: geminiMessages,
        tools: toolsDefinition as any,
      }));

      let assistantContent = "";
      const toolCallsMap = new Map<number, any>();
      let tcIndex = 0;

      for await (const chunk of result.stream) {
        try {
          const text = chunk.text();
          if (text) {
            assistantContent += text;
            res.write(`data: ${JSON.stringify({ type: "text", content: text })}\n\n`);
          }
        } catch (e) {
          // ignore error if chunk does not contain text (e.g. function call only)
        }

        try {
          const calls = chunk.functionCalls();
          if (calls && calls.length > 0) {
            for (const fc of calls) {
              toolCallsMap.set(tcIndex, {
                id: `call_${tcIndex}`,
                type: "function",
                function: {
                  name: fc.name,
                  arguments: JSON.stringify(fc.args)
                }
              });
              tcIndex++;
            }
          }
        } catch (e) {
          // ignore function call error
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
        
        const assistantParts: any[] = [];
        if (assistantContent) assistantParts.push({ text: assistantContent });
        for (const tc of toolCalls) {
          assistantParts.push({
            functionCall: {
              name: tc.function.name,
              args: parseJSON(tc.function.arguments)
            }
          });
        }
        
        geminiMessages.push({
          role: "model",
          parts: assistantParts
        });

        // Execute all tools
        const toolResponseParts: any[] = [];

        for (const tc of toolCalls) {
          const args = parseJSON(tc.function.arguments);
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
            
            toolResponseParts.push({
              functionResponse: {
                name: tc.function.name,
                response: toolResult
              }
            });

            res.write(`data: ${JSON.stringify({ type: "tool_end", name: tc.function.name })}\n\n`);
          } catch (err: any) {
            console.error("Tool execution error:", err);
            const errObj = { error: err.message };
            const errStr = JSON.stringify(errObj);
            
            await db.collection("chatMessages").insertOne({
              tripId: new ObjectId(tripId as string),
              userId: new ObjectId(userId),
              role: "tool",
              content: errStr,
              tool_call_id: tc.id,
              name: tc.function.name,
              createdAt: new Date()
            });

            toolResponseParts.push({
              functionResponse: {
                name: tc.function.name,
                response: errObj
              }
            });
          }
        }
        
        geminiMessages.push({
          role: "user",
          parts: toolResponseParts
        });
        
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
  } catch (error: any) {
    console.error("Chat error:", error);
    const is429 = error?.status === 429 || error?.code === 429 ||
      (typeof error?.message === "string" && error.message.includes("429"));
    const friendlyMsg = is429
      ? "The AI is temporarily rate-limited (free tier quota exceeded). Please wait a moment and try again."
      : (error.message || "Internal server error");
    res.write(`data: ${JSON.stringify({ type: "error", error: friendlyMsg })}\n\n`);
    res.end();
  }
};
