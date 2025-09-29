// src/config/database.js
const { sequelize } = require('./database'); // adjust path as needed

async function testConnection() {
    try {
        await sequelize.authenticate();
        console.log('✅ MySQL connection successful');
    } catch (err) {
        console.error('❌ MySQL connection failed:', err);
    }
}

module.exports = { sequelize, testConnection }; // <-- export it
