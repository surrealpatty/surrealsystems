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
const messagesRoutes = require('./routes/messages'); // messages API (if present)
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

/* ---------------------------- CORS setup ---------------------------- */
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
console.info('CORS allowedOrigins:', allowedOrigins.length ? allowedOrigins : '[none configured]');

if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) {
  console.warn(
    '⚠️ CORS_ALLOWED_ORIGINS is empty while NODE_ENV=production — this will block browser requests from other origins.',
  );
}

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.length === 0 && process.env.NODE_ENV !== 'production')
        return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
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
      if (allowedOrigins.length === 0 && process.env.NODE_ENV !== 'production')
        return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  }),
);

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
/**
 * Stripe requires the raw request body for signature verification.
 * Register the webhook BEFORE express.json() is used for other routes.
 */
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

// mount payments for non-webhook routes
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
/**
 * startServer()
 *  - authenticates DB
 *  - optionally runs sequelize.sync in non-production if DB_ALTER=true (keeps prior behavior)
 *  - when run directly (node src/index.js) it starts listening
 *  - when imported, it performs DB init and returns the app (without starting listener)
 */
async function startServer() {
  // Use the testConnection helper which does retries and provides better logs.
  await testConnection();
  console.log('✅ Database connected');

  // Keep schema in sync during development only when explicitly enabled.
  if (process.env.NODE_ENV !== 'production') {
    const useAlter = process.env.DB_ALTER === 'true' || process.env.DB_SYNC_ALTER === 'true';
    if (useAlter) {
      console.log('⚠️ Running sequelize.sync({ alter: true }) - development only');
    } else {
      console.log('ℹ️ Skipping sequelize.sync (DB_ALTER not enabled)');
    }
    await sequelize.sync({ alter: useAlter });
  } else {
    console.log(
      '⚠️ Production mode: skipping sequelize.sync. Apply migrations before starting the app.',
    );
  }

  // If the file was run directly, start listening.
  if (require.main === module) {
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
    return server;
  }

  // When imported, return the app for tests or external servers.
  return app;
}

/* -------------------- Global error / rejection handlers ------------------ */
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

// Export app & startServer for tests / external run
module.exports = { app, startServer };

// If run directly, call startServer and handle failures by exiting.
if (require.main === module) {
  startServer().catch((err) => {
    console.error('❌ DB init error:', err && err.message ? err.message : err);
    throw new Error('Exiting with status 1');
  });
}
