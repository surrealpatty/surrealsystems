const { Sequelize } = require('sequelize');
require('dotenv').config();

// Create Sequelize instance with SSL
const sequelize = new Sequelize(
  process.env.DB_NAME,       // database name
  process.env.DB_USER,       // username
  process.env.DB_PASSWORD,   // password
  {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,          // Render requires SSL
        rejectUnauthorized: false, // allows self-signed certs
      },
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    keepAlive: true, // helps prevent connection termination
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
      console.error(`❌ Unable to connect to PostgreSQL: ${err.message}. Retrying in ${delay / 1000}s...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  console.error('❌ Could not connect to PostgreSQL after multiple attempts.');
};

module.exports = { sequelize, testConnection };
