import { z } from "zod";

export const createDestinationSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100),
  description: z.string().min(10, "Description must be at least 10 characters").max(2000),
  images: z.array(z.string().url()).min(1, "At least one image is required"),
  region: z.enum(["Europe", "Asia", "North America", "South America", "Africa", "Oceania"]),
  category: z.enum(["Beach", "Mountain", "City", "Culture", "Adventure", "Relaxation"]),
  estimatedCostPerDay: z.number().positive("Cost must be positive"),
  bestTimeToVisit: z.string().min(2, "Best time to visit is required").max(100),
});

export const createReviewSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().min(5, "Comment must be at least 5 characters").max(1000),
});
