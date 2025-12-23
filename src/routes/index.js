// models/index.js
const User = require('./user');
const project = require('./projects');
const Rating = require('./rating');

// projects
User.hasMany(project, {
  foreignKey: 'userId',
  as: 'projects',
  onDelete: 'CASCADE',
});
project.belongsTo(User, { foreignKey: 'userId', as: 'user' });

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

module.exports = { User, project, Rating };
