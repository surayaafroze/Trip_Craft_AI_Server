import { Request, Response } from "express";
import { reviewService } from "../services/reviewService";
import { createReviewSchema } from "../validators/itemValidator";
import { z } from "zod";
import { ObjectId } from "mongodb";

export const reviewController = {
  async getReviews(req: Request, res: Response) {
    try {
      const reviews = await reviewService.getReviewsByDestination(req.params.id as string);
      res.json(reviews);
    } catch (error) {
      console.error("Get reviews error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  async createReview(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const validatedData = createReviewSchema.parse(req.body);
      
      const newReview = await reviewService.addReview({
        ...validatedData,
        destinationId: new ObjectId(req.params.id as string),
        userId: user.id,
        userName: user.name || user.email.split('@')[0]
      });
      
      res.status(201).json(newReview);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: (error as any).errors });
      }
      console.error("Create review error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
};
