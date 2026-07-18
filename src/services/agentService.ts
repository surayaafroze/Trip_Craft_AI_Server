import { getDB } from "../config/db";
import { ObjectId } from "mongodb";
import { Trip, ItineraryDay } from "../types/trip";

// Tool 1: Search Destinations
export const searchDestinations = async (args: { region?: string; category?: string }) => {
  const db = getDB();
  const query: any = {};
  if (args.region) query.region = { $regex: new RegExp(args.region, "i") };
  if (args.category) query.category = { $regex: new RegExp(args.category, "i") };
  
  const items = await db.collection("items").find(query).limit(5).toArray();
  return items.map(item => ({
    id: item._id,
    title: item.title,
    region: item.region,
    category: item.category,
    estimatedCostPerDay: item.estimatedCostPerDay,
    averageRating: item.averageRating,
  }));
};

// Tool 2: Get Trip By Id
export const getTripById = async (args: { tripId: string }) => {
  const db = getDB();
  const trip = await db.collection<Trip>("trips").findOne({ _id: new ObjectId(args.tripId) });
  if (!trip) throw new Error("Trip not found");
  return trip;
};

// Tool 3: Update Itinerary Day
export const updateItineraryDay = async (args: { tripId: string; dayNumber: number; activities: { time: string; activity: string; cost: number }[] }) => {
  const db = getDB();
  const trip = await db.collection<Trip>("trips").findOne({ _id: new ObjectId(args.tripId) });
  if (!trip) throw new Error("Trip not found");

  let itinerary = trip.itinerary || [];
  
  // Find if day exists
  const dayIndex = itinerary.findIndex(d => d.day === args.dayNumber);
  
  if (dayIndex >= 0) {
    itinerary[dayIndex].activities = args.activities;
  } else {
    itinerary.push({ day: args.dayNumber, activities: args.activities });
  }

  // Sort by day number
  itinerary.sort((a, b) => a.day - b.day);

  await db.collection("trips").updateOne(
    { _id: new ObjectId(args.tripId) },
    { $set: { itinerary, updatedAt: new Date() } }
  );

  return { success: true, message: `Day ${args.dayNumber} updated successfully`, currentItinerary: itinerary };
};

// Tool 4: Estimate Trip Budget
export const estimateTripBudget = async (args: { tripId: string }) => {
  const db = getDB();
  const trip = await db.collection<Trip>("trips").findOne({ _id: new ObjectId(args.tripId) });
  if (!trip) throw new Error("Trip not found");

  const itinerary = trip.itinerary || [];
  let totalCost = 0;

  for (const day of itinerary) {
    for (const act of day.activities) {
      totalCost += Number(act.cost) || 0;
    }
  }

  await db.collection("trips").updateOne(
    { _id: new ObjectId(args.tripId) },
    { $set: { estimatedTotalCost: totalCost, updatedAt: new Date() } }
  );

  return { 
    success: true, 
    estimatedTotalCost: totalCost, 
    budgetTarget: trip.budgetTarget,
    status: totalCost <= trip.budgetTarget ? "Under Budget" : "Over Budget"
  };
};

export const toolsDefinition = [
  {
    type: "function" as const,
    function: {
      name: "searchDestinations",
      description: "Search the database for travel destinations by region or category. Use this to find places for the user.",
      parameters: {
        type: "object",
        properties: {
          region: { type: "string", description: "e.g., 'Europe', 'Asia'" },
          category: { type: "string", description: "e.g., 'Adventure', 'Relaxation'" }
        }
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "getTripById",
      description: "Get current details and itinerary of the user's trip.",
      parameters: {
        type: "object",
        properties: {
          tripId: { type: "string", description: "The ID of the trip" }
        },
        required: ["tripId"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "updateItineraryDay",
      description: "Update the activities for a specific day in the itinerary.",
      parameters: {
        type: "object",
        properties: {
          tripId: { type: "string" },
          dayNumber: { type: "number", description: "The day number (e.g., 1 for Day 1)" },
          activities: {
            type: "array",
            items: {
              type: "object",
              properties: {
                time: { type: "string", description: "e.g., '09:00 AM'" },
                activity: { type: "string", description: "Description of the activity" },
                cost: { type: "number", description: "Estimated cost in USD" }
              },
              required: ["time", "activity", "cost"]
            }
          }
        },
        required: ["tripId", "dayNumber", "activities"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "estimateTripBudget",
      description: "Calculate and save the estimated total cost of the trip based on the current itinerary.",
      parameters: {
        type: "object",
        properties: {
          tripId: { type: "string" }
        },
        required: ["tripId"]
      }
    }
  }
];

export const executeTool = async (name: string, args: any) => {
  switch (name) {
    case "searchDestinations":
      return await searchDestinations(args);
    case "getTripById":
      return await getTripById(args);
    case "updateItineraryDay":
      return await updateItineraryDay(args);
    case "estimateTripBudget":
      return await estimateTripBudget(args);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
};
