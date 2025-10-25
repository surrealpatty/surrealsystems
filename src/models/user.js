// src/models/user.js
// Define User model (factory). Keep lightweight — add fields your app requires.

module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');

  const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    username: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false },
    // optional fields:
    // passwordHash: { type: DataTypes.STRING },
  }, {
    tableName: 'users',
    timestamps: true
  });

  return User;
};
