import { MongoClient, Db } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.MONGO_DB_URI || "";
if (!uri) {
  console.error("MONGO_DB_URI is not defined in environment variables");
  process.exit(1);
}

const client = new MongoClient(uri);

let db: Db;

export const connectDB = async () => {
  try {
    await client.connect();
    db = client.db("Trip_Craft_AI");
    console.log("Connected to MongoDB");
    await setupIndexes(db);
  } catch (error) {
    console.error("Failed to connect to MongoDB", error);
    process.exit(1);
  }
};

const setupIndexes = async (database: Db) => {
  try {
    const destinations = database.collection("destinations");
    await destinations.createIndex({ title: "text", description: "text" });
    await destinations.createIndex({ region: 1 });
    await destinations.createIndex({ category: 1 });
    await destinations.createIndex({ estimatedCostPerDay: 1 });
    await destinations.createIndex({ userId: 1 });

    const reviews = database.collection("reviews");
    await reviews.createIndex({ destinationId: 1 });
    
    console.log("Database indexes verified/created.");
  } catch (err) {
    console.error("Error setting up indexes:", err);
  }
};

export const getDB = (): Db => {
  if (!db) {
    throw new Error("Database not initialized. Call connectDB first.");
  }
  return db;
};
