const mongoose = require('mongoose');

let cached = global.__mongooseConn;
if (!cached) {
  cached = global.__mongooseConn = { conn: null, promise: null };
}

const connect = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI not set. Please configure environment variables in Vercel dashboard.');
  }

  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(uri, {
        dbName: process.env.MONGO_DB || undefined,
        serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
        socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
        bufferCommands: false, // Disable mongoose buffering for serverless
        maxPoolSize: 10, // Maintain up to 10 socket connections
        minPoolSize: 5, // Maintain a minimum of 5 socket connections
        retryWrites: true,
        retryReads: true,
      })
      .then((mongooseInstance) => {
        console.log('MongoDB connected successfully');
        return mongooseInstance;
      })
      .catch((err) => {
        console.error('MongoDB connection error:', err.message);
        cached.promise = null;
        throw err;
      });
  }
  cached.conn = await cached.promise;
  return cached.conn;
};

module.exports = { connect };
