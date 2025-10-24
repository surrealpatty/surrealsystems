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
  dialectOptions: {}
};

// SSL only in production
if (process.env.NODE_ENV === 'production') {
  baseOpts.dialectOptions.ssl = { require: true, rejectUnauthorized: false };
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
