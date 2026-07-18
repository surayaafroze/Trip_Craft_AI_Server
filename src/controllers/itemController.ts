import { Request, Response } from "express";
import { itemService } from "../services/itemService";
import { createDestinationSchema } from "../validators/itemValidator";
import { z } from "zod";

export const itemController = {
  async getItems(req: Request, res: Response) {
    try {
      const result = await itemService.getDestinations(req.query);
      res.json(result);
    } catch (error) {
      console.error("Get items error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  async getItemById(req: Request, res: Response) {
    try {
      const item = await itemService.getDestinationById(req.params.id as string);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("Get item error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  async getRelatedItems(req: Request, res: Response) {
    try {
      const items = await itemService.getRelatedDestinations(req.params.id as string);
      res.json(items);
    } catch (error) {
      console.error("Get related items error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  async getMyItems(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const items = await itemService.getMyDestinations(userId);
      res.json(items);
    } catch (error) {
      console.error("Get my items error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  async createItem(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const validatedData = createDestinationSchema.parse(req.body);
      
      const newItem = await itemService.createDestination({
        ...validatedData,
        ownerId: userId
      });
      
      res.status(201).json(newItem);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: (error as any).errors });
      }
      console.error("Create item error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  async deleteItem(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const success = await itemService.deleteDestination(req.params.id as string, userId);
      
      if (!success) {
        return res.status(404).json({ error: "Item not found" });
      }
      
      res.json({ success: true, message: "Item deleted successfully" });
    } catch (error: any) {
      if (error.message === "Unauthorized to delete this item") {
        return res.status(403).json({ error: error.message });
      }
      console.error("Delete item error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
};
