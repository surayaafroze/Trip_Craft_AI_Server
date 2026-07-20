import { getDB } from "../config/db";
import { ObjectId } from "mongodb";
import { Trip, ItineraryDay } from "../types/trip";

// Tool 1: Search Destinations
export const searchDestinations = async (args: { region?: string; category?: string }) => {
  console.log("Calling tool: searchDestinations", args);
  try {
    const db = getDB();
    const query: any = {};
    if (args.region) query.region = { $regex: new RegExp(args.region, "i") };
    if (args.category) query.category = { $regex: new RegExp(args.category, "i") };
    
    const items = await db.collection("items").find(query).limit(5).toArray();
    console.log("Tool succeeded: searchDestinations");
    return items.map(item => ({
      id: item._id,
      title: item.title,
      region: item.region,
      category: item.category,
      estimatedCostPerDay: item.estimatedCostPerDay,
      averageRating: item.averageRating,
    }));
  } catch (err: any) {
    console.error("Error in searchDestinations:");
    console.error(err.stack || err);
    throw err;
  }
};

// Tool 2: Get Trip By Id
export const getTripById = async (args: { tripId: string }) => {
  console.log("Calling tool: getTripById", args);
  try {
    const db = getDB();
    const trip = await db.collection<Trip>("trips").findOne({ _id: new ObjectId(args.tripId) });
    if (!trip) throw new Error("Trip not found");
    console.log("Tool succeeded: getTripById");
    return trip;
  } catch (err: any) {
    console.error("Error in getTripById:");
    console.error(err.stack || err);
    throw err;
  }
};

// Tool 2.5: Update Trip Details
export const updateTripDetails = async (args: { tripId: string; title?: string; region?: string; budgetTarget?: number }) => {
  console.log("Calling tool: updateTripDetails", args);
  try {
    const db = getDB();
    const updateFields: any = { updatedAt: new Date() };
    if (args.title) updateFields.title = args.title;
    if (args.region) updateFields.region = args.region;
    if (args.budgetTarget) updateFields.budgetTarget = args.budgetTarget;

    const result = await db.collection("trips").findOneAndUpdate(
      { _id: new ObjectId(args.tripId) },
      { $set: updateFields },
      { returnDocument: "after" }
    );

    if (!result) throw new Error("Trip not found or could not be updated");
    
    console.log("Tool succeeded: updateTripDetails");
    return {
      success: true,
      message: "Trip details updated successfully",
      updatedTrip: {
        title: result.title,
        region: result.region,
        budgetTarget: result.budgetTarget
      }
    };
  } catch (err: any) {
    console.error("Error in updateTripDetails:");
    console.error(err.stack || err);
    throw err;
  }
};

// Tool 3: Update Itinerary Day
export const updateItineraryDay = async (args: { tripId: string; dayNumber: number; activities: { time: string; activity: string; cost: number }[] }) => {
  console.log("Calling tool: updateItineraryDay", args);
  try {
    if (!args.tripId || args.tripId === "current" || args.tripId === "null" || args.tripId === "undefined" || args.tripId === "") {
      throw new Error(`Invalid tripId passed to updateItineraryDay: ${args.tripId}`);
    }

    const db = getDB();
    
    // Find the trip first to ensure it exists
    const tripIdObj = new ObjectId(args.tripId);
    const trip = await db.collection("trips").findOne({ _id: tripIdObj });
    if (!trip) throw new Error("Trip not found");

    const existingItinerary = trip.itinerary || [];
    const dayIndex = existingItinerary.findIndex((d: any) => d.day === args.dayNumber);

    let newItinerary = [...existingItinerary];
    if (dayIndex >= 0) {
      newItinerary[dayIndex].activities = args.activities;
    } else {
      newItinerary.push({ day: args.dayNumber, activities: args.activities });
      newItinerary.sort((a: any, b: any) => a.day - b.day);
    }

    const result = await db.collection("trips").updateOne(
      { _id: tripIdObj },
      { 
        $set: { 
          itinerary: newItinerary,
          updatedAt: new Date()
        } 
      }
    );

    console.log("[updateItineraryDay] UpdateResult:", { matchedCount: result.matchedCount, modifiedCount: result.modifiedCount, acknowledged: result.acknowledged });

    console.log("Tool succeeded: updateItineraryDay");
    return {
      success: true,
      message: `Day ${args.dayNumber} itinerary updated successfully`,
      dayNumber: args.dayNumber,
      activitiesCount: args.activities.length
    };
  } catch (err: any) {
    console.error("Error in updateItineraryDay:");
    console.error(err.stack || err);
    throw err;
  }
};

// Tool 4: Estimate Trip Budget
export const estimateTripBudget = async (args: { tripId: string }) => {
  console.log("Calling tool: estimateTripBudget", args);
  try {
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

    console.log("Tool succeeded: estimateTripBudget");
    return { 
      success: true, 
      estimatedTotalCost: totalCost, 
      budgetTarget: trip.budgetTarget,
      status: totalCost <= trip.budgetTarget ? "Under Budget" : "Over Budget"
    };
  } catch (err: any) {
    console.error("Error in estimateTripBudget:");
    console.error(err.stack || err);
    throw err;
  }
};

export const toolsDefinition = [
  {
    type: "function",
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
    type: "function",
    function: {
      name: "getTripById",
      description: "Get current details and itinerary of the user's trip.",
      parameters: {
        type: "object",
        properties: {
          tripId: { type: "string", description: "Automatically injected by the system. Just pass 'current'." }
        },
        required: ["tripId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "updateTripDetails",
      description: "Update the title, region/destination, and target budget of the current trip.",
      parameters: {
        type: "object",
        properties: {
          tripId: { type: "string", description: "Automatically injected by the system. Just pass 'current'." },
          title: { type: "string", description: "The new title of the trip (e.g. '3 Days in Paris')" },
          region: { type: "string", description: "The destination region or city (e.g. 'Paris', 'Cox\\'s Bazar')" },
          budgetTarget: { type: "number", description: "The user's maximum budget in USD" }
        },
        required: ["tripId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "updateItineraryDay",
      description: "Update the activities for a specific day in the itinerary.",
      parameters: {
        type: "object",
        properties: {
          tripId: { type: "string", description: "Automatically injected by the system. Just pass 'current'." },
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
    type: "function",
    function: {
      name: "estimateTripBudget",
      description: "Calculate and save the estimated total cost of the trip based on the current itinerary.",
      parameters: {
        type: "object",
        properties: {
          tripId: { type: "string", description: "Automatically injected by the system. Just pass 'current'." }
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
    case "updateTripDetails":
      return await updateTripDetails(args);
    case "updateItineraryDay":
      return await updateItineraryDay(args);
    case "estimateTripBudget":
      return await estimateTripBudget(args);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
};
