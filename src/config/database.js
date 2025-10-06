const { Sequelize } = require('sequelize');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

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

const testConnection = async () => {
  const maxRetries = 5;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      await sequelize.authenticate();
      console.log('✅ PostgreSQL connection established successfully.');
      return;
    } catch (error) {
      retries++;
      console.error(`❌ Connection attempt ${retries} failed. Retrying in 5s...`);
      if (retries === maxRetries) {
        console.error('❌ Unable to connect to PostgreSQL after multiple attempts:', error);
        throw error;
      }
      await new Promise((res) => setTimeout(res, 5000));
    }
  }
};

module.exports = { sequelize, testConnection };
