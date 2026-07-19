import { getDB } from "../config/db";
import Anthropic from "@anthropic-ai/sdk";
import { ObjectId } from "mongodb";
import { env } from "../config/env";

export const getAIRecommendations = async (
  userId: string,
  preferences: { budget?: number; category?: string; region?: string; prompt?: string }
) => {
  const db = getDB();

  // Fetch past trips for context
  const pastTrips = await db.collection("trips").find({ userId: new ObjectId(userId) }).limit(5).toArray();
  const pastReviews = await db.collection("reviews").find({ userId }).limit(10).toArray();

  // Fetch candidate destinations based on basic criteria
  const query: any = {};
  if (preferences.region) query.region = { $regex: new RegExp(preferences.region, "i") };
  if (preferences.category) query.category = { $regex: new RegExp(preferences.category, "i") };
  if (preferences.budget) query.estimatedCostPerDay = { $lte: preferences.budget };

  // If no specific criteria, we pull a larger diverse set to let AI pick
  const candidates = await db.collection("items").find(query).limit(15).toArray();

  if (!candidates.length) {
    return [];
  }

  // Construct prompt for AI
  const promptContext = `
You are a Smart Recommendation Engine for TripCraft AI. 
Rank and select the top 3 best destinations for the user from the candidate list below.
Consider the user's explicit preferences, past trips, and past reviews to infer what they might like.

User Explicit Preferences:
- Budget: ${preferences.budget ? `$${preferences.budget}/day` : 'Any'}
- Category: ${preferences.category || 'Any'}
- Region: ${preferences.region || 'Any'}
- Extra notes: ${preferences.prompt || 'None'}

User Past Trips:
${pastTrips.map(t => `- ${t.title} in ${t.region} (Budget: $${t.budgetTarget})`).join('\n') || 'None'}

User Past Reviews:
${pastReviews.map(r => `- Rated ${r.rating}/5 for destination ID ${r.destinationId}. Comment: "${r.comment}"`).join('\n') || 'None'}

Candidate Destinations:
${candidates.map(c => `ID: ${c._id} | Title: ${c.title} | Region: ${c.region} | Category: ${c.category} | Cost/Day: $${c.estimatedCostPerDay} | Rating: ${c.averageRating}/5`).join('\n')}

Based on the above, select exactly up to 3 candidates.
Return the result STRICTLY as a JSON array of objects with the following schema:
[
  { "id": "<the destination ID string>", "reasoning": "<1-2 sentences explaining why this is a great fit for this specific user>" }
]
Do NOT include markdown formatting like \`\`\`json. Just return the raw JSON array.
  `;

  try {
    const anthropic = new Anthropic({
      apiKey: env.ANTHROPIC_API_KEY,
    });
    
    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1000,
      temperature: 0.7,
      messages: [
        { role: 'user', content: promptContext }
      ]
    });

    const content = response.content[0].type === "text" ? response.content[0].text : "[]";
    let rankedSelections: { id: string, reasoning: string }[] = [];
    
    try {
      // Clean up potential markdown formatting if model didn't listen
      const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
      rankedSelections = JSON.parse(cleaned);
    } catch (e) {
      console.error("Failed to parse AI recommendation output:", content);
      return [];
    }

    // Map back to full destination objects
    const recommendations = rankedSelections.map(selection => {
      const dest = candidates.find(c => c._id.toString() === selection.id);
      if (dest) {
        return {
          ...dest,
          reasoning: selection.reasoning
        };
      }
      return null;
    }).filter(Boolean);

    return recommendations;
  } catch (error: any) {
    console.error("Claude Recommendation Error:", error);
    throw new Error(error.message || "Failed to generate recommendations from AI");
  }
};
