// src/models/user.js
module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');

  const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    username: { type: DataTypes.STRING, allowNull: false, unique: true },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false }, // bcrypt hash
    description: { type: DataTypes.TEXT, allowNull: true },
    tier: { type: DataTypes.STRING, allowNull: false, defaultValue: 'free' }
  }, {
    tableName: 'users',
    timestamps: true
  });

  return User;
};
