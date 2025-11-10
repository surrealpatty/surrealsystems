// src/models/rating.js
module.exports = (sequelize) => {
  const { DataTypes, Op } = require('sequelize');

  const Rating = sequelize.define(
    'Rating',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      // For service ratings (nullable so rating can be user-to-user)
      serviceId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      // For user-to-user ratings
      raterId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      rateeId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      // canonical rating: 'stars'
      stars: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: {
          min: { args: [1], msg: 'stars must be >= 1' },
          max: { args: [5], msg: 'stars must be <= 5' },
        },
      },

      // optional legacy 'score'
      score: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      comment: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: 'ratings',
      timestamps: true,
      underscored: false, // use camelCase columns: serviceId, raterId, rateeId

      // Unique rating constraint for rater -> ratee (only when rateeId is not null)
      // Use camelCase column names here as well
      indexes: [
        {
          unique: true,
          fields: ['raterId', 'rateeId'],
          where: {
            rateeId: { [Op.ne]: null },
          },
        },
      ],
    },
  );

  return Rating;
};
