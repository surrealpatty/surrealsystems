const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

const Service = sequelize.define('Service', {
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    price: { type: DataTypes.FLOAT, allowNull: false }
});

// Relation
Service.belongsTo(User);
User.hasMany(Service);

module.exports = Service;
