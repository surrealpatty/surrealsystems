// src/models/service.js
module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');

  const Service = sequelize.define('Service', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    // explicit DB column mapping (safety in case global define isn't applied for some reason)
    userId: { type: DataTypes.INTEGER, allowNull: false, field: 'user_id' }, // owner
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    price: { type: DataTypes.DECIMAL(10,2), allowNull: true }
  }, {
    tableName: 'services',
    timestamps: true,
    // underscored true helps map createdAt->created_at etc. This is redundant if you added global define,
    // but harmless and explicit:
    underscored: true
  });

  return Service;
};
