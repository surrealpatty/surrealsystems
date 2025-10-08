// src/models/index.js
const User = require('./user');
const Service = require('./service'); // make sure this file exists

// Setup associations
User.associate({ Service });
Service.associate = (models) => {
  Service.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
};

module.exports = { User, Service };
