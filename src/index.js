// src/index.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const { sequelize, testConnection } = require('./config/database');
const serviceRoutes = require('./routes/service');
require('dotenv').config();

const app = express();

// ----------------- Middleware -----------------
app.use(cors());
app.use(express.json());

// ----------------- Serve frontend -----------------
// Make sure your `public` folder is at the root, alongside `src`
app.use(express.static(path.join(__dirname, '..', 'public')));

// Root route → serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ----------------- API routes -----------------
app.use('/services', serviceRoutes);

// Optional: Catch-all for frontend routes (register.html, profile.html, etc.)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ----------------- Database connection -----------------
(async () => {
  try {
    await testConnection(); // Tests DB connection
    // Sync models
    // { alter: true } updates tables safely, { force: true } clears tables
    await sequelize.sync({ alter: true });
    console.log('✅ Database synced successfully.');
  } catch (err) {
    console.error('❌ Database sync failed:', err);
  }
})();

// ----------------- Start server -----------------
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
