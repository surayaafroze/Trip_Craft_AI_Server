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
        shortDescription: "Experience the ultimate Greek getaway in this beau...",
        fullDescription: "Experience the ultimate Greek getaway in this beautiful villa. Features a private pool, stunning sunset views, and easy access to local beaches. Perfect for romantic holidays or peaceful retreats.",
        images: ["https://i.ibb.co/1fjT8tBk/photo-1499856871958-5b9627545d1a-w-800-q-80.jpg", "https://i.ibb.co/TD8Q8RtG/photo-1548013146-72479768bada-w-800-q-80.jpg", "https://i.ibb.co/tTK7Y78R/photo-1523906834658-6e24ef2386f9-w-800-q-80.jpg"],
        region: "Asia",
        category: "Culture",
        avgDailyCost: 453,
        avgRating: 4.3,
        reviewCount: 106,
        createdAt: new Date(),
        updatedAt: new Date()
      },

      {
        ownerId: demoUserId.toString(),
        title: "Kyoto Heritage Stay",
        shortDescription: "Immerse yourself in Japanese culture at this authe...",
        fullDescription: "Immerse yourself in Japanese culture at this authentic ryokan. Includes kaiseki meals, tatami rooms, and close proximity to historic temples. Discover the spirit of old Japan.",
        images: ["https://i.ibb.co/jZTPKffC/photo-1513635269975-59663e0ac1ad-w-800-q-80.jpg", "https://i.ibb.co/Vcm6q5N4/photo-1506973035872-a4ec16b8e8d9-w-800-q-80.jpg", "https://i.ibb.co/d4SK9hKn/photo-1540959733332-eab4deabeeaf-w-800-q-80.jpg"],
        region: "Africa",
        category: "Mountain",
        avgDailyCost: 435,
        avgRating: 4.1,
        reviewCount: 56,
        createdAt: new Date(),
        updatedAt: new Date()
      },

      {
        ownerId: demoUserId.toString(),
        title: "Rocky Mountain Cabin",
        shortDescription: "Escape to the mountains! This cozy cabin offers im...",
        fullDescription: "Escape to the mountains! This cozy cabin offers immediate access to hiking trails, skiing, and breathtaking alpine scenery. A true nature lover's paradise.",
        images: ["https://i.ibb.co/dJ05n6nn/photo-1501594907352-04cda38ebc29-w-800-q-80.jpg", "https://i.ibb.co/Vcm6q5N4/photo-1506973035872-a4ec16b8e8d9-w-800-q-80.jpg", "https://i.ibb.co/TD8Q8RtG/photo-1548013146-72479768bada-w-800-q-80.jpg", "https://i.ibb.co/jZTPKffC/photo-1513635269975-59663e0ac1ad-w-800-q-80.jpg", "https://i.ibb.co/1fjT8tBk/photo-1499856871958-5b9627545d1a-w-800-q-80.jpg"],
        region: "Oceania",
        category: "Beach",
        avgDailyCost: 127,
        avgRating: 4.3,
        reviewCount: 36,
        createdAt: new Date(),
        updatedAt: new Date()
      },

      {
        ownerId: demoUserId.toString(),
        title: "Parisian Elegance Apartment",
        shortDescription: "Stay in the heart of Paris with views of the Eiffe...",
        fullDescription: "Stay in the heart of Paris with views of the Eiffel Tower. Walk to charming cafes, world-class museums, and beautiful parks. Classic French design throughout.",
        images: ["https://i.ibb.co/Vcm6q5N4/photo-1506973035872-a4ec16b8e8d9-w-800-q-80.jpg", "https://i.ibb.co/jZTPKffC/photo-1513635269975-59663e0ac1ad-w-800-q-80.jpg", "https://i.ibb.co/TD8Q8RtG/photo-1548013146-72479768bada-w-800-q-80.jpg", "https://i.ibb.co/1fjT8tBk/photo-1499856871958-5b9627545d1a-w-800-q-80.jpg"],
        region: "Oceania",
        category: "Adventure",
        avgDailyCost: 305,
        avgRating: 4.9,
        reviewCount: 87,
        createdAt: new Date(),
        updatedAt: new Date()
      },

      {
        ownerId: demoUserId.toString(),
        title: "Bali Tropical Resort",
        shortDescription: "A luxurious beachfront resort in Bali. Enjoy spa t...",
        fullDescription: "A luxurious beachfront resort in Bali. Enjoy spa treatments, surfing, yoga classes, and exquisite local cuisine in a lush tropical setting.",
        images: ["https://i.ibb.co/dJ05n6nn/photo-1501594907352-04cda38ebc29-w-800-q-80.jpg", "https://i.ibb.co/3YWpQxnN/photo-1473625247510-8ceb1760943f-w-800-q-80.jpg", "https://i.ibb.co/jZTPKffC/photo-1513635269975-59663e0ac1ad-w-800-q-80.jpg", "https://i.ibb.co/tTK7Y78R/photo-1523906834658-6e24ef2386f9-w-800-q-80.jpg"],
        region: "Africa",
        category: "Beach",
        avgDailyCost: 428,
        avgRating: 4.7,
        reviewCount: 128,
        createdAt: new Date(),
        updatedAt: new Date()
      },

      {
        ownerId: demoUserId.toString(),
        title: "Rome Historic Villa",
        shortDescription: "Step back in time in this beautifully restored Rom...",
        fullDescription: "Step back in time in this beautifully restored Roman villa. Close to the Colosseum, with a private courtyard and authentic Italian charm.",
        images: ["https://i.ibb.co/Vcm6q5N4/photo-1506973035872-a4ec16b8e8d9-w-800-q-80.jpg", "https://i.ibb.co/3YWpQxnN/photo-1473625247510-8ceb1760943f-w-800-q-80.jpg", "https://i.ibb.co/TD8Q8RtG/photo-1548013146-72479768bada-w-800-q-80.jpg", "https://i.ibb.co/jZTPKffC/photo-1513635269975-59663e0ac1ad-w-800-q-80.jpg", "https://i.ibb.co/1fjT8tBk/photo-1499856871958-5b9627545d1a-w-800-q-80.jpg"],
        region: "Oceania",
        category: "Relaxation",
        avgDailyCost: 316,
        avgRating: 4.5,
        reviewCount: 86,
        createdAt: new Date(),
        updatedAt: new Date()
      },

      {
        ownerId: demoUserId.toString(),
        title: "Swiss Alps Chalet",
        shortDescription: "A premium ski chalet in the Swiss Alps. Features a...",
        fullDescription: "A premium ski chalet in the Swiss Alps. Features a roaring fireplace, outdoor hot tub, and ski-in/ski-out access to some of the best slopes in Europe.",
        images: ["https://i.ibb.co/tTK7Y78R/photo-1523906834658-6e24ef2386f9-w-800-q-80.jpg", "https://i.ibb.co/jZTPKffC/photo-1513635269975-59663e0ac1ad-w-800-q-80.jpg", "https://i.ibb.co/3YWpQxnN/photo-1473625247510-8ceb1760943f-w-800-q-80.jpg", "https://i.ibb.co/1fjT8tBk/photo-1499856871958-5b9627545d1a-w-800-q-80.jpg"],
        region: "Oceania",
        category: "Mountain",
        avgDailyCost: 337,
        avgRating: 4.8,
        reviewCount: 90,
        createdAt: new Date(),
        updatedAt: new Date()
      },

      {
        ownerId: demoUserId.toString(),
        title: "New York Penthouse",
        shortDescription: "Experience the city that never sleeps from a luxur...",
        fullDescription: "Experience the city that never sleeps from a luxurious penthouse overlooking Central Park. Modern amenities, floor-to-ceiling windows, and unbeatable location.",
        images: ["https://i.ibb.co/1fjT8tBk/photo-1499856871958-5b9627545d1a-w-800-q-80.jpg", "https://i.ibb.co/TD8Q8RtG/photo-1548013146-72479768bada-w-800-q-80.jpg", "https://i.ibb.co/d4SK9hKn/photo-1540959733332-eab4deabeeaf-w-800-q-80.jpg", "https://i.ibb.co/LdcSmnPQ/photo-1512100356356-de1b84283e18-w-800-q-80.jpg"],
        region: "Europe",
        category: "City",
        avgDailyCost: 464,
        avgRating: 4.2,
        reviewCount: 137,
        createdAt: new Date(),
        updatedAt: new Date()
      },

      {
        ownerId: demoUserId.toString(),
        title: "Maldives Overwater Bungalow",
        shortDescription: "Sleep above crystal clear waters in this stunning ...",
        fullDescription: "Sleep above crystal clear waters in this stunning overwater bungalow. Glass floors, direct ocean access, and unmatched privacy for the perfect getaway.",
        images: ["https://i.ibb.co/TD8Q8RtG/photo-1548013146-72479768bada-w-800-q-80.jpg", "https://i.ibb.co/3YWpQxnN/photo-1473625247510-8ceb1760943f-w-800-q-80.jpg", "https://i.ibb.co/dJ05n6nn/photo-1501594907352-04cda38ebc29-w-800-q-80.jpg", "https://i.ibb.co/d4SK9hKn/photo-1540959733332-eab4deabeeaf-w-800-q-80.jpg"],
        region: "Asia",
        category: "Culture",
        avgDailyCost: 490,
        avgRating: 4.2,
        reviewCount: 57,
        createdAt: new Date(),
        updatedAt: new Date()
      },

      {
        ownerId: demoUserId.toString(),
        title: "Costa Rica Eco Lodge",
        shortDescription: "Immerse yourself in the rainforest in this sustain...",
        fullDescription: "Immerse yourself in the rainforest in this sustainable eco-lodge. See exotic wildlife, hike to waterfalls, and enjoy farm-to-table dining.",
        images: ["https://i.ibb.co/Vcm6q5N4/photo-1506973035872-a4ec16b8e8d9-w-800-q-80.jpg", "https://i.ibb.co/d4SK9hKn/photo-1540959733332-eab4deabeeaf-w-800-q-80.jpg", "https://i.ibb.co/1fjT8tBk/photo-1499856871958-5b9627545d1a-w-800-q-80.jpg"],
        region: "Africa",
        category: "Beach",
        avgDailyCost: 445,
        avgRating: 4.6,
        reviewCount: 17,
        createdAt: new Date(),
        updatedAt: new Date()
      },

      {
        ownerId: demoUserId.toString(),
        title: "Dubai Luxury Suite",
        shortDescription: "Experience ultimate luxury in Dubai. This suite of...",
        fullDescription: "Experience ultimate luxury in Dubai. This suite offers panoramic city views, 24/7 butler service, and access to an exclusive infinity pool.",
        images: ["https://i.ibb.co/1fjT8tBk/photo-1499856871958-5b9627545d1a-w-800-q-80.jpg", "https://i.ibb.co/Vcm6q5N4/photo-1506973035872-a4ec16b8e8d9-w-800-q-80.jpg", "https://i.ibb.co/LdcSmnPQ/photo-1512100356356-de1b84283e18-w-800-q-80.jpg"],
        region: "Europe",
        category: "Adventure",
        avgDailyCost: 410,
        avgRating: 4.4,
        reviewCount: 144,
        createdAt: new Date(),
        updatedAt: new Date()
      },

      {
        ownerId: demoUserId.toString(),
        title: "Cape Town Coastal Retreat",
        shortDescription: "A stunning modern home overlooking the ocean in Ca...",
        fullDescription: "A stunning modern home overlooking the ocean in Cape Town. Close to Table Mountain and beautiful beaches. Ideal for exploring South Africa's diverse landscapes.",
        images: ["https://i.ibb.co/1fjT8tBk/photo-1499856871958-5b9627545d1a-w-800-q-80.jpg", "https://i.ibb.co/LdcSmnPQ/photo-1512100356356-de1b84283e18-w-800-q-80.jpg", "https://i.ibb.co/dJ05n6nn/photo-1501594907352-04cda38ebc29-w-800-q-80.jpg"],
        region: "North America",
        category: "Relaxation",
        avgDailyCost: 370,
        avgRating: 4.7,
        reviewCount: 112,
        createdAt: new Date(),
        updatedAt: new Date()
      },

      {
        ownerId: demoUserId.toString(),
        title: "Sydney Harbour Apartment",
        shortDescription: "Wake up to views of the Sydney Opera House. This m...",
        fullDescription: "Wake up to views of the Sydney Opera House. This modern apartment is steps away from Circular Quay, offering the best of Australian city life.",
        images: ["https://i.ibb.co/d4SK9hKn/photo-1540959733332-eab4deabeeaf-w-800-q-80.jpg", "https://i.ibb.co/dJ05n6nn/photo-1501594907352-04cda38ebc29-w-800-q-80.jpg", "https://i.ibb.co/jZTPKffC/photo-1513635269975-59663e0ac1ad-w-800-q-80.jpg", "https://i.ibb.co/3YWpQxnN/photo-1473625247510-8ceb1760943f-w-800-q-80.jpg"],
        region: "Europe",
        category: "Relaxation",
        avgDailyCost: 281,
        avgRating: 4.2,
        reviewCount: 126,
        createdAt: new Date(),
        updatedAt: new Date()
      },

      {
        ownerId: demoUserId.toString(),
        title: "Machu Picchu Basecamp",
        shortDescription: "The perfect starting point for your Inca Trail adv...",
        fullDescription: "The perfect starting point for your Inca Trail adventure. A comfortable lodge with local Andean design, oxygen-enriched rooms, and expert guides.",
        images: ["https://i.ibb.co/TD8Q8RtG/photo-1548013146-72479768bada-w-800-q-80.jpg", "https://i.ibb.co/1fjT8tBk/photo-1499856871958-5b9627545d1a-w-800-q-80.jpg", "https://i.ibb.co/3YWpQxnN/photo-1473625247510-8ceb1760943f-w-800-q-80.jpg", "https://i.ibb.co/jZTPKffC/photo-1513635269975-59663e0ac1ad-w-800-q-80.jpg"],
        region: "Europe",
        category: "Adventure",
        avgDailyCost: 167,
        avgRating: 4.8,
        reviewCount: 131,
        createdAt: new Date(),
        updatedAt: new Date()
      },

      {
        ownerId: demoUserId.toString(),
        title: "Rio de Janeiro Beachfront",
        shortDescription: "Stay right on Copacabana beach. Experience the vib...",
        fullDescription: "Stay right on Copacabana beach. Experience the vibrant culture of Rio, with easy access to Sugarloaf Mountain and Christ the Redeemer.",
        images: ["https://i.ibb.co/3YWpQxnN/photo-1473625247510-8ceb1760943f-w-800-q-80.jpg", "https://i.ibb.co/dJ05n6nn/photo-1501594907352-04cda38ebc29-w-800-q-80.jpg", "https://i.ibb.co/jZTPKffC/photo-1513635269975-59663e0ac1ad-w-800-q-80.jpg", "https://i.ibb.co/tTK7Y78R/photo-1523906834658-6e24ef2386f9-w-800-q-80.jpg"],
        region: "Africa",
        category: "City",
        avgDailyCost: 172,
        avgRating: 4.7,
        reviewCount: 43,
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
