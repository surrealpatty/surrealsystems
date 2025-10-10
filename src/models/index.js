const User = require('./user');
const Service = require('./service');

// ✅ Define associations here ONLY
User.hasMany(Service, { foreignKey: 'userId', as: 'services', onDelete: 'CASCADE' });
Service.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = { User, Service };
