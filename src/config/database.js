const { Sequelize } = require('sequelize');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

// Setup Sequelize with SSL for production
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  protocol: 'postgres',
  dialectOptions: isProduction
    ? {
        ssl: {
          require: true,
          rejectUnauthorized: false, // Required for Render
        },
      }
    : {},
  logging: false,
});

// Retry logic for database connection
const testConnection = async () => {
  let connected = false;
  let retries = 0;

  while (!connected) {
    try {
      await sequelize.authenticate();
      console.log('✅ PostgreSQL connection established successfully.');
      connected = true;
    } catch (error) {
      retries++;
      console.error(`❌ Connection attempt ${retries} failed. Retrying in 5s...`, error.message);
      await new Promise((res) => setTimeout(res, 5000));
    }
  }
};

module.exports = { sequelize, testConnection };
