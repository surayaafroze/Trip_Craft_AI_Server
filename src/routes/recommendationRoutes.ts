import { Router } from "express";
import { getRecommendations } from "../controllers/recommendationController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/", requireAuth, getRecommendations);

export default router;
