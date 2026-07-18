import { ObjectId } from "mongodb";

export interface DestinationDocument {
    _id?: ObjectId;
    title: string;
    description: string;
    images: string[];
    region: "Europe" | "Asia" | "North America" | "South America" | "Africa" | "Oceania";
    category: "Beach" | "Mountain" | "City" | "Culture" | "Adventure" | "Relaxation";
    estimatedCostPerDay: number;
    bestTimeToVisit: string;
    averageRating: number;
    userId: string; // The user who created this destination
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
