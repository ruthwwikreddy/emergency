const express = require('express');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');

// Load env
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Static assets
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// DB Connect
const { connect } = require('./src/config/db');
const start = async () => {
  try {
    await connect();
    // API Routes
    app.use('/api/cards', require('./src/routes/cards'));

    // Frontend routes
    // Serve index for root
    app.get('/', (req, res) => {
      res.sendFile(path.join(publicDir, 'index.html'));
    });

    // Dynamic card page at /:id -> serves card.html (client fetches data)
    app.get('/:id', (req, res, next) => {
      // Avoid conflicting with API
      if (req.params.id === 'api') return next();
      res.sendFile(path.join(publicDir, 'card.html'));
    });

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Emergency Card app running on port ${PORT}`));
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
};

start();
