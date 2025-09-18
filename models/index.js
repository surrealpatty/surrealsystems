const User = require('./User');
const Service = require('./Services');

// Associations (if not already defined in models)
Service.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(Service, { foreignKey: 'userId', as: 'services' });

module.exports = { User, Service };
