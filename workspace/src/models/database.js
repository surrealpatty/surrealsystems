// src/models/database.js
require('dotenv').config();
const { Sequelize } = require('sequelize');

/**
 * Default dialectOptions we want for hosted Postgres (Render, Heroku, etc.)
 * This uses SSL and disables certificate strictness which is commonly required
 * for managed Postgres instances that use auto-generated certs.
 */
const DEFAULT_DIALECT_OPTIONS = {
  ssl: {
    require: true,
    rejectUnauthorized: false,
  },
};

let sequelize;

/**
 * Prefer a single source of truth: if DATABASE_URL is provided use it.
 * Otherwise fall back to the DB_* environment variables.
 */
if (process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: DEFAULT_DIALECT_OPTIONS,
    logging: false,
  });
} else {
  // Construct from DB_* envs (existing behaviour)
  const useSsl =
    process.env.DB_REQUIRE_SSL === 'true' ||
    process.env.NODE_ENV === 'production' ||
    !!process.env.DATABASE_URL; // defensive: if URL existed we'd have used it above

  sequelize = new Sequelize(
    process.env.DB_NAME || 'codecrowds',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || null,
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
      dialect: 'postgres',
      dialectOptions: useSsl ? DEFAULT_DIALECT_OPTIONS : {},
      logging: false,
    },
  );
}

// Test DB connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established');
  } catch (err) {
    console.error('❌ Unable to connect to database:', err);
    throw err;
  }
};

module.exports = { sequelize, testConnection };
