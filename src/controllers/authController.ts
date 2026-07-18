import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { getDB } from "../config/db";

const JWT_SECRET = process.env.JWT_SECRET || "default_secret";

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ error: "Name, email, and password are required" });
      return;
    }

    const db = getDB();
    const existingUser = await db.collection("users").findOne({ email });
    if (existingUser) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      name,
      email,
      password: hashedPassword,
      createdAt: new Date(),
    };

    const result = await db.collection("users").insertOne(newUser);
    const token = jwt.sign({ userId: result.insertedId.toString(), email, name }, JWT_SECRET, { expiresIn: "7d" });

    res.status(201).json({ message: "User registered successfully", token, user: { id: result.insertedId, name, email } });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const db = getDB();
    const user = await db.collection("users").findOne({ email });
    if (!user || !user.password) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const token = jwt.sign({ userId: user._id.toString(), email: user.email, name: user.name }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ message: "Login successful", token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  // Client should discard the token
  res.json({ message: "Logout successful" });
};

export const me = async (req: Request, res: Response): Promise<void> => {
  // User is attached by auth middleware
  const user = (req as any).user;
  res.json({ user });
};
