const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('codecrowds', 'root', 'YOUR_MYSQL_PASSWORD', { // <--- put your MySQL password
    host: 'localhost',
    dialect: 'mysql',
    logging: false
});

module.exports = sequelize;
