import dotenv from "dotenv";
dotenv.config({ override: true });

// Validate required environment variables before starting
const requiredEnvVars = [
    "MONGODB_URI",
    "CLIENT_URL",
    "JWT_SECRET",
    "GEMINI_API_KEY"
];

const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0) {
    console.error("❌ ERROR: Missing required environment variables. Server cannot start.");
    console.error(`Missing variables: ${missingEnvVars.join(", ")}`);
    console.error("Please add them to your backend .env file.");
    process.exit(1);
}

import app from "./app";
import { connectDB } from "./config/db";

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    await connectDB();
    const key = process.env.GEMINI_API_KEY;
    console.log(`Server starting with GEMINI_API_KEY: ${key ? key.substring(0, 10) + "..." : "undefined"}`);
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
};

startServer();

