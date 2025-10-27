// src/index.js
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// --- ENV check to help debug runtime configuration ---
console.info('ENV CHECK: NODE_ENV=%s, CORS_ALLOWED_ORIGINS=%s, DATABASE_URL defined? %s',
  process.env.NODE_ENV,
  process.env.CORS_ALLOWED_ORIGINS || '<none>',
  !!process.env.DATABASE_URL);

const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const { sequelize } = require('./config/database');
const userRoutes = require('./routes/user');
const serviceRoutes = require('./routes/service');
const ratingRoutes = require('./routes/rating'); // ratings API
const messagesRoutes = require('./routes/messages'); // messages API (if present)

const app = express();

/* ----------------- Basic hardening ----------------- */
// Hide X-Powered-By header
app.disable('x-powered-by');

// Warn if JWT_SECRET missing in production — common source of auth errors
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.warn('⚠️ JWT_SECRET is not set. Authentication will fail when creating or verifying tokens.');
}

/* ----------------- Trust proxy (for X-Forwarded-* headers) ----------------- */
if (process.env.NODE_ENV === 'production') {
  // if behind a load balancer (Render/Heroku/GCP), trust the proxy
  app.set('trust proxy', 1);
}

/* ---------------------- Security + performance ---------------------- */
const helmetOptions = (process.env.NODE_ENV === 'production')
  ? {}
  : { contentSecurityPolicy: false };
app.use(helmet(helmetOptions));
app.use(compression());

const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

/* ---------------------------- CORS setup ---------------------------- */
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

console.info('CORS allowedOrigins:', (allowedOrigins.length ? allowedOrigins : '[none configured]'));

if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) {
  console.warn('⚠️ CORS_ALLOWED_ORIGINS is empty while NODE_ENV=production — this will block browser requests from other origins.');
}

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0 && process.env.NODE_ENV !== 'production') return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));

app.options('*', cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0 && process.env.NODE_ENV !== 'production') return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));

app.use((req, res, next) => {
  const origin = req.headers.origin;
  res.setHeader('Vary', 'Origin');

  let originAllowed = false;

  if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    originAllowed = true;
  } else if (allowedOrigins.length === 0 && process.env.NODE_ENV !== 'production') {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    originAllowed = true;
  } else if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    originAllowed = true;
  } else {
    if (origin) console.warn('Blocked origin by CORS:', origin);
  }

  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');

  if (req.method === 'OPTIONS') {
    return originAllowed ? res.sendStatus(204) : res.sendStatus(403);
  }

  next();
});

/* ------------------- Dev-only API request logger (helps debugging) ------------------ */
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    if (req.path && req.path.startsWith('/api/')) {
      console.info(`[API] ${req.method} ${req.path} origin=${req.headers.origin || '<none>'}`);
    }
    next();
  });
}

/* --------------------------- Body parsing --------------------------- */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
});
