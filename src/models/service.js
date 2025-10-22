// src/models/service.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Service = sequelize.define('Service', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
  price: { type: DataTypes.DECIMAL(10,2), allowNull: false, defaultValue: 0 },
  userId: { type: DataTypes.INTEGER, allowNull: false },
}, {
  tableName: 'services',
  timestamps: true,
  indexes: [
    { fields: ['userId', 'createdAt'] }, // <— add this
  ],
});

module.exports = Service;
