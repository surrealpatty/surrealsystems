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

// CORS: allow only configured origins; allow server-to-server calls too
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // curl/server-to-server
    if (allowedOrigins.length === 0) return cb(null, true); // fallback if unset
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('CORS: origin not allowed'), false);
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
}));

// Trust proxy for real client IP (Render/Heroku)
app.set('trust proxy', 1);

// Rate limit: 100 req / 15m per IP (override with RATE_LIMIT_MAX)
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  standardHeaders: true,
  legacyHeaders: false
}));

app.use(express.json());

/* ── Server-Timing (see slow endpoints in devtools) ──────────────────── */
app.set('etag', 'weak');
app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const durMs = Number((process.hrtime.bigint() - start) / 1000000n);
    res.setHeader('Server-Timing', `app;dur=${durMs}`);
    if (durMs > 300) console.warn(`[SLOW] ${req.method} ${req.originalUrl} -> ${res.statusCode} in ${durMs}ms`);
  });
  next();
});

/* ── API routes ──────────────────────────────────────────────────────── */
app.use('/api/users', userRoutes);
app.use('/api/services', serviceRoutes);

/* ── Health endpoint ─────────────────────────────────────────────────── */
let dbStatus = 'starting';
let dbErrorMsg = null;
app.get('/api/health', (req, res) => {
  res.json({ ok: true, ts: Date.now(), uptime: process.uptime(), db: dbStatus, ...(dbErrorMsg ? { dbError: dbErrorMsg } : {}) });
});

/* ── Static frontend with caching ──────────────────────────────────────
   NOTE: index.js is in /src and public/ is at repo root -> ../public
*/
const publicDir = path.join(__dirname, '../public');
app.use(express.static(publicDir, { maxAge: '7d', etag: true, lastModified: true, immutable: true }));

// Root HTML: no-store so new deploys show instantly
app.get('/', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.sendFile(path.join(publicDir, 'index.html'));
});

// SPA deep links: serve index.html (no-store), but don't intercept API
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.set('Cache-Control', 'no-store');
  res.sendFile(path.join(publicDir, 'index.html'));
});

/* ── 404 & Error handlers ────────────────────────────────────────────── */
app.use((req, res) => res.status(404).json({ success: false, error: { message: 'Not found' } }));

app.use((err, req, res, next) => {
  console.error('🔥 Uncaught error:', err.message);
  const status = err.statusCode || 500;
  const message = err.expose ? err.message : 'Internal server error';
  res.status(status).json({ success: false, error: { message } });
});

/* ── Boot sequence ───────────────────────────────────────────────────── */
const PORT = process.env.PORT || 10000;

async function boot() {
  try {
    await sequelize.authenticate();
    const alter = process.env.DB_ALTER === 'true' && process.env.NODE_ENV !== 'production';
    await sequelize.sync({ alter });
    dbStatus = 'ready'; dbErrorMsg = null;
    console.log('✅ Database ready (alter:', alter, ')');
    app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
  } catch (err) {
    dbStatus = 'error'; dbErrorMsg = err?.message || 'DB init failed';
    console.error('❌ Failed to start: DB init error:', err);
    if (process.env.NODE_ENV === 'production') process.exit(1);
    app.listen(PORT, () => console.log(`🚀 Dev server on http://localhost:${PORT} (DB error)`));
  }
}
boot();
