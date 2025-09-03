const { Sequelize } = require('sequelize');

// Use DATABASE_URL from Render
const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    protocol: 'postgres',
    logging: false, // change to console.log if you want SQL logs
});

module.exports = sequelize;
