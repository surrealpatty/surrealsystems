// models/database.js
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'codecrowds',        // Database name
  process.env.DB_USER || 'root',              // MySQL username
  process.env.DB_PASSWORD || '',              // MySQL password
  {
    host: process.env.DB_HOST || 'localhost', // MySQL host
    port: process.env.DB_PORT || 3306,        // MySQL port
    dialect: 'mysql',                          // Use MySQL
    logging: console.log                       // Optional: show SQL logs
  }
);

module.exports = sequelize;
