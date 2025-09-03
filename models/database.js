// models/database.js
const { Sequelize } = require('sequelize');

// Use Render's DATABASE_URL environment variable
// DATABASE_URL example: postgres://user:password@host:port/dbname
const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    protocol: 'postgres',
    logging: false, // set true to debug SQL queries
});

module.exports = sequelize;
