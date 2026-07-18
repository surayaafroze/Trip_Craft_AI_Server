import express from "express";
import { requireAuth } from "../middleware/auth";
import { chat, getChatHistory } from "../controllers/agentController";

const router = express.Router();

router.use(requireAuth);

router.post("/chat", chat);
router.get("/chat/:tripId/history", getChatHistory);

export default router;
