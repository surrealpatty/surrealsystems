// src/models/user.js
module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');

  const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    username: { type: DataTypes.STRING, allowNull: false, unique: true },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false }, // bcrypt hash
    description: { type: DataTypes.TEXT, allowNull: true },
    tier: { type: DataTypes.STRING, allowNull: false, defaultValue: 'free' },

    // Map the JS attribute stripeCustomerId to the existing lower-case DB column `stripecustomerid`
    stripeCustomerId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'stripecustomerid'
    }

  }, {
    tableName: 'users',
    timestamps: true,
    underscored: false // Use createdAt/updatedAt to match existing DB column names
  });

  return User;
};
