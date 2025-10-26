// src/index.js
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const { sequelize } = require('./config/database');
const userRoutes = require('./routes/user');
const serviceRoutes = require('./routes/service');
const ratingRoutes = require('./routes/rating'); // ratings API (this file)
const messagesRoutes = require('./routes/messages'); // keep if you have it

const app = express();

/* ----------------- Trust proxy (for X-Forwarded-* headers) ----------------- */
if (process.env.NODE_ENV === 'production') {
  // if behind a load balancer (Render/Heroku/GCP), trust the proxy
  app.set('trust proxy', 1);
}

/* ---------------------- Security + performance ---------------------- */
// Common security headers
app.use(helmet());

// Optional compression for faster responses (static + API)
app.use(compression());

// Rate limiting (basic IP-level protection)
const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // default 15 minutes
  max: Number(process.env.RATE_LIMIT_MAX) || 100, // requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

/* ---------------------------- CORS setup ---------------------------- */
/**
 * Provide CORS_ALLOWED_ORIGINS as a comma-separated list of origins in env.
 * Example: CORS_ALLOWED_ORIGINS=https://app.example.com,http://localhost:3000
 */
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (curl, mobile apps, server-to-server)
    if (!origin) return callback(null, true);

    // If no origins configured (dev), allow all origins for convenience.
    if (allowedOrigins.length === 0 && process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // Block other origins
    return callback(new Error('CORS policy: origin not allowed'));
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));

/* --------------------------- Body parsing --------------------------- */
app.use(express.json());

/* ----------------------------- Health ------------------------------ */
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

/* ----------------------------- Routes ------------------------------ */
app.use('/api/users', userRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/messages', messagesRoutes);

/* --------------------------- Static Files -------------------------- */
const publicDir = path.join(__dirname, '../public');
app.use(express.static(publicDir));

// Only send index.html for non-API GETs (avoid hijacking unknown asset paths)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(publicDir, 'index.html'));
});

const PORT = process.env.PORT || 10000;

/* ------------------------- App startup ----------------------------- */
(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Keep schema in sync during development only when explicitly enabled.
    if (process.env.NODE_ENV !== 'production') {
      const useAlter = process.env.DB_ALTER === 'true';
      if (useAlter) {
        console.log('⚠️ Running sequelize.sync({ alter: true }) - development only');
      } else {
        console.log('ℹ️ Skipping sequelize.sync (DB_ALTER not enabled)');
      }
      await sequelize.sync({ alter: useAlter });
    } else {
      // Production: do not call sync() — run migrations instead.
      console.log('⚠️ Production mode: skipping sequelize.sync. Apply migrations before starting the app.');
    }

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ DB init error:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();

/* -------------------- Global error / rejection handlers ------------------ */
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // In production you might want to exit and let a process manager restart the app.
});
