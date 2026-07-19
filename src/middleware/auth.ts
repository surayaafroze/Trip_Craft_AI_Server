import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET as string;

export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      if (token) {
        const decoded: any = jwt.verify(token, JWT_SECRET);
        decoded.id = decoded.id || decoded.userId;
        decoded.userId = decoded.userId || decoded.id;
        (req as any).user = decoded;
        return next();
      }
    }

    res.status(401).json({ error: "Unauthorized: Missing or invalid token" });
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(401).json({ error: "Unauthorized: Invalid token or server error" });
  }
};
