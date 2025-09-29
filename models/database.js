// models/database.js
require('dotenv').config();
const { Sequelize } = require('sequelize');

// Create Sequelize instance
const sequelize = new Sequelize(
    process.env.DB_NAME,       // database name
    process.env.DB_USER,       // database user
    process.env.DB_PASSWORD,   // database password
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: 'postgres',
        logging: false,       // turn off SQL logs
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        },
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    }
);

// Test DB connection function
const testConnection = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ PostgreSQL connected');
    } catch (err) {
        console.error('❌ Database connection failed:', err);
    }
};

module.exports = { sequelize, testConnection };
