const mongoose = require("mongoose");

/**
 * Serverless-safe Mongo connection cache.
 * On Vercel, cold starts leave readyState=2 (connecting) while requests arrive —
 * every handler must await connectDB() instead of fire-and-forget.
 */
const globalCache = global.__answerosMongo || { conn: null, promise: null };
global.__answerosMongo = globalCache;

async function connectDB() {
  if (globalCache.conn && mongoose.connection.readyState === 1) {
    return globalCache.conn;
  }

  // Already connected via a previous module load / warm instance
  if (mongoose.connection.readyState === 1) {
    globalCache.conn = mongoose.connection;
    return globalCache.conn;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    const err = new Error("MONGODB_URI not configured in environment variables.");
    console.error(err.message);
    throw err;
  }

  if (!globalCache.promise) {
    console.log(
      `MongoDB connecting… (readyState=${mongoose.connection.readyState})`
    );
    globalCache.promise = mongoose
      .connect(uri, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 10000,
      })
      .then((conn) => {
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        return conn;
      })
      .catch((error) => {
        // Allow a later request to retry
        globalCache.promise = null;
        console.error("MongoDB connection error:", error.message);
        throw error;
      });
  }

  globalCache.conn = await globalCache.promise;
  return globalCache.conn;
}

function isMongoReady() {
  return mongoose.connection.readyState === 1;
}

module.exports = { connectDB, isMongoReady };
