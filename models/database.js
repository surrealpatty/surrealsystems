const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    process.env.DATABASE_URL ||
    `mysql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`, // switched to MySQL
    {
        dialect: 'mysql', // ✅ change dialect to mysql
        logging: false
    }
);

// Test connection function
async function testConnection() {
    try {
        await sequelize.authenticate();
        console.log('✅ MySQL connected');
    } catch (err) {
        console.error('❌ MySQL connection failed:', err);
    }
}

module.exports = { sequelize, testConnection };
