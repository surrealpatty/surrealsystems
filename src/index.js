const express = require('express');
const cors = require('cors');
const { sequelize, testConnection } = require('./config/database');
const userRoutes = require('./routes/user');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

// ---------------- Middleware ----------------
app.use(cors());
app.use(express.json());

// ---------------- Routes ----------------
app.use('/api/users', userRoutes);

// ---------------- Start server ----------------
const startServer = async () => {
  try {
    // First, test DB connection
    await testConnection();

    // Sync models (optional: { force: true } only for dev)
    await sequelize.sync();
    console.log('✅ Database synchronized successfully.');

    // Only start server AFTER DB is ready
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1); // stop process if DB connection fails
  }
};

startServer();
