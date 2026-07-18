import express from "express";
import cors from "cors";
import { auth } from "./utils/auth";
import { toNodeHandler } from "better-auth/node";

const app = express();

app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true
}));

app.use(express.json());

app.all("/api/auth/*", toNodeHandler(auth));

export default app;
