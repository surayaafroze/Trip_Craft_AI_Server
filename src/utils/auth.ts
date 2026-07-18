import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { getDB } from "../config/db";
import dotenv from "dotenv";

dotenv.config();

export const auth = betterAuth({
    database: mongodbAdapter(getDB()),
    emailAndPassword: {
        enabled: true
    },
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        }
    },
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.CLIENT_URL || "http://localhost:3000",
});
