require('dotenv').config();
const express = require('express');
const { sequelize, testConnection } = require('./config/database');
const userRoutes = require('./routes/user');
const serviceRoutes = require('./routes/service');

const app = express();

// Middleware to parse JSON
app.use(express.json());

// Home route
app.get('/', (req, res) => {
  res.send('🚀 CodeCrowds API is running!');
});

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/services', serviceRoutes);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Test database connection
    await testConnection();

    // Sync models (creates tables if they don't exist)
    await sequelize.sync();

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Server failed to start:', err);
  }
};

// Start the server
startServer();
