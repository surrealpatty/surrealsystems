require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// ---------- Database ----------
const { sequelize, testConnection } = require('./config/database');

// ---------- Routes ----------
const userRoutes = require('./routes/user');
const serviceRoutes = require('./routes/service');

const app = express();
const PORT = process.env.PORT || 10000;

// ---------- Middleware ----------
app.use(cors());
app.use(express.json());

// ---------- API Routes ----------
app.use('/api/users', userRoutes);        // /api/users/register, /api/users/login, etc.
app.use('/api/services', serviceRoutes);  // /api/services/

// ---------- Serve Frontend ----------
app.use(express.static(path.join(__dirname, 'public')));

// Catch-all route for SPA frontend routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ---------- Start Server ----------
(async () => {
  try {
    await testConnection();   // Check DB connection
    await sequelize.sync();   // Sync models
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Server failed to start:', err);
    process.exit(1);
  }
})();
