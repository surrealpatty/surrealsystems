// src/models/rating.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('./database');

const Rating = sequelize.define('Rating', {
  score: { type: DataTypes.INTEGER, allowNull: false },
  comment: { type: DataTypes.TEXT, allowNull: true },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  serviceId: { type: DataTypes.INTEGER, allowNull: false },
}, { tableName: 'ratings', timestamps: true });

module.exports = Rating;
