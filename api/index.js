const serverless = require('serverless-http');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database connection middleware
const { connect } = require('../src/config/db');
app.use(async (req, res, next) => {
  try {
    await connect();
    next();
  } catch (err) {
    console.error('DB connect error:', err.message);
    res.status(500).json({ message: 'Database connection failed' });
  }
});

// API Routes
app.use('/cards', require('../src/routes/cards'));

// Health check endpoint for debugging
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mongo_uri: process.env.MONGO_URI ? 'SET' : 'NOT SET',
    mongo_db: process.env.MONGO_DB || 'NOT SET'
  });
});

// Debug: Log environment variables (remove in production)
console.log('MONGO_URI:', process.env.MONGO_URI ? 'SET' : 'NOT SET');
console.log('MONGO_DB:', process.env.MONGO_DB || 'NOT SET');
console.log('Environment check completed');

module.exports = serverless(app);
