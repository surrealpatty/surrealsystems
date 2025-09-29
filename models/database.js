const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres', // ✅ Must be postgres
        dialectOptions: { ssl: { rejectUnauthorized: false } }, // for Render
        logging: false
    }
);

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
