import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env";

import itemRoutes from "./routes/itemRoutes";
import tripRoutes from "./routes/tripRoutes";
import agentRoutes from "./routes/agentRoutes";

const app = express();

app.use(cors({
    origin: env.CLIENT_URL,
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

import authRoutes from "./routes/authRoutes";
import contactRoutes from "./routes/contactRoutes";
import recommendationRoutes from "./routes/recommendationRoutes";

// Application Routes
app.get("/", (req, res) => {
    res.json({ message: "Welcome to TripCraft AI Server", status: "success" });
});

app.use("/api/items", itemRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/agent", agentRoutes);
app.use("/api/auth", authRoutes); // Custom manual JWT auth routes
app.use("/api/contact", contactRoutes);
app.use("/api/recommendations", recommendationRoutes);

// Better Auth removed

export default app;
