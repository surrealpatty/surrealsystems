// src/models/service.js
module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');

  const Service = sequelize.define('Service', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false }, // owner
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    price: { type: DataTypes.DECIMAL(10,2), allowNull: true }
  }, {
    tableName: 'services',
    timestamps: true
  });

  return Service;
};
