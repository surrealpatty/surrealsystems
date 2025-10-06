// src/config/database.js
const { Sequelize } = require('sequelize');
require('dotenv').config();

// Use a connection string if available (Render sets DATABASE_URL automatically)
const connectionString = process.env.DATABASE_URL || 
  `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

const sequelize = new Sequelize(connectionString, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false, // Needed for Render
    },
  },
  logging: false,
});

// Test DB connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connection established successfully.');
  } catch (err) {
    console.error('❌ Unable to connect to PostgreSQL:', err.message);
  }
};

module.exports = { sequelize, testConnection };
