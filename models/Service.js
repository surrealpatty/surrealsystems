const { DataTypes } = require('sequelize');
const sequelize = require('./database');
const User = require('./User');

const Service = sequelize.define('Service', {
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    price: { type: DataTypes.FLOAT, allowNull: false },
});

// Associations
User.hasMany(Service);
Service.belongsTo(User);

module.exports = Service;
