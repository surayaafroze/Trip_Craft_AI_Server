import { ObjectId } from "mongodb";

export interface ChatMessage {
  _id?: ObjectId;
  tripId: ObjectId;
  userId: ObjectId;
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: any[]; // for storing function call arrays from OpenAI
  createdAt: Date;
}
