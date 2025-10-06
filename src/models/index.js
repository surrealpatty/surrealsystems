const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// User model
const User = sequelize.define('User', {
  username: { type: DataTypes.STRING, allowNull: false, unique: true },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, defaultValue: '' },
  tier: { type: DataTypes.ENUM('free', 'paid'), defaultValue: 'free' }
}, { tableName: 'users', timestamps: true });

// Service model
const Service = sequelize.define('Service', {
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  price: { type: DataTypes.FLOAT, allowNull: false }
}, { tableName: 'services', timestamps: true });

// Associations
User.hasMany(Service, { as: 'services', foreignKey: 'userId' });
Service.belongsTo(User, { as: 'user', foreignKey: 'userId' });

module.exports = { sequelize, User, Service };
