import { Router } from "express";
import { itemController } from "../controllers/itemController";
import { reviewController } from "../controllers/reviewController";
import { requireAuth } from "../middleware/auth";

const router = Router();

// Items (Destinations)
router.get("/", itemController.getItems);
router.get("/mine", requireAuth, itemController.getMyItems);
router.get("/:id", itemController.getItemById);
router.get("/:id/related", itemController.getRelatedItems);
router.post("/", requireAuth, itemController.createItem);
router.delete("/:id", requireAuth, itemController.deleteItem);

// Reviews
router.get("/:id/reviews", reviewController.getReviews);
router.post("/:id/reviews", requireAuth, reviewController.createReview);

export default router;
