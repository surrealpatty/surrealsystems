require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: 'mysql',   // ✅ change this from 'postgres' to 'mysql'
        logging: false,
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    }
);

const testConnection = async (retries = 5, delay = 5000) => {
    for (let i = 0; i < retries; i++) {
        try {
            await sequelize.authenticate();
            console.log('✅ MySQL connected');
            return;
        } catch (err) {
            console.error(`❌ Database connection failed (attempt ${i + 1}):`, err.message);
            if (i < retries - 1) {
                console.log(`Retrying in ${delay / 1000} seconds...`);
                await new Promise(r => setTimeout(r, delay));
            } else {
                console.error('❌ Could not connect to MySQL after multiple attempts.');
            }
        }
    }
};

module.exports = { sequelize, testConnection };
