// src/index.js
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// --- support JWT_SECRETS rotation env var (first secret used if JWT_SECRET missing) ---
if (!process.env.JWT_SECRET && process.env.JWT_SECRETS) {
  const first = String(process.env.JWT_SECRETS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)[0];
  if (first) {
    process.env.JWT_SECRET = first;
    console.info('Using first secret from JWT_SECRETS as JWT_SECRET (rotation supported).');
  }
}

// --- ENV check to help debug runtime configuration ---
console.info(
  'ENV CHECK: NODE_ENV=%s, CORS_ALLOWED_ORIGINS=%s, DATABASE_URL defined? %s',
  process.env.NODE_ENV,
  process.env.CORS_ALLOWED_ORIGINS || '<none>',
  !!process.env.DATABASE_URL,
);

// --- quick, safe DATABASE_URL diagnostic (no passwords printed) ---
(function diagDatabaseUrl() {
  const raw = process.env.DATABASE_URL ? String(process.env.DATABASE_URL) : '';
  const startsWithQuote = raw.startsWith('"') || raw.startsWith("'");
  const endsWithQuote = raw.endsWith('"') || raw.endsWith("'");
  let parsed = null;
  try {
    if (raw) parsed = new URL(raw);
  } catch (e) {
    parsed = null;
  }

  const parsedInfo = parsed
    ? {
        host: parsed.hostname,
        port: parsed.port || 5432,
        database: (parsed.pathname || '').replace(/^\//, ''),
        user: parsed.username,
        sslmode: parsed.searchParams.get('sslmode') || null,
      }
    : null;

  console.info('SANITIZED DB DEBUG:', {
    defined: !!raw,
    length: raw.length,
    startsWithQuote,
    endsWithQuote,
    parsed: parsedInfo,
    env_DB_REQUIRE_SSL: process.env.DB_REQUIRE_SSL || null,
  });
})();

const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const { sequelize, testConnection } = require('./config/database');
const userRoutes = require('./routes/user');
const serviceRoutes = require('./routes/service');
const ratingRoutes = require('./routes/rating'); // ratings API
const messagesRoutes = require('./routes/messages'); // messages API
const paymentsRoutes = require('./routes/payments'); // payments + webhook

const app = express();

/* ----------------- Basic hardening ----------------- */
app.disable('x-powered-by');

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.warn(
    '⚠️ JWT_SECRET is not set. Authentication will fail when creating or verifying tokens.',
  );
}

/* ----------------- Trust proxy ----------------- */
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

/* ---------------------- Security + performance ---------------------- */
const helmetOptions = process.env.NODE_ENV === 'production' ? {} : { contentSecurityPolicy: false };
app.use(helmet(helmetOptions));
app.use(compression());

const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

/* ---------------------------- CORS setup (improved) ---------------------------- */
function normalizeOriginString(o) {
  if (!o || typeof o !== 'string') return '';
  // trim whitespace, remove any trailing slashes, and lowercase for stable comparisons
  return o.trim().replace(/\/+$/, '').toLowerCase();
}

let allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => normalizeOriginString(s))
  .filter(Boolean);

// If no explicit CORS_ALLOWED_ORIGINS but FRONTEND_URL is provided, add it as a convenience.
if (allowedOrigins.length === 0 && process.env.FRONTEND_URL) {
  try {
    const f = normalizeOriginString(process.env.FRONTEND_URL || '');
    if (f) {
      allowedOrigins.push(f);
      console.info('No CORS_ALLOWED_ORIGINS configured — added FRONTEND_URL to allowedOrigins:', f);
    }
  } catch (e) {
    /* ignore parse errors */
  }
}

// In non-production, make local dev easier by allowing common localhost origins.
if (process.env.NODE_ENV !== 'production') {
  const locals = [
    'http://localhost:3000',
    'http://localhost:10000',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:10000',
  ];
  allowedOrigins = [...new Set([...allowedOrigins, ...locals.map(normalizeOriginString)])]; // dedupe
}

console.info('CORS allowedOrigins:', allowedOrigins.length ? allowedOrigins : '[none configured]');

if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) {
  console.warn(
    '⚠️ CORS_ALLOWED_ORIGINS is empty while NODE_ENV=production — this will block browser requests from other origins.',
  );
}

app.use(
  cors({
    origin: function (origin, callback) {
      // If there's no Origin header (e.g., curl from server), allow it
      if (!origin) return callback(null, true);

      const normalizedOrigin = normalizeOriginString(origin);

      // In non-production with no configured origins, allow any origin (existing behavior)
      if (allowedOrigins.length === 0 && process.env.NODE_ENV !== 'production')
        return callback(null, true);

      if (allowedOrigins.includes(normalizedOrigin)) return callback(null, true);

      // not allowed
      return callback(null, false);
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  }),
);

app.options(
  '*',
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      const normalizedOrigin = normalizeOriginString(origin);
      if (allowedOrigins.length === 0 && process.env.NODE_ENV !== 'production')
        return callback(null, true);
      if (allowedOrigins.includes(normalizedOrigin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  }),
);

// set Access-Control-Allow-* headers according to computed allowedOrigins.
app.use((req, res, next) => {
  const rawOrigin = req.headers.origin;
  const origin = normalizeOriginString(rawOrigin);
  res.setHeader('Vary', 'Origin');

  let originAllowed = false;

  if (!rawOrigin) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    originAllowed = true;
  } else if (allowedOrigins.length === 0 && process.env.NODE_ENV !== 'production') {
    res.setHeader('Access-Control-Allow-Origin', rawOrigin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    originAllowed = true;
  } else if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', rawOrigin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    originAllowed = true;
  } else {
    if (rawOrigin) console.warn('Blocked origin by CORS:', rawOrigin);
  }

  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');

  if (req.method === 'OPTIONS') {
    return originAllowed ? res.sendStatus(204) : res.sendStatus(403);
  }

  next();
});

// TEMP DEBUG: log incoming origin & path.
app.use((req, res, next) => {
  if (req.headers && req.headers.origin) {
    console.info('DEBUG incoming origin:', req.headers.origin, 'path:', req.path);
  }
  next();
});

/* ------------------- Dev-only API request logger ------------------ */
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    if (req.path && req.path.startsWith('/api/')) {
      console.info(`[API] ${req.method} ${req.path} origin=${req.headers.origin || '<none>'}`);
    }
    next();
  });
}

/* --------------------------- Webhook (raw body) -------------------------- */
app.post(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' }),
  paymentsRoutes.webhookHandler,
);

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
app.use('/api/payments', paymentsRoutes);

/* --------------------------- Static Files -------------------------- */
const publicDir = path.join(__dirname, '../public');
app.use(express.static(publicDir));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(publicDir, 'index.html'));
});

const PORT = process.env.PORT || 10000;

/* ------------------------- App startup (exportable) ----------------------------- */
async function startServer() {
  // DB connection with retries
  await testConnection();
  console.log('✅ Database connected');

  // Decide whether to ALTER or just SYNC, based on env.
  const useAlter =
    process.env.NODE_ENV !== 'production' &&
    (process.env.DB_ALTER === 'true' || process.env.DB_SYNC_ALTER === 'true');

  if (useAlter) {
    console.log('⚠️ Running sequelize.sync({ alter: true }) - development only');
    await sequelize.sync({ alter: true });
  } else {
    console.log('ℹ️ Running sequelize.sync() to ensure tables exist');
    await sequelize.sync();
  }

  if (require.main === module) {
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
    return server;
  }

  return app;
}

/* -------------------- Global error / rejection handlers ------------------ */
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

module.exports = { app, startServer };

if (require.main === module) {
  startServer().catch((err) => {
    console.error('❌ DB init error:', err && err.message ? err.message : err);
    throw new Error('Exiting with status 1');
  });
}
