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

// Application Routes
app.use("/api/items", itemRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/agent", agentRoutes);

export default app;
