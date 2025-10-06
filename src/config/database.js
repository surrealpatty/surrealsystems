// src/config/database.js
const { Sequelize } = require('sequelize');
require('dotenv').config();

// Make sure DATABASE_URL exists in your environment variables
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable not set');
}

// Create Sequelize instance using the full URL
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  protocol: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false, // must be false on Render
    },
  },
  logging: false,
});

// Test the connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connection established successfully.');
  } catch (err) {
    console.error('❌ Unable to connect to PostgreSQL:', err.message);
  }
};

module.exports = { sequelize, testConnection };
