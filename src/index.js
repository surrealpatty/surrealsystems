// server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { sequelize, testConnection } = require('./config/database');
const userRoutes = require('./routes/user');
const serviceRoutes = require('./routes/service');
const ratingRoutes = require('./routes/rating');
const messageRoutes = require('./routes/messages'); // ✅ MOUNT THIS

const app = express();

// Middleware
app.use(cors({
  origin: true, // or ['http://localhost:3000'] if you want to pin it
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'], // ✅ allow JWT header
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS']
}));
app.use(express.json());

// Serve frontend
app.use(express.static(path.join(__dirname, '../public')));

// API routes
app.use('/api/users', userRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/messages', messageRoutes); // ✅ NOW ACTIVE

// 404 for unknown routes
app.use((req, res) => {
  res.status(404).json({ success: false, error: { message: 'Not found' } });
});

// Central error handler
app.use((err, req, res, next) => {
  console.error('🔥 Uncaught error:', err);
  const status = err.statusCode || 500;
  const message = err.expose ? err.message : 'Internal server error';
  res.status(status).json({ success: false, error: { message } });
});

// Start server
const startServer = async () => {
  try {
    await testConnection();
    await sequelize.sync({ alter: true }); // keep schemas in sync
    const PORT = process.env.PORT || 10000;
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  } catch (err) {
    console.error('❌ Server failed to start:', err.message);
    process.exit(1);
  }
};

startServer();
