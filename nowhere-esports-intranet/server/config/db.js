const mongoose = require('mongoose');
const config = require('./config');

const MAX_RETRIES = 10;
let retries = 0;

const connectDB = async () => {
    while (retries < MAX_RETRIES) {
        try {
            await mongoose.connect(config.mongodbUri, {
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
            });
            console.log(`✅  MongoDB connected: ${mongoose.connection.host}`);

            mongoose.connection.on('disconnected', () => {
                console.warn('⚠️  MongoDB disconnected. Attempting reconnect...');
                setTimeout(connectDB, 3000);
            });

            return;
        } catch (err) {
            retries++;
            console.error(`❌  MongoDB connection failed (attempt ${retries}/${MAX_RETRIES}): ${err.message}`);
            if (retries >= MAX_RETRIES) throw err;
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }
};

module.exports = connectDB;
