// src/config/database.js
const { Sequelize } = require('sequelize');
require('dotenv').config();

// MySQL connection
const sequelize = new Sequelize(
  process.env.DB_NAME,        // database
  process.env.DB_USER,        // username
  process.env.DB_PASSWORD,    // password
  {
    host: process.env.DB_HOST,          // DB host
    port: Number(process.env.DB_PORT) || 3306,  // MySQL default port
    dialect: 'mysql',                   // MySQL dialect
    logging: false,                     // Disable SQL logging
  }
);

// Test DB connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ MySQL connection established successfully.');
  } catch (err) {
    console.error('❌ Unable to connect to MySQL:', err.message);
  }
};

module.exports = { sequelize, testConnection };
