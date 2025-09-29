require('dotenv').config();
const { Sequelize } = require('sequelize');

// Postgres connection for Render
const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres',                  // ✅ Postgres
        dialectOptions: { ssl: { rejectUnauthorized: false } }, // ✅ Required for Render
        logging: false
    }
);

// Test DB connection
async function testConnection() {
    try {
        await sequelize.authenticate();
        console.log('✅ Postgres connected');
    } catch (err) {
        console.error('❌ Postgres connection failed:', err);
        throw err;
    }
}

module.exports = { sequelize, testConnection };
