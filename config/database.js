const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('codecrowds', 'root', '', {
    host: 'localhost',
    dialect: 'mysql',
    logging: false
});

module.exports = sequelize;
