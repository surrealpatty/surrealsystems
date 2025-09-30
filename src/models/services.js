const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./user');

const Service = sequelize.define('Service', {
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  price: { type: DataTypes.FLOAT, allowNull: false },
  userId: { type: DataTypes.INTEGER, allowNull: false },
}, {
  tableName: 'services',
  timestamps: true
});

// Associations
Service.belongsTo(User, { as: 'user', foreignKey: 'userId' });
User.hasMany(Service, { as: 'services', foreignKey: 'userId' });

module.exports = Service;
