// src/models/rating.js
module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');

  const Rating = sequelize.define('Rating', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'id'
    },

    // For service ratings (nullable so rating can be user-to-user)
    serviceId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'service_id'
    },

    // For user-to-user ratings
    raterId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'rater_id'
    },
    rateeId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'ratee_id'
    },

    // canonical rating: 'stars' (DB column is 'stars')
    stars: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      field: 'stars',
      validate: {
        min: { args: [1], msg: 'stars must be >= 1' },
        max: { args: [5], msg: 'stars must be <= 5' }
      }
    },

    // optional legacy 'score'
    score: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'score'
    },

    comment: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'comment'
    }
  }, {
    tableName: 'ratings',
    timestamps: true
    // Note: we explicitly map the fields above so we don't rely on underscored:true
  });

  return Rating;
};
