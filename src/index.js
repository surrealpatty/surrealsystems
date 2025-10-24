// src/index.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { sequelize } = require('./config/database');
const userRoutes = require('./routes/user');
const serviceRoutes = require('./routes/service');

const app = express();

/* ── Core middleware ─────────────────────────────────────────────────── */
app.use(compression({ threshold: 0 }));
app.use(helmet());

/**
 * CORS: only allow origins you list in CORS_ALLOWED_ORIGINS
 * Example: CORS_ALLOWED_ORIGINS=https://your-site.com,https://admin.your-site.com
 */
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // allow server-to-server / curl
    if (allowedOrigins.length === 0) return cb(null, true); // fallback: allow all if unset
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('CORS: origin not allowed'), false);
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
}));

// If behind a proxy (Render/Heroku), trust it so rate limits work correctly
app.set('trust proxy', 1);

// Basic rate limit: 100 req / 15 min per IP (override with RATE_LIMIT_MAX)
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  standardHeaders: true,
  legacyHeaders: false
}));

app.use(express.json());

/* ── API routes ──────────────────────────────────────────────────────── */
app.use('/api/users', userRoutes);
app.use('/api/services', serviceRoutes);

/* ── Health endpoint (DB-ready check) ────────────────────────────────── */
let dbStatus = 'starting';
let dbErrorMsg = null;
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    ts: Date.now(),
    uptime: process.uptime(),
    db: dbStatus,
    ...(dbErrorMsg ? { dbError: dbErrorMsg } : {})
  });
});

/* ── Static frontend (../public) ───────────────────────────────────────
   Your index.js is in /src and public/ is at repo root -> go up one level.
*/
app.use(express.static(path.join(__dirname, '../public')));

// Serve index.html for non-API routes (deep links)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

/* ── 404 & Error handlers ────────────────────────────────────────────── */
app.use((req, res) => {
  res.status(404).json({ success: false, error: { message: 'Not found' } });
});

app.use((err, req, res, next) => {
  // avoid leaking internals
  console.error('🔥 Uncaught error:', err);
  const status = err.statusCode || 500;
  const message = err.expose ? err.message : 'Internal server error';
  res.status(status).json({ success: false, error: { message } });
});

/* ── Start server ────────────────────────────────────────────────────── */
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));

/* ── Initialize DB in background (non-blocking) ──────────────────────── */
(async function initDatabase() {
  try {
    await sequelize.authenticate();
    const alter = process.env.DB_ALTER === 'true'; // dev only
    await sequelize.sync({ alter });
    dbStatus = 'ready';
    dbErrorMsg = null;
    console.log('✅ Database ready (alter:', alter, ')');
  } catch (err) {
    dbStatus = 'error';
    dbErrorMsg = err?.message || 'DB init failed';
    console.error('❌ Database init failed:', err);
  }
})();
