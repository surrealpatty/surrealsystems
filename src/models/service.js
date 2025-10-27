// src/models/service.js
module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');

  const Service = sequelize.define('Service', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    // Keep the JS attribute name 'userId' and map to the DB column 'userId'
    // (the DB currently uses camelCase columns).
    userId: { type: DataTypes.INTEGER, allowNull: false, field: 'userId' }, // owner

    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    price: { type: DataTypes.DECIMAL(10,2), allowNull: true }
  }, {
    tableName: 'services',
    timestamps: true,

    // IMPORTANT: override the global underscored=true so this model
    // will use the DB columns 'createdAt' / 'updatedAt' instead of
    // expecting 'created_at' / 'updated_at'.
    underscored: false
  });

  return Service;
};
