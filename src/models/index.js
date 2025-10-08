// src/models/index.js
const User = require('./user');
const Service = require('./service');

// Setup associations
User.hasMany(Service, { foreignKey: 'userId', as: 'services', onDelete: 'CASCADE' });
Service.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = { User, Service };
