const app = require('./dist/app').default;
const { connectDB } = require('./dist/config/db');

let isDbConnected = false;

app.use(async (req, res, next) => {
    if (!isDbConnected) {
        await connectDB().catch(console.error);
        isDbConnected = true;
    }
    next();
});

module.exports = app;
