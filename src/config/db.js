const mongoose = require('mongoose');

const connect = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI not set. Create a .env file with MONGO_URI and restart the server.');
  }
  return mongoose
    .connect(uri, { dbName: process.env.MONGO_DB || undefined })
    .then(() => {
      console.log('MongoDB connected');
    })
    .catch((err) => {
      console.error('MongoDB connection error:', err.message);
      throw err;
    });
};

module.exports = { connect };
