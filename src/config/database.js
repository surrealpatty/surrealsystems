const { Sequelize } = require('sequelize');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

// Create Sequelize instance
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  protocol: 'postgres',
  logging: false,
  dialectOptions: isProduction
    ? {
        ssl: {
          require: true,
          rejectUnauthorized: false, // Required by Render
        },
      }
    : {},
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

// Function to test DB connection with retries
const testConnection = async () => {
  let connected = false;
  let retries = 0;
  const maxRetries = 10;

  while (!connected && retries < maxRetries) {
    try {
      await sequelize.authenticate();
      console.log('✅ PostgreSQL connection established successfully.');
      connected = true;
    } catch (error) {
      retries++;
      console.error(
        `❌ Connection attempt ${retries} failed. Retrying in 5s...`,
        error.message
      );
      await new Promise((res) => setTimeout(res, 5000));
    }
  }

  if (!connected) {
    console.error('❌ Unable to connect to PostgreSQL after multiple attempts.');
    throw new Error('Database connection failed');
  }
};

module.exports = { sequelize, testConnection };
