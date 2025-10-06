const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Rating = sequelize.define(
  'Rating',
  {
    score: { type: DataTypes.INTEGER, allowNull: false },
    comment: { type: DataTypes.TEXT, allowNull: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },    // who is being rated
    serviceId: { type: DataTypes.INTEGER, allowNull: false }, // which service
  },
  { tableName: 'ratings', timestamps: true }
);

module.exports = Rating;
