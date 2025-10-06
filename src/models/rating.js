// src/models/rating.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./user');

// Rating model
const Rating = sequelize.define('Rating', {
  score: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 5, // Ratings from 1 to 5
    },
  },
  comment: {
    type: DataTypes.TEXT,
    defaultValue: '',
  },
}, {
  tableName: 'ratings',
  timestamps: true,
});

// Associations
// A rating is given by one user (rater) to another user (receiver)
Rating.belongsTo(User, { as: 'rater', foreignKey: 'raterId' });
Rating.belongsTo(User, { as: 'receiver', foreignKey: 'receiverId' });

// Users can have many ratings given and received
User.hasMany(Rating, { as: 'givenRatings', foreignKey: 'raterId' });
User.hasMany(Rating, { as: 'receivedRatings', foreignKey: 'receiverId' });

module.exports = Rating;
