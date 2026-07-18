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
  } catch (error) {
    console.error("Failed to connect to MongoDB", error);
    process.exit(1);
  }
};

export const getDB = (): Db => {
  if (!db) {
    throw new Error("Database not initialized. Call connectDB first.");
  }
  return db;
};
