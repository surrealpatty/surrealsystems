const { Sequelize } = require('sequelize');
require('dotenv').config();

// Create Sequelize instance
const sequelize = new Sequelize(
  process.env.DB_NAME,        // Database name
  process.env.DB_USER,        // Username
  process.env.DB_PASSWORD,    // Password
  {
    host: process.env.DB_HOST,          // DB host from Render
    port: Number(process.env.DB_PORT),  // Port (usually 5432)
    dialect: 'postgres',                // Postgres dialect
    dialectOptions: {
      ssl: {
        require: true,                  // Render requires SSL
        rejectUnauthorized: false       // Important: must be false
      }
    },
    logging: false                      // Disable SQL logging
  }
);

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
