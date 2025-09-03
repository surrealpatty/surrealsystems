// models/database.js
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,           // database name
  process.env.DB_USER,           // username
  process.env.DB_PASSWORD,       // password
  {
    host: process.env.DB_HOST,   // database host
    port: parseInt(process.env.DB_PORT) || 3306, // parse string to number
    dialect: 'mysql',
    logging: false               // optional: disables SQL query logs
  }
);

module.exports = sequelize;
