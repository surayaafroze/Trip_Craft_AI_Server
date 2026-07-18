import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("Missing MONGODB_URI");
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    const db = client.db("Trip_Craft_AI");

    console.log("Connected to DB");

    await db.collection("destinations").deleteMany({});
    await db.collection("reviews").deleteMany({});
    await db.collection("users").deleteMany({});
    await db.collection("trips").deleteMany({});
    await db.collection("chatMessages").deleteMany({});
    
    console.log("Cleared existing data.");

    const demoUserId = new ObjectId();
    const demoUser = {
      _id: demoUserId,
      name: "Demo User",
      email: "demo@example.com",
      passwordHash: "demo123",
      authProvider: "local",
      googleId: null,
      avatarUrl: "https://i.ibb.co/6H8m9qQ/demo-avatar.png",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.collection("users").insertOne(demoUser);
    console.log("Created Demo User:", demoUser.email);

    console.log("Using static ImgBB URLs...");
    
    // I am using valid ImgBB URLs from prior sessions/hardcoded ones that will render properly on frontend
    const imageUrls: string[] = [
      "https://i.ibb.co/tPZdk8gv/photo-1469854523086-cc02fe5d8800-w-800-q-80.jpg",
      "https://i.ibb.co/7sn4SFJ/photo-1493246507139-91e8fad9978e-w-800-q-80.jpg",
      "https://i.ibb.co/yzbxhp2/photo-1518684079-3c830dcef090-w-800-q-80.jpg"
    ];

    const destinations = [
      {
        ownerId: demoUserId.toString(),
        title: "Santorini Sunset Villas",
        shortDescription: "A beautiful villa overlooking the caldera.",
        fullDescription: "Experience the ultimate Greek getaway in this beautiful villa. Features a private pool, stunning sunset views, and easy access to local beaches.",
        images: [imageUrls[0]],
        region: "Europe",
        category: "Relaxation",
        avgDailyCost: 250,
        avgRating: 5.0,
        reviewCount: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        ownerId: demoUserId.toString(),
        title: "Kyoto Heritage Stay",
        shortDescription: "Traditional ryokan experience in ancient Kyoto.",
        fullDescription: "Immerse yourself in Japanese culture at this authentic ryokan. Includes kaiseki meals, tatami rooms, and close proximity to historic temples.",
        images: [imageUrls[1]],
        region: "Asia",
        category: "Culture",
        avgDailyCost: 180,
        avgRating: 4.8,
        reviewCount: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        ownerId: demoUserId.toString(),
        title: "Rocky Mountain Cabin",
        shortDescription: "Secluded cabin for outdoor enthusiasts.",
        fullDescription: "Escape to the mountains! This cozy cabin offers immediate access to hiking trails, skiing, and breathtaking alpine scenery.",
        images: [imageUrls[2]],
        region: "North America",
        category: "Mountain",
        avgDailyCost: 120,
        avgRating: 0,
        reviewCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const destResult = await db.collection("destinations").insertMany(destinations as any);
    console.log(`Inserted ${destResult.insertedCount} destinations.`);

    const review = {
      destinationId: destResult.insertedIds[0],
      userId: demoUserId.toString(),
      userName: "Demo User",
      rating: 5,
      comment: "Absolutely breathtaking views! Worth every penny.",
      createdAt: new Date()
    };
    
    const review2 = {
      destinationId: destResult.insertedIds[1],
      userId: demoUserId.toString(),
      userName: "Demo User",
      rating: 4.8,
      comment: "Very authentic and peaceful experience.",
      createdAt: new Date()
    };

    await db.collection("reviews").insertMany([review, review2] as any);
    console.log("Inserted reviews.");

    const tripId = new ObjectId();
    const trip = {
      _id: tripId,
      userId: demoUserId,
      title: "Euro Trip 2026",
      region: "Europe",
      budgetTarget: 5000,
      itinerary: [],
      estimatedTotalCost: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    await db.collection("trips").insertOne(trip);

    const chatMsg = {
      tripId: tripId,
      userId: demoUserId,
      role: "assistant",
      content: "Hello! I am your AI travel assistant. How can I help you plan your Euro Trip 2026?",
      toolName: null,
      toolArgs: null,
      createdAt: new Date()
    };
    await db.collection("chatMessages").insertOne(chatMsg);
    
    console.log("Inserted demo Trip and ChatMessages.");
    console.log("SEED COMPLETE!");

  } catch (error) {
    console.error("Seed error:", error);
  } finally {
    await client.close();
  }
}

run();
