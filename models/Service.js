const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User'); // ✅ import directly, watch case sensitivity

class Service extends Model {}

Service.init(
  {
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    price: { type: DataTypes.FLOAT, allowNull: false }
  },
  { sequelize, modelName: 'Service' }
);

// ✅ Define associations directly
Service.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(Service, { foreignKey: 'userId' });

module.exports = Service;
