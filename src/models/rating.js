// models/rating.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Rating = sequelize.define('Rating', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  raterId: { type: DataTypes.INTEGER, allowNull: false },
  rateeId: { type: DataTypes.INTEGER, allowNull: false },
  stars:   { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1, max: 5 } },
  comment: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'ratings',
  indexes: [
    { unique: true, fields: ['raterId', 'rateeId'] } // one rating per rater→ratee
  ]
});

module.exports = Rating;
