import { ObjectId } from "mongodb";

export interface ItineraryItem {
  time: string;
  activity: string;
  cost: number;
}

export interface ItineraryDay {
  day: number;
  activities: ItineraryItem[];
}

export interface Trip {
  _id?: ObjectId;
  userId: ObjectId;
  title: string;
  region: string;
  budgetTarget: number;
  estimatedTotalCost: number;
  itinerary: ItineraryDay[];
  createdAt: Date;
  updatedAt: Date;
}
