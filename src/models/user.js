// src/models/user.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  username: { type: DataTypes.STRING, allowNull: false, unique: true },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.STRING },
  tier: { type: DataTypes.STRING, defaultValue: 'free' }
}, {
  tableName: 'users',
  timestamps: true
});

module.exports = User;
