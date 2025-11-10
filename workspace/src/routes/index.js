// models/index.js
const User = require('./user');
const Service = require('./service');
const Rating = require('./rating');

// Services
User.hasMany(Service, {
  foreignKey: 'userId',
  as: 'services',
  onDelete: 'CASCADE',
});
Service.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Ratings
User.hasMany(Rating, {
  foreignKey: 'raterId',
  as: 'givenRatings',
  onDelete: 'CASCADE',
});
User.hasMany(Rating, {
  foreignKey: 'rateeId',
  as: 'receivedRatings',
  onDelete: 'CASCADE',
});
Rating.belongsTo(User, { foreignKey: 'raterId', as: 'rater' });
Rating.belongsTo(User, { foreignKey: 'rateeId', as: 'ratee' });

module.exports = { User, Service, Rating };
