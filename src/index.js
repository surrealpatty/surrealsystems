require('dotenv').config();
const express = require('express');
const path = require('path');
const { sequelize, testConnection } = require('./config/database');
const userRoutes = require('./routes/user');
const serviceRoutes = require('./routes/service');

const app = express();
app.use(express.json());

// API routes
app.use('/api/users', userRoutes);
app.use('/api/services', serviceRoutes);

// Serve frontend static files
const publicPath = path.join(process.cwd(), 'src/public'); // ensures correct path on Render
app.use(express.static(publicPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await testConnection();
    await sequelize.sync(); // ensures tables exist
    app.listen(PORT, () => console.log(`🚀 CodeCrowds API running on port ${PORT}`));
  } catch (err) {
    console.error('Server failed to start:', err);
  }
};

startServer();
