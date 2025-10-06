// src/models/service.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Service = sequelize.define(
  'Service',
  {
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    price: { type: DataTypes.FLOAT, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: false } // link to User
  },
  { tableName: 'services', timestamps: true }
);

module.exports = Service;
