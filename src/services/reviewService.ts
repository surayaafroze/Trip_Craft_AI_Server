import { ObjectId } from "mongodb";
import { getDB } from "../config/db";
import { ReviewDocument, DestinationDocument } from "../types";

export const reviewService = {
  async addReview(data: Omit<ReviewDocument, "createdAt">): Promise<ReviewDocument> {
    const db = getDB();
    const reviews = db.collection<ReviewDocument>("reviews");
    const destinations = db.collection<DestinationDocument>("destinations");
    
    const newReview: ReviewDocument = {
      ...data,
      createdAt: new Date()
    };
    
    const result = await reviews.insertOne(newReview);
    newReview._id = result.insertedId;
    
    // Update destination average rating
    const allReviews = await reviews.find({ destinationId: data.destinationId }).toArray();
    const sum = allReviews.reduce((acc, curr) => acc + curr.rating, 0);
    const avg = sum / allReviews.length;
    
    await destinations.updateOne(
      { _id: data.destinationId },
      { $set: { averageRating: parseFloat(avg.toFixed(1)) } }
    );
    
    return newReview;
  },

  async getReviewsByDestination(destinationId: string) {
    const db = getDB();
    const reviews = db.collection<ReviewDocument>("reviews");
    return reviews.find({ destinationId: new ObjectId(destinationId) }).sort({ createdAt: -1 }).toArray();
  }
};
