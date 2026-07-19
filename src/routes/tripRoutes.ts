import express from "express";
import { requireAuth } from "../middleware/auth";
import {
  getTrips,
  getTripById,
  createTrip,
  deleteTrip,
  addActivityToTrip
} from "../controllers/tripController";

const router = express.Router();

// Apply auth middleware to all trip routes
router.use(requireAuth);

router.get("/", getTrips);
router.get("/:id", getTripById);
router.post("/", createTrip);
router.post("/:id/itinerary", addActivityToTrip);
router.delete("/:id", deleteTrip);

export default router;
