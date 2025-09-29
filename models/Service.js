const { DataTypes } = require('sequelize');
const { sequelize } = require('../models/database');
const { User } = require('./User'); // ✅ make sure the path is correct

const Service = sequelize.define('Service', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  price: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  }
}, {
  tableName: 'services',
  timestamps: true
});

// Association
Service.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(Service, { foreignKey: 'userId', as: 'services' });

module.exports = { Service };
