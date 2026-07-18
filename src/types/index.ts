import { ObjectId } from "mongodb";

export interface DestinationDocument {
    _id?: ObjectId;
    ownerId: string; // The user who created this destination
    title: string;
    shortDescription: string;
    fullDescription: string;
    images: string[];
    region: "Europe" | "Asia" | "North America" | "South America" | "Africa" | "Oceania";
    category: "Beach" | "Mountain" | "City" | "Culture" | "Adventure" | "Relaxation";
    avgDailyCost: number;
    avgRating: number;
    reviewCount: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface ReviewDocument {
    _id?: ObjectId;
    destinationId: ObjectId;
    userId: string;
    userName: string; // denormalized for easy display
    rating: number; // 1-5
    comment: string;
    createdAt: Date;
}
