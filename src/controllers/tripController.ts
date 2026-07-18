import { Request, Response } from "express";
import { getDB } from "../config/db";
import { ObjectId } from "mongodb";
import { Trip } from "../types/trip";

export const getTrips = async (req: Request, res: Response) => {
  try {
    const db = getDB();
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const trips = await db.collection<Trip>("trips")
      .find({ userId: new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .toArray();

    res.json(trips);
  } catch (error) {
    console.error("Error fetching trips:", error);
    res.status(500).json({ error: "Failed to fetch trips" });
  }
};

export const getTripById = async (req: Request, res: Response) => {
  try {
    const db = getDB();
    const { id } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!ObjectId.isValid(id as string)) {
      return res.status(400).json({ error: "Invalid trip ID" });
    }

    const trip = await db.collection<Trip>("trips").findOne({
      _id: new ObjectId(id as string),
      userId: new ObjectId(userId)
    });

    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }

    res.json(trip);
  } catch (error) {
    console.error("Error fetching trip:", error);
    res.status(500).json({ error: "Failed to fetch trip" });
  }
};

export const createTrip = async (req: Request, res: Response) => {
  try {
    const db = getDB();
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { title, region, budgetTarget } = req.body;

    if (!title || !region || !budgetTarget) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newTrip: Trip = {
      userId: new ObjectId(userId),
      title,
      region,
      budgetTarget: Number(budgetTarget),
      estimatedTotalCost: 0,
      itinerary: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection<Trip>("trips").insertOne(newTrip);
    
    res.status(201).json({ 
      ...newTrip,
      _id: result.insertedId 
    });
  } catch (error) {
    console.error("Error creating trip:", error);
    res.status(500).json({ error: "Failed to create trip" });
  }
};

export const deleteTrip = async (req: Request, res: Response) => {
  try {
    const db = getDB();
    const { id } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!ObjectId.isValid(id as string)) {
      return res.status(400).json({ error: "Invalid trip ID" });
    }

    const result = await db.collection("trips").deleteOne({
      _id: new ObjectId(id as string),
      userId: new ObjectId(userId)
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Trip not found or unauthorized" });
    }

    // Delete associated chat messages
    await db.collection("chatMessages").deleteMany({
      tripId: new ObjectId(id as string)
    });

    res.json({ message: "Trip deleted successfully" });
  } catch (error) {
    console.error("Error deleting trip:", error);
    res.status(500).json({ error: "Failed to delete trip" });
  }
};
