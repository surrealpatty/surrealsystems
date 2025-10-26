// src/index.js
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { sequelize } = require('./config/database');
const userRoutes = require('./routes/user');
const serviceRoutes = require('./routes/service');
const ratingRoutes = require('./routes/rating'); // ratings API (this file)
const messagesRoutes = require('./routes/messages'); // keep if you have it

const app = express();

app.use(cors({
  origin: true,
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
}));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

// API routes
app.use('/api/users', userRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/messages', messagesRoutes);

const publicDir = path.join(__dirname, '../public');
app.use(express.static(publicDir));

// Only send index.html for non-API GETs (avoid hijacking unknown asset paths)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(publicDir, 'index.html'));
});

const PORT = process.env.PORT || 10000;

(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');
    // Keep schema in sync during development; switch to migrations in prod
    await sequelize.sync({ alter: true });

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ DB init error:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
