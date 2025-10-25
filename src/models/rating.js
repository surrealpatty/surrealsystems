// src/models/rating.js
module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');

  const Rating = sequelize.define('Rating', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    // For service ratings (nullable so rating can be user-to-user)
    serviceId: { type: DataTypes.INTEGER, allowNull: true },

    // For user-to-user ratings
    raterId: { type: DataTypes.INTEGER, allowNull: true },
    rateeId: { type: DataTypes.INTEGER, allowNull: true },

    // canonical rating value used by routes: 'stars'
    // default 1, validation 1..5
    stars: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: {
          args: [1],
          msg: 'stars must be >= 1'
        },
        max: {
          args: [5],
          msg: 'stars must be <= 5'
        }
      }
    },

    // legacy: keep score if present (optional)
    score: { type: DataTypes.INTEGER, allowNull: true },

    comment: { type: DataTypes.TEXT, allowNull: true }
  }, {
    tableName: 'ratings',
    timestamps: true
    // IMPORTANT: do NOT set underscored:true — your DB uses camelCase column names
  });

  return Rating;
};
