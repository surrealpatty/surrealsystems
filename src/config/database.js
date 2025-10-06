// src/config/database.js
const { Sequelize } = require('sequelize');
require('dotenv').config();

// Ensure the DATABASE_URL environment variable exists
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable not set');
}

// Use the full DATABASE_URL for Render
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  protocol: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false, // must be false for Render
    },
  },
  logging: false, // disable logging
});

// Test the DB connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connection established successfully.');
  } catch (err) {
    console.error('❌ Unable to connect to PostgreSQL:', err.message);
  }
};

module.exports = { sequelize, testConnection };
