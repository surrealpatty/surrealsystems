const express = require('express');
const cors = require('cors');
const path = require('path');
const { sequelize, testConnection } = require('./config/database');
const serviceRoutes = require('./routes/service');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '..', 'public')));

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// API routes
app.use('/services', serviceRoutes);

// Test DB and sync
(async () => {
  try {
    await testConnection();
    await sequelize.sync({ alter: true }); // change to { force: true } if you want to clear tables
    console.log('✅ Database synced successfully.');
  } catch (err) {
    console.error('❌ Database sync failed:', err);
  }
})();

// Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
