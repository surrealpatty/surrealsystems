// src/index.js
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { sequelize, testConnection } = require('./config/database');
const userRoutes = require('./routes/user');
const serviceRoutes = require('./routes/service');
const ratingRoutes = require('./routes/rating');
const messageRoutes = require('./routes/messages');

const app = express();

app.use(cors({
  origin: true,
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS']
}));
app.use(express.json());

// ✅ Serve static frontend (public/*)
// NOTE: __dirname points to /src, so ../public is correct
app.use(express.static(path.join(__dirname, '../public')));

// ✅ API routes
app.use('/api/users', userRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/messages', messageRoutes);

// 404 for unknown routes (non-static, non-API)
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

const startServer = async () => {
  try {
    await testConnection();
    await sequelize.sync({ alter: true });
    const PORT = process.env.PORT || 10000;
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  } catch (err) {
    console.error('❌ Server failed to start:', err.message);
    process.exit(1);
  }
};

startServer();
