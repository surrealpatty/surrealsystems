require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: 'postgres',
        logging: false, // turn off SQL logs
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

// Retry connection until DB is ready
const waitForDb = async (retries = 10, delay = 5000) => {
    for (let i = 0; i < retries; i++) {
        try {
            await sequelize.authenticate();
            console.log('✅ PostgreSQL connected');
            return true;
        } catch (err) {
            console.warn(`⚠️ Database connection failed (attempt ${i + 1}): ${err.message}`);
            if (i < retries - 1) {
                console.log(`⏳ Retrying in ${delay / 1000}s...`);
                await new Promise(r => setTimeout(r, delay));
            } else {
                console.error('❌ Could not connect to database after multiple attempts.');
                process.exit(1); // stop app if DB never connects
            }
        }
    }
};

module.exports = { sequelize, waitForDb };
