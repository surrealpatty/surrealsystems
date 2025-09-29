require('dotenv').config();
const express = require('express');
const path = require('path');
const { sequelize, testConnection } = require('./config/database');
const userRoutes = require('./routes/user');
const serviceRoutes = require('./routes/service');

const app = express();
app.use(express.json());

// Serve frontend
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// API routes
app.use('/api/users', userRoutes);
app.use('/api/services', serviceRoutes);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await testConnection();
    await sequelize.sync();
    app.listen(PORT, () => console.log(`🚀 CodeCrowds API running on port ${PORT}`));
  } catch (err) {
    console.error('Server failed to start:', err);
  }
};

startServer();
