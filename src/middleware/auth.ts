import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { auth } from "../utils/auth";
import { fromNodeHeaders } from "better-auth/node";

const JWT_SECRET = process.env.JWT_SECRET || "default_secret";

export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    // First, try standard JWT Bearer token
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      if (token) {
        try {
          const decoded: any = jwt.verify(token, JWT_SECRET);
          decoded.id = decoded.id || decoded.userId;
          decoded.userId = decoded.userId || decoded.id;
          (req as any).user = decoded;
          return next();
        } catch (err) {
          // Token invalid, fall through to better-auth check
        }
      }
    }

    // Second, try Better Auth Session via cookies
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (session && session.user) {
      (req as any).user = {
        id: session.user.id,
        userId: session.user.id,
        email: session.user.email,
        name: session.user.name
      };
      return next();
    }

    // If both fail, unauthorized
    res.status(401).json({ error: "Unauthorized: Missing or invalid token/session" });
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(401).json({ error: "Unauthorized: Server error during auth" });
  }
};
