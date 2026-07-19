import { env } from "./config/env";
import app from "./app";
import { connectDB } from "./config/db";

const startServer = async () => {
    await connectDB();
    console.log(`Server starting with GEMINI_API_KEY: ${env.GEMINI_API_KEY.substring(0, 10)}...`);
    app.listen(env.PORT, () => {
        console.log(`Server running on port ${env.PORT}`);
    });
};

startServer();

