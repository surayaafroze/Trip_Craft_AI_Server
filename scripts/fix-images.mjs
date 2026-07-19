import fs from 'fs';
import path from 'path';
import { MongoClient } from 'mongodb';

const IMGBB_API_KEY = "2aba9a2d9e2c6697a33aeda64dc26122";
const MONGODB_URI = "mongodb://Trip_Craft_AI:K9M3VPTsPNX8usPP@ac-kun0nzl-shard-00-00.7ye0vp5.mongodb.net:27017,ac-kun0nzl-shard-00-01.7ye0vp5.mongodb.net:27017,ac-kun0nzl-shard-00-02.7ye0vp5.mongodb.net:27017/?ssl=true&replicaSet=atlas-qqycj9-shard-0&authSource=admin&appName=Cluster0";

async function uploadToImgbb(imageUrl) {
  const formData = new URLSearchParams();
  formData.append("key", IMGBB_API_KEY);
  formData.append("image", imageUrl);

  const res = await fetch("https://api.imgbb.com/1/upload", {
    method: "POST",
    body: formData,
  });
  const data = await res.json();
  if (data.success) {
    return data.data.url;
  } else {
    throw new Error(data.error.message);
  }
}

async function run() {
  try {
    console.log("Uploading images to ImgBB...");
    const url1 = await uploadToImgbb("https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80");
    const url2 = await uploadToImgbb("https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=800&q=80");
    const url3 = await uploadToImgbb("https://images.unsplash.com/photo-1518684079-3c830dcef090?w=800&q=80");

    console.log("ImgBB URLs:", url1, url2, url3);

    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db("Trip_Craft_AI");
    const dests = await db.collection("destinations").find({}).toArray();

    if (dests.length >= 3) {
      await db.collection("destinations").updateOne({ _id: dests[0]._id }, { $set: { images: [url1, url1, url1, url1, url1] } });
      await db.collection("destinations").updateOne({ _id: dests[1]._id }, { $set: { images: [url2, url2, url2, url2, url2] } });
      await db.collection("destinations").updateOne({ _id: dests[2]._id }, { $set: { images: [url3, url3, url3, url3, url3] } });
      console.log("Updated DB with valid ImgBB URLs.");
    }
    
    // Also update the seed script
    const seedPath = path.join("d:\\new course\\TripCraft\\trip_craft_ai_server", "scripts", "seed.ts");
    let seedContent = fs.readFileSync(seedPath, "utf-8");
    seedContent = seedContent.replace(/const imageUrls: string\[\] = \[[\s\S]*?\];/, `const imageUrls: string[] = [\n      "${url1}",\n      "${url2}",\n      "${url3}"\n    ];`);
    fs.writeFileSync(seedPath, seedContent);
    console.log("Updated seed.ts");

    await client.close();
  } catch (err) {
    console.error(err);
  }
}

run();
