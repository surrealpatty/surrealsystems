// src/models/rating.js
module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');

  const Rating = sequelize.define('Rating', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    // For service ratings
    serviceId: { type: DataTypes.INTEGER, allowNull: true },

    // For user-to-user ratings
    raterId: { type: DataTypes.INTEGER, allowNull: true },
    rateeId: { type: DataTypes.INTEGER, allowNull: true },

    // canonical rating value used by routes: 'stars'
    stars: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },

    // legacy: keep score if present (optional)
    score: { type: DataTypes.INTEGER, allowNull: true },

    comment: { type: DataTypes.TEXT, allowNull: true }
  }, {
    tableName: 'ratings',
    timestamps: true,
    underscored: true // helpful if DB uses snake_case
  });

  return Rating;
};
