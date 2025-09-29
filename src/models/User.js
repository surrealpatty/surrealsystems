const { DataTypes } = require('sequelize');
const sequelize = require('../config/database'); // ✅ Import the Sequelize instance correctly

// Define the User model
const User = sequelize.define('User', {
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    defaultValue: ''
  },
  tier: {
    type: DataTypes.ENUM('free', 'paid'),
    defaultValue: 'free'
  }
}, {
  tableName: 'users',      // Optional: explicitly name the table
  timestamps: true         // Adds createdAt and updatedAt
});

module.exports = { User };
