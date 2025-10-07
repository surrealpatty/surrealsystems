// src/config/database.js
const { Sequelize } = require('sequelize');
require('dotenv').config();

// PostgreSQL connection using individual credentials
const sequelize = new Sequelize(
  process.env.DB_NAME,       // database
  process.env.DB_USER,       // username
  process.env.DB_PASSWORD,   // password
  {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
    logging: false,
  }
);

// Test DB connection with retry
const testConnection = async (retries = 5, delay = 3000) => {
  for (let i = 0; i < retries; i++) {
    try {
      await sequelize.authenticate();
      console.log('✅ PostgreSQL connection established successfully.');
      return;
    } catch (err) {
      console.error(`❌ Unable to connect to PostgreSQL: ${err.message}. Retrying in ${delay/1000}s...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  console.error('❌ Could not connect to PostgreSQL after multiple attempts.');
};

module.exports = { sequelize, testConnection };
