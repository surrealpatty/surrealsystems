require('dotenv').config();
const { Sequelize } = require('sequelize');

// Create Sequelize instance for MySQL
const sequelize = new Sequelize(
  process.env.DB_NAME,      // Database name
  process.env.DB_USER,      // Username
  process.env.DB_PASSWORD,  // Password
  {
    host: process.env.DB_HOST,   // e.g., localhost
    port: process.env.DB_PORT,   // e.g., 3306
    dialect: 'mysql',            // ✅ MySQL
    logging: false,              // Set to true if you want SQL logs
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// Function to test DB connection with retries
const testConnection = async (retries = 5, delay = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      await sequelize.authenticate();
      console.log('✅ MySQL connected');
      return;
    } catch (err) {
      console.error(`❌ Database connection failed (attempt ${i + 1}):`, err.message);
      if (i < retries - 1) {
        console.log(`⏳ Retrying in ${delay / 1000}s...`);
        await new Promise(r => setTimeout(r, delay));
      } else {
        console.error('❌ Could not connect to MySQL after multiple attempts.');
      }
    }
  }
};

module.exports = { sequelize, testConnection };
