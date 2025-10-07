const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false, // allow self-signed certs
      },
    },
  }
);

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
