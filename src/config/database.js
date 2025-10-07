const { Sequelize } = require('sequelize');
require('dotenv').config();

// Create Sequelize instance using DATABASE_URL
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false, // Required for Render
    },
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  keepAlive: true,
});

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
