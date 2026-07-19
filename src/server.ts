import { env } from "./config/env";
import app from "./app";
import { connectDB } from "./config/db";

const startServer = async () => {
    await connectDB();
    console.log("ANTHROPIC_API_KEY Configured:", !!env.ANTHROPIC_API_KEY);
    app.listen(env.PORT, () => {
        console.log(`Server running on port ${env.PORT}`);
    });
};

startServer();
