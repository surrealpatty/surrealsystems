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
    acquire: Number(process.env.DB_POOL_ACQUIRE || 30000)
  },
  dialectOptions: {
    // keepAlive is useful for some cloud providers
    keepAlive: true,
    statement_timeout: Number(process.env.PG_STATEMENT_TIMEOUT || 5000),
    query_timeout: Number(process.env.PG_QUERY_TIMEOUT || 0)
  }
};

/**
 * Determine whether DB requires SSL:
 * - NODE_ENV === 'production'
 * - OR DB_REQUIRE_SSL is explicitly true (accepts 'true', '1', 'yes')
 * - OR DATABASE_URL contains "sslmode=require" (common with Render/managed PG)
 */
const dbRequireSslEnv = String(process.env.DB_REQUIRE_SSL || '').toLowerCase();
const dbRequiresSsl = (
  process.env.NODE_ENV === 'production' ||
  dbRequireSslEnv === 'true' || dbRequireSslEnv === '1' || dbRequireSslEnv === 'yes' ||
  (process.env.DATABASE_URL && /sslmode=require/i.test(process.env.DATABASE_URL))
);

if (dbRequiresSsl) {
  // For many managed Postgres providers (Render/Heroku), require SSL but don't reject self-signed certs.
  // This keeps things working when the provider uses certs that are not verifiable by default.
  baseOpts.dialectOptions = {
    ...baseOpts.dialectOptions,
    ssl: { require: true, rejectUnauthorized: false }
  };
}

const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, baseOpts)
  : new Sequelize(
      process.env.DB_NAME,
      process.env.DB_USER,
      process.env.DB_PASSWORD,
      { ...baseOpts, host: process.env.DB_HOST, port: Number(process.env.DB_PORT) || 5432 }
    );

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connection established successfully.');
  } catch (err) {
    console.error('❌ Unable to connect to PostgreSQL:', err.message);
    throw err;
  }
};

module.exports = { sequelize, testConnection };
