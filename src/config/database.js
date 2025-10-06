// src/config/database.js
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,     // database name
  process.env.DB_USER,     // username
  process.env.DB_PASSWORD, // password
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306, // MySQL default port
    dialect: 'mysql',                  // MySQL dialect
    logging: false,
  }
);

// Test connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ MySQL connection established successfully.');
  } catch (error) {
    console.error('❌ Unable to connect to MySQL:', error);
  }
};

module.exports = { sequelize, testConnection };
