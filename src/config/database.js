const { Sequelize } = require('sequelize');
require('dotenv').config();

// Use the full DATABASE_URL provided by Render
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('❌ DATABASE_URL is not set in environment variables');
}

const sequelize = new Sequelize(connectionString, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,           // Render requires SSL
      rejectUnauthorized: false,
    },
  },
  logging: false,
});

// Retry DB connection
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
