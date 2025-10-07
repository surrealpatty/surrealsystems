// src/config/database.js
const { Sequelize } = require('sequelize');
require('dotenv').config();

// MySQL connection using credentials from .env
const sequelize = new Sequelize(
  process.env.DB_NAME,       // database
  process.env.DB_USER,       // username
  process.env.DB_PASSWORD,   // password
  {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    dialect: 'mysql',        // change to MySQL
    logging: false,          // disable SQL logging
  }
);

// Test DB connection with retry
const testConnection = async (retries = 5, delay = 3000) => {
  for (let i = 0; i < retries; i++) {
    try {
      await sequelize.authenticate();
      console.log('✅ MySQL connection established successfully.');
      return;
    } catch (err) {
      console.error(`❌ Unable to connect to MySQL: ${err.message}. Retrying in ${delay / 1000}s...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  console.error('❌ Could not connect to MySQL after multiple attempts.');
};

module.exports = { sequelize, testConnection };
