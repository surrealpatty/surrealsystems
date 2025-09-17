const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User'); // ✅ consistent uppercase U

const Service = sequelize.define('Service', {
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  price: { type: DataTypes.FLOAT, allowNull: false },
  userId: { type: DataTypes.INTEGER, allowNull: false },
});

// Associations
User.hasMany(Service, { foreignKey: 'userId' });
Service.belongsTo(User, { foreignKey: 'userId' });

module.exports = Service;
