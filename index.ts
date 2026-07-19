import app from './src/app';
import { connectDB } from './src/config/db';

let isDbConnected = false;

app.use(async (req, res, next) => {
    if (!isDbConnected) {
        await connectDB().catch(console.error);
        isDbConnected = true;
    }
    next();
});

export default app;
