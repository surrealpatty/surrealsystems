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
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);

  // Test DB connection
  await testConnection();

  // Sync models
  try {
    await sequelize.sync();
    console.log('✅ Database synchronized successfully.');
  } catch (err) {
    console.error('❌ Database sync failed:', err.message);
  }
});
