// src/models/database.js
const { Sequelize } = require('sequelize');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  protocol: 'postgres',
  logging: false,
  dialectOptions: isProduction
    ? { ssl: { require: true, rejectUnauthorized: false } }
    : {},
  pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
});

const testConnection = async () => {
  let connected = false;
  let retries = 0;
  const maxRetries = 10;

  while (!connected && retries < maxRetries) {
    try {
      await sequelize.authenticate();
      console.log('✅ PostgreSQL connection established.');
      connected = true;
    } catch (err) {
      retries++;
      console.error(`❌ Connection attempt ${retries} failed. Retrying in 5s...`, err.message);
      await new Promise((res) => setTimeout(res, 5000));
    }
  }

  if (!connected) throw new Error('Database connection failed');
};

module.exports = { sequelize, testConnection };
