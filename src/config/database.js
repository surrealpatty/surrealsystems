// src/config/database.js
const { Sequelize } = require('sequelize');
require('dotenv').config();

// Use Render's DATABASE_URL for connection
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  protocol: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false, // ✅ required for Render
    },
  },
  logging: false, // optional: set true to see SQL queries
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
