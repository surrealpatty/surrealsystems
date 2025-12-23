// src/models/index.js
const { sequelize } = require('../config/database');
const buildUser = require('./user');
const buildMessage = require('./message');
const buildproject = require('./project');
const buildRating = require('./rating');
const buildBilling = require('./billing'); // <- new

const User = buildUser(sequelize);
const Message = buildMessage(sequelize);
const project = buildproject(sequelize);
const Rating = buildRating(sequelize);
const Billing = buildBilling(sequelize); // <- new

/* ---- Associations ---- */

// Messages
Message.belongsTo(User, { as: 'sender', foreignKey: 'senderId' });
Message.belongsTo(User, { as: 'receiver', foreignKey: 'receiverId' });
User.hasMany(Message, { as: 'sentMessages', foreignKey: 'senderId' });
User.hasMany(Message, { as: 'receivedMessages', foreignKey: 'receiverId' });

// projects
project.belongsTo(User, { as: 'owner', foreignKey: 'userId' });
User.hasMany(project, { as: 'projects', foreignKey: 'userId' });

// Ratings — project ratings (nullable)
Rating.belongsTo(project, { as: 'project', foreignKey: 'projectId' });
project.hasMany(Rating, { as: 'ratings', foreignKey: 'projectId' });

// Ratings — user-to-user
Rating.belongsTo(User, { as: 'rater', foreignKey: 'raterId' });
Rating.belongsTo(User, { as: 'ratee', foreignKey: 'rateeId' });
User.hasMany(Rating, { as: 'givenRatings', foreignKey: 'raterId' });
User.hasMany(Rating, { as: 'receivedRatings', foreignKey: 'rateeId' });

// Billing associations (new)
Billing.belongsTo(User, { as: 'user', foreignKey: 'userId' });
User.hasMany(Billing, { as: 'billings', foreignKey: 'userId' });

module.exports = {
  sequelize,
  User,
  Message,
  project,
  Rating,
  Billing, // <- export Billing
};
