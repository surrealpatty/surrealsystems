const User = require('./user');
const Service = require('./service');

// Associations
User.hasMany(Service, { as: 'services', foreignKey: 'userId' });
Service.belongsTo(User, { as: 'user', foreignKey: 'userId' });

module.exports = { User, Service };
