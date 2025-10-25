// src/models/rating.js
module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');

  const Rating = sequelize.define('Rating', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    serviceId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    score: { type: DataTypes.INTEGER, allowNull: false }, // e.g. 1-5
    comment: { type: DataTypes.TEXT, allowNull: true }
  }, {
    tableName: 'ratings',
    timestamps: true
  });

  return Rating;
};
