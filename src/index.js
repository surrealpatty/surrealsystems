const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { sequelize, testConnection } = require('./config/database');
const userRoutes = require('./routes/user');
const serviceRoutes = require('./routes/service');

const app = express();

// ----------------- Middleware -----------------
app.use(cors());
app.use(express.json());

// ----------------- Serve static frontend -----------------
app.use(express.static(path.join(__dirname, '../public')));

// ----------------- API routes -----------------
app.use('/api/users', userRoutes);
app.use('/api/services', serviceRoutes);

// ----------------- Start server -----------------
const startServer = async () => {
  try {
    await testConnection();

    // ✅ Ensure database table has all columns
    await sequelize.sync({ alter: true });

    const PORT = process.env.PORT || 10000;
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  } catch (err) {
    console.error('❌ Server failed to start:', err.message);
    process.exit(1);
  }
};

startServer();
