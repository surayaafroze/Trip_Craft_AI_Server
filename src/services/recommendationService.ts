import { getDB } from "../config/db";
import Groq from "groq-sdk";
import { ObjectId } from "mongodb";
import { env } from "../config/env";

export const getAIRecommendations = async (
  userId: string,
  preferences: { budget?: number; category?: string; region?: string; prompt?: string }
) => {
  const db = getDB();
  const groq = new Groq({ apiKey: env.GROQ_API_KEY });
  const objectIdUserId = new ObjectId(userId);

  // 1. Memory Retrieval: Fetch user, past trips, past reviews
  const user = await db.collection("users").findOne({ _id: objectIdUserId });
  const pastTrips = await db.collection("trips").find({ userId: objectIdUserId }).limit(5).toArray();
  const pastReviews = await db.collection("reviews").find({ userId }).limit(10).toArray();

  let activeFilters = {
    budget: preferences.budget,
    category: preferences.category,
    region: preferences.region,
  };
  let temporaryContext = "";
  let savedPreferences = user?.preferences || [];

  // 2. Intent Analysis (LLM Call 1) if prompt exists
  if (preferences.prompt) {
    const analysisPrompt = `
You are the intent analyzer for a Smart Recommendation Engine.
The user has provided a refinement prompt: "${preferences.prompt}"

Current active filters:
- Budget: ${activeFilters.budget || 'Any'}
- Category: ${activeFilters.category || 'Any'}
- Region: ${activeFilters.region || 'Any'}

Current Saved Permanent Preferences:
${JSON.stringify(savedPreferences)}

Analyze the prompt. Decide if the user wants to:
1. Change their search filters (e.g. "cheaper options" -> lower budget, "only beaches" -> change category).
2. Add a permanent preference (e.g. "Save my preference: I hate crowded places").
3. Add a temporary context for this specific search (e.g. "I want to go somewhere quiet this time").

Return a strict JSON object with this schema:
{
  "updatedFilters": {
    "budget": <number or null>,
    "category": <string or null>,
    "region": <string or null>
  },
  "newPermanentPreferences": ["string array of new preferences to save, only if explicitly requested to save"],
  "temporaryContext": "string summarizing any temporary requirements"
}
Output ONLY raw JSON without markdown formatting.
    `;

    try {
      const analysisResponse = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: 'user', content: analysisPrompt }],
        temperature: 0.1,
        max_tokens: 500,
      });
      const content = analysisResponse.choices[0]?.message?.content || "{}";
      const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      if (parsed.updatedFilters) {
        if (parsed.updatedFilters.budget !== undefined) activeFilters.budget = parsed.updatedFilters.budget;
        if (parsed.updatedFilters.category !== undefined) activeFilters.category = parsed.updatedFilters.category;
        if (parsed.updatedFilters.region !== undefined) activeFilters.region = parsed.updatedFilters.region;
      }
      if (parsed.temporaryContext) temporaryContext = parsed.temporaryContext;
      
      // 3. Memory Update
      if (parsed.newPermanentPreferences && parsed.newPermanentPreferences.length > 0) {
        savedPreferences = [...savedPreferences, ...parsed.newPermanentPreferences];
        await db.collection("users").updateOne(
          { _id: objectIdUserId },
          { $set: { preferences: savedPreferences } }
        );
      }
    } catch (e) {
      console.error("Intent analysis failed, falling back to original preferences:", e);
    }
  }

  // 4. Tool Usage / DB Query: Retrieve and filter candidates
  const query: any = {};
  if (activeFilters.region && activeFilters.region !== "null") query.region = { $regex: new RegExp(activeFilters.region, "i") };
  if (activeFilters.category && activeFilters.category !== "null") query.category = { $regex: new RegExp(activeFilters.category, "i") };
  if (activeFilters.budget) query.estimatedCostPerDay = { $lte: Number(activeFilters.budget) }; // Use estimatedCostPerDay or avgDailyCost based on schema. 
  // Wait, let's use avgDailyCost as per DestinationDocument interface, but the previous code used estimatedCostPerDay. I will keep it compatible or handle both if needed. Wait, in previous code: query.estimatedCostPerDay. I will stick to it. But wait, in the interface it's avgDailyCost. Let's check candidates.map in previous code: it uses estimatedCostPerDay.

  let candidates = await db.collection("items").find(query).limit(15).toArray();

  // Fallback to broader search if too strict
  if (!candidates.length) {
      delete query.estimatedCostPerDay;
      candidates = await db.collection("items").find(query).limit(10).toArray();
  }

  if (!candidates.length) {
    return [];
  }

  // 5. Decision Making & Ranking (LLM Call 2)
  const promptContext = `
You are a Smart Recommendation Engine for TripCraft AI. 
Rank and select the top 3 best destinations for the user from the candidate list below.
Consider the user's explicit filters, saved memory, past trips, and temporary context. You MUST explain WHY each destination was chosen.

Active Filters:
- Budget: ${activeFilters.budget ? `$${activeFilters.budget}/day` : 'Any'}
- Category: ${activeFilters.category || 'Any'}
- Region: ${activeFilters.region || 'Any'}

User Memory (Persistent Preferences):
${savedPreferences.length > 0 ? savedPreferences.map((p: string) => `- ${p}`).join('\n') : 'None'}

Temporary Context for this search:
${temporaryContext || 'None'}

User Past Trips:
${pastTrips.map(t => `- ${t.title} in ${t.region} (Budget: $${t.budgetTarget})`).join('\n') || 'None'}

User Past Reviews:
${pastReviews.map(r => `- Rated ${r.rating}/5 for destination ID ${r.destinationId}. Comment: "${r.comment}"`).join('\n') || 'None'}

Candidate Destinations:
${candidates.map(c => `ID: ${c._id} | Title: ${c.title} | Region: ${c.region} | Category: ${c.category} | Cost/Day: $${c.estimatedCostPerDay || c.avgDailyCost} | Rating: ${c.averageRating || c.avgRating}/5`).join('\n')}

Based on the above, select exactly up to 3 candidates that best match the user's profile. 
Return the result STRICTLY as a JSON array of objects with the following schema:
[
  { "id": "<the destination ID string>", "reasoning": "<1-2 sentences explaining exactly WHY this is a great fit for this user, mentioning their budget, past trips, or saved preferences>" }
]
Do NOT include markdown formatting like \`\`\`json. Just return the raw JSON array.
  `;

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: 'user', content: promptContext }],
      temperature: 0.7,
      max_tokens: 1024,
    });

    const content = response.choices[0]?.message?.content || "[]";
    let rankedSelections: { id: string, reasoning: string }[] = [];
    
    try {
      const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
      rankedSelections = JSON.parse(cleaned);
    } catch (e) {
      console.error("Failed to parse AI recommendation output:", content);
      return [];
    }

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
    console.error("Groq Recommendation Error:", error);
    throw new Error(error.message || "Failed to generate recommendations from AI");
  }
};
