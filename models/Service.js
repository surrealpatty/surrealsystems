const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

const Service = sequelize.define('Service', {
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    price: { type: DataTypes.FLOAT, allowNull: false },
    featured: { type: DataTypes.BOOLEAN, defaultValue: false },
    hidden: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
    tableName: 'services',
    timestamps: true
});

// Associations
Service.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(Service, { foreignKey: 'userId', as: 'services' });

module.exports = Service;
