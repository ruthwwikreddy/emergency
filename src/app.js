const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load env
dotenv.config();

// Create app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Ensure DB connection on each cold start (cached inside connect())
const { connect } = require('./config/db');
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
app.use('/api/cards', require('./routes/cards'));

module.exports = app;
