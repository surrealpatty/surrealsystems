// src/index.js
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { sequelize } = require('./config/database');
const userRoutes = require('./routes/user');
const serviceRoutes = require('./routes/service');
const ratingRoutes = require('./routes/rating'); // ✅ add back

const app = express();

/* ---- Minimal middleware (fast) ---- */
app.use(cors({
  origin: true, // allow all (simple & fast)
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS']
}));
app.use(express.json());

/* ---- Health endpoint (frontend expects this) ---- */
app.get('/api/health', (req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

/* ---- API routes ---- */
app.use('/api/users', userRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/ratings', ratingRoutes); // ✅ restore ratings

/* ---- Static frontend (serve ../public) ---- */
const publicDir = path.join(__dirname, '../public');
app.use(express.static(publicDir));

// SPA fallback (don’t intercept /api/*)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(publicDir, 'index.html'));
});

/* ---- Boot ---- */
const PORT = process.env.PORT || 10000;
sequelize.authenticate()
  .then(() => console.log('✅ Database connected'))
  .catch(err => console.error('❌ DB Connection Error:', err.message));

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
