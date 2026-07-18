import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import itemRoutes from "./routes/itemRoutes";
import tripRoutes from "./routes/tripRoutes";
import agentRoutes from "./routes/agentRoutes";

const app = express();

app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

import { toNodeHandler } from "better-auth/node";
import { auth } from "./utils/auth";
import authRoutes from "./routes/authRoutes";
import contactRoutes from "./routes/contactRoutes";
import recommendationRoutes from "./routes/recommendationRoutes";

// Application Routes
app.use("/api/items", itemRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/agent", agentRoutes);
app.use("/api/auth", authRoutes); // Custom manual JWT auth routes
app.use("/api/contact", contactRoutes);
app.use("/api/recommendations", recommendationRoutes);

// Mount Better Auth handler
app.all("/api/auth/*path", toNodeHandler(auth));

export default app;
