const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('codecrowds', 'root', 'YLtr+TlSWaRifesplsuPacLChe0', { // <--- put your MySQL password
    host: 'localhost',
    dialect: 'mysql',
    logging: false
});

module.exports = sequelize;
