// src/config/database.js
const { Sequelize } = require('sequelize');
require('dotenv').config();

const DATABASE_URL = `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}` +
                     `@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false, // Render requires this
    },
  },
  keepAlive: true,
});

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
