const { Sequelize, DataTypes } = require('sequelize');
const { DB_HOST, DB_NAME, DB_USER, DB_PASSWORD, DB_PORT } = process.env;

// Initialize Sequelize
const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'mysql',
  logging: false
});

// Define User model
const User = sequelize.define('User', {
  username: { type: DataTypes.STRING, allowNull: false, unique: true },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, defaultValue: '' },
  tier: { type: DataTypes.ENUM('free', 'paid'), defaultValue: 'free' }
}, { tableName: 'users', timestamps: true });

// Define Service model
const Service = sequelize.define('Service', {
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  price: { type: DataTypes.FLOAT, allowNull: false }
}, { tableName: 'services', timestamps: true });

// Associations
User.hasMany(Service, { as: 'services', foreignKey: 'userId' });
Service.belongsTo(User, { as: 'user', foreignKey: 'userId' });

module.exports = { sequelize, User, Service };
