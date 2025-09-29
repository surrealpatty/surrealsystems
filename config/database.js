const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: { ssl: { rejectUnauthorized: false } },
    logging: false, // optional
});

module.exports = { sequelize };
