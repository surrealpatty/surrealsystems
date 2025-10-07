const { Sequelize } = require('sequelize');
require('dotenv').config();

// Create Sequelize instance for Render
const sequelize = new Sequelize(
  process.env.DB_NAME,       // Database name
  process.env.DB_USER,       // Database username
  process.env.DB_PASSWORD,   // Database password
  {
    host: process.env.DB_HOST,       // Render Postgres host
    port: Number(process.env.DB_PORT) || 5432, // Default Postgres port
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,           // SSL is required on Render
        rejectUnauthorized: false // Must be false for Render
      }
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    keepAlive: true
  }
);

// Test DB connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connection established successfully.');
  } catch (err) {
    console.error('❌ Unable to connect to PostgreSQL:', err.message);
    throw err;
  }
};

module.exports = { sequelize, testConnection };
