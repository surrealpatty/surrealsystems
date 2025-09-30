const express = require('express');
const cors = require('cors');
const path = require('path');
const { sequelize, testConnection } = require('./config/database');
const serviceRoutes = require('./routes/service');
const userRoutes = require('./routes/user'); // make sure this file exists
require('dotenv').config();

const app = express();

// ----------------- Middleware -----------------
app.use(cors());
app.use(express.json());

// ----------------- API routes -----------------
app.use('/api/users', userRoutes);  
app.use('/api/services', serviceRoutes); 

// ----------------- Serve frontend -----------------
app.use(express.static(path.join(__dirname, '..', 'public')));

// Root route → serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Catch-all for frontend routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ----------------- Database connection -----------------
(async () => {
  try {
    await testConnection();
    await sequelize.sync({ alter: true });
    console.log('✅ Database synced successfully.');
  } catch (err) {
    console.error('❌ Database sync failed:', err);
  }
})();

// ----------------- Start server -----------------
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
