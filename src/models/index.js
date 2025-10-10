const User = require('./user');
const Service = require('./service');

// Associations
User.hasMany(Service, { foreignKey: 'userId', as: 'services', onDelete: 'CASCADE' });
Service.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = { User, Service };
