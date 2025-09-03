// models/database.js
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,       // database name
  process.env.DB_USER,       // username
  process.env.DB_PASSWORD,   // password
  {
    host: process.env.DB_HOST,
    dialect: 'postgres',     // change from mysql/sqlite to postgres
    port: process.env.DB_PORT,
    logging: false           // optional: set to true to see SQL queries
  }
);

module.exports = sequelize;
