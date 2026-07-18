import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "default_secret";

export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Unauthorized: Missing or invalid token" });
      return;
    }

    const token = authHeader.split(" ")[1];
    
    if (!token) {
      res.status(401).json({ error: "Unauthorized: Token missing" });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Attach user to request for downstream handlers
    (req as any).user = decoded;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
};
