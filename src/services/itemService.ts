import { ObjectId } from "mongodb";
import { getDB } from "../config/db";
import { DestinationDocument } from "../types";

export const itemService = {
  async createDestination(data: Omit<DestinationDocument, "createdAt" | "updatedAt" | "avgRating" | "reviewCount">): Promise<DestinationDocument> {
    const db = getDB();
    const destinations = db.collection<DestinationDocument>("destinations");
    
    const newDoc: DestinationDocument = {
      ...data,
      avgRating: 0,
      reviewCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await destinations.insertOne(newDoc);
    newDoc._id = result.insertedId;
    return newDoc;
  },

  async getDestinations(query: any = {}) {
    const db = getDB();
    const destinations = db.collection<DestinationDocument>("destinations");
    
    // Pagination
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 12;
    const skip = (page - 1) * limit;
    
    // Filtering
    const filter: any = {};
    if (query.search) {
      filter.$or = [
        { title: { $regex: query.search, $options: "i" } },
        { shortDescription: { $regex: query.search, $options: "i" } },
        { region: { $regex: query.search, $options: "i" } }
      ];
    }
    if (query.region) {
      filter.region = query.region;
    }
    if (query.minPrice || query.maxPrice) {
      filter.avgDailyCost = {};
      if (query.minPrice) filter.avgDailyCost.$gte = parseInt(query.minPrice);
      if (query.maxPrice) filter.avgDailyCost.$lte = parseInt(query.maxPrice);
    }
    
    // Sorting
    let sort: any = { createdAt: -1 };
    if (query.sort === "price_asc") sort = { avgDailyCost: 1 };
    if (query.sort === "price_desc") sort = { avgDailyCost: -1 };
    if (query.sort === "rating") sort = { avgRating: -1 };
    
    const items = await destinations.find(filter).sort(sort).skip(skip).limit(limit).toArray();
    const total = await destinations.countDocuments(filter);
    
    return {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  },

  async getDestinationById(id: string) {
    const db = getDB();
    const destinations = db.collection<DestinationDocument>("destinations");
    return destinations.findOne({ _id: new ObjectId(id) });
  },

  async getRelatedDestinations(id: string) {
    const db = getDB();
    const destinations = db.collection<DestinationDocument>("destinations");
    const current = await this.getDestinationById(id);
    if (!current) return [];
    
    // Related by region or category, excluding current
    return destinations.find({
      _id: { $ne: new ObjectId(id) },
      $or: [
        { region: current.region },
        { category: current.category }
      ]
    }).limit(4).toArray();
  },

  async getMyDestinations(ownerId: string) {
    const db = getDB();
    const destinations = db.collection<DestinationDocument>("destinations");
    return destinations.find({ ownerId }).sort({ createdAt: -1 }).toArray();
  },

  async deleteDestination(id: string, ownerId: string) {
    const db = getDB();
    const destinations = db.collection<DestinationDocument>("destinations");
    const reviews = db.collection("reviews");
    
    // Verify ownership
    const item = await destinations.findOne({ _id: new ObjectId(id) });
    if (!item) return false;
    if (item.ownerId !== ownerId) throw new Error("Unauthorized to delete this item");
    
    await destinations.deleteOne({ _id: new ObjectId(id) });
    // Also delete associated reviews
    await reviews.deleteMany({ destinationId: new ObjectId(id) });
    return true;
  }
};
