import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { auth } from "./utils/auth";
import { toNodeHandler } from "better-auth/node";

import itemRoutes from "./routes/itemRoutes";

const app = express();

app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Better Auth API Route
app.all("/api/auth/*", toNodeHandler(auth));

// Application Routes
app.use("/api/items", itemRoutes);

export default app;
