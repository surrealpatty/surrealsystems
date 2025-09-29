require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    process.env.DB_NAME,       // database name
    process.env.DB_USER,       // database user
    process.env.DB_PASSWORD,   // database password
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: 'postgres',
        logging: false,
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

const testConnection = async (retries = 5, delay = 5000) => {
    for (let i = 0; i < retries; i++) {
        try {
            await sequelize.authenticate();
            console.log('✅ PostgreSQL connected');
            return;
        } catch (err) {
            console.error(`❌ Database connection failed (attempt ${i + 1}):`, err.message);
            if (i < retries - 1) {
                console.log(`Retrying in ${delay / 1000} seconds...`);
                await new Promise(r => setTimeout(r, delay));
            } else {
                console.error('❌ Could not connect to database after multiple attempts.');
            }
        }
    }
};

module.exports = { sequelize, testConnection };
