// src/config/database.js
const { Sequelize } = require('sequelize');
require('dotenv').config();

const baseOpts = {
  dialect: 'postgres',
  logging: process.env.SQL_LOG === 'true' ? console.log : false,
  pool: {
    max: Number(process.env.DB_POOL_MAX || 10),
    min: Number(process.env.DB_POOL_MIN || 2),
    idle: Number(process.env.DB_POOL_IDLE || 10000),
    acquire: Number(process.env.DB_POOL_ACQUIRE || 30000),
  },
  dialectOptions: {
    keepAlive: true,
    statement_timeout: Number(process.env.PG_STATEMENT_TIMEOUT || 5000),
    query_timeout: Number(process.env.PG_QUERY_TIMEOUT || 0),
  },

  // IMPORTANT: Use camelCase timestamp and foreign key names to match existing DB.
  // If you prefer snake_case DB columns (created_at) then set underscored: true
  // but your current DB uses `createdAt` / `updatedAt`.
  define: {
    underscored: false,
  },
};

/**
 * Helper to enable SSL when explicitly requested or when the DATABASE_URL
 * indicates sslmode=require.
 *
 * We DO NOT force SSL simply because NODE_ENV === 'production' — forcing SSL
 * for all production runs can terminate connections for DBs that do not use SSL.
 *
 * Enable SSL by setting DB_REQUIRE_SSL=true (or 1/yes), or include
 * sslmode=require in your DATABASE_URL (common on some managed PG providers).
 */
function ensureSslIfNeeded(opts) {
  const dbRequireSslEnv = String(process.env.DB_REQUIRE_SSL || '').toLowerCase();
  const dbRequiresSsl =
    dbRequireSslEnv === 'true' ||
    dbRequireSslEnv === '1' ||
    dbRequireSslEnv === 'yes' ||
    (process.env.DATABASE_URL && /sslmode=require/i.test(process.env.DATABASE_URL));

  if (dbRequiresSsl) {
    opts.dialectOptions = {
      ...opts.dialectOptions,
      ssl: { require: true, rejectUnauthorized: false },
    };
  }

  return opts;
}

let sequelize;

// Safe initialization: validate DATABASE_URL before passing to Sequelize.
// If DATABASE_URL is missing or invalid, fall back to DB_* env vars.
const rawDbUrl = process.env.DATABASE_URL ? String(process.env.DATABASE_URL).trim() : '';

if (rawDbUrl) {
  // If the URL appears valid per the WHATWG URL constructor, try to use it.
  // If that fails, we'll gracefully fall back to DB_* variables.
  try {
    // Validate URL syntax
    new URL(rawDbUrl);

    // Make a copy of baseOpts and enable SSL if needed
    const opts = ensureSslIfNeeded({ ...baseOpts });

    // Try to initialize Sequelize with the URL
    sequelize = new Sequelize(rawDbUrl, opts);
  } catch (err) {
    console.warn(
      'Warning: invalid or unsupported DATABASE_URL. Falling back to DB_* env vars. Error:',
      err && err.message ? err.message : err,
    );
    // fallback to DB_* env vars
    sequelize = new Sequelize(
      process.env.DB_NAME,
      process.env.DB_USER,
      process.env.DB_PASSWORD,
      ensureSslIfNeeded({
        ...baseOpts,
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT) || 5432,
      }),
    );
  }
} else {
  // No DATABASE_URL — use split DB env vars
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    ensureSslIfNeeded({
      ...baseOpts,
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 5432,
    }),
  );
}

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connection established successfully.');
  } catch (err) {
    console.error('❌ Unable to connect to PostgreSQL:', err && err.message ? err.message : err);
    throw err;
  }
};

module.exports = { sequelize, testConnection };
