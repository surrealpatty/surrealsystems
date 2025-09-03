const { Sequelize } = require('sequelize');

// Connect to Postgres using Render environment variables
const sequelize = new Sequelize(
  process.env.DB_NAME,      // database
  process.env.DB_USER,      // username
  process.env.DB_PASSWORD,  // password
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false, // turn on if you want SQL logs
  }
);

module.exports = sequelize;
