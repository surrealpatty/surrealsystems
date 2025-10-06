// src/config/database.js
const { Sequelize } = require('sequelize');
require('dotenv').config();

let sequelize;

if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== '') {
  console.log('✅ Using Render DATABASE_URL (PostgreSQL)');
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
    logging: false,
  });
} else {
  console.log('⚙️ Using local .env configuration');
  const database = process.env.DB_NAME || 'code_crowds';
  const username = process.env.DB_USER || 'postgres';
  const password = process.env.DB_PASSWORD || '';
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || 5432;

  sequelize = new Sequelize(database, username, password, {
    host,
    port,
    dialect: 'postgres',
    logging: false,
  });
}

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error.message);
  }
};

module.exports = { sequelize, testConnection };
