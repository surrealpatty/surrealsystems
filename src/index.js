const express = require('express');
const cors = require('cors');
const path = require('path');
const { sequelize, testConnection } = require('./config/database');
const serviceRoutes = require('./routes/service');
const { User } = require('./models/user');
const { Service } = require('./models/service');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Root route → serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Service API routes
app.use('/services', serviceRoutes);

// Test DB and sync
(async () => {
  try {
    await testConnection();
    await sequelize.sync({ alter: true });
    console.log('✅ Database synced successfully.');
  } catch (err) {
    console.error(err);
  }
})();

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
