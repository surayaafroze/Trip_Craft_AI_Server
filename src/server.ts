import { env } from "./config/env";
import app from "./app";
import { connectDB } from "./config/db";

const startServer = async () => {
    await connectDB();
    console.log("GROQ_API_KEY Configured:", !!env.GROQ_API_KEY);
    app.listen(env.PORT, () => {
        console.log(`Server running on port ${env.PORT}`);
    });
};

startServer();
