"use strict";
require('dotenv').config();
const { Sequelize } = require('sequelize');
// PostgreSQL connection
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    dialectOptions: {
        ssl: {
            rejectUnauthorized: false
        }
    },
    logging: false
});
// Test DB connection
const testConnection = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connection established');
    }
    catch (err) {
        console.error('❌ Unable to connect to database:', err);
        throw err;
    }
};
module.exports = { sequelize, testConnection };
