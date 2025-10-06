const { Sequelize } = require('sequelize');
require('dotenv').config();

// Connect via DATABASE_URL (Render PostgreSQL)
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  protocol: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false, // Required for Render
    },
  },
  logging: false,
});

// Test connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connection established successfully.');
  } catch (error) {
    console.error('❌ Unable to connect to PostgreSQL:', error);
  }
};

module.exports = { sequelize, testConnection };
