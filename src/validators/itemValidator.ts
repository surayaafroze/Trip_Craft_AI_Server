import { z } from "zod";

export const createDestinationSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100),
  shortDescription: z.string().min(10, "Short description must be at least 10 characters").max(200),
  fullDescription: z.string().min(10, "Full description must be at least 10 characters").max(2000),
  images: z.array(z.string().url()).min(1, "At least one image is required"),
  region: z.enum(["Europe", "Asia", "North America", "South America", "Africa", "Oceania"]),
  category: z.enum(["Beach", "Mountain", "City", "Culture", "Adventure", "Relaxation"]),
  avgDailyCost: z.number().positive("Cost must be positive"),
});

export const createReviewSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().min(5, "Comment must be at least 5 characters").max(1000),
});
