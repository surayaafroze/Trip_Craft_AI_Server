import { Request, Response } from "express";
import { getAIRecommendations } from "../services/recommendationService";

export const getRecommendations = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { budget, category, region, prompt } = req.query;

    const preferences = {
      budget: budget ? Number(budget) : undefined,
      category: category as string,
      region: region as string,
      prompt: prompt as string,
    };

    const recommendations = await getAIRecommendations(user.userId || user.id, preferences);
    
    res.status(200).json({ success: true, data: recommendations });
  } catch (error) {
    console.error("Recommendation controller error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
