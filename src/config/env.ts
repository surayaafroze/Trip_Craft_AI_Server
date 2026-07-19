import dotenv from "dotenv";

// Load environment variables before doing any validation
dotenv.config({ override: true });

const getEnv = (key: string): string => {
    const value = process.env[key];
    if (!value) {
        console.error(`❌ ERROR: Missing required environment variable: ${key}`);
        process.exit(1);
    }
    return value;
};

// Validate and export environment variables exactly once during startup
export const env = {
    MONGODB_URI: getEnv("MONGODB_URI"),
    CLIENT_URL: getEnv("CLIENT_URL"),
    JWT_SECRET: getEnv("JWT_SECRET"),
    ANTHROPIC_API_KEY: getEnv("ANTHROPIC_API_KEY"),
    PORT: process.env.PORT || "5000",
};
