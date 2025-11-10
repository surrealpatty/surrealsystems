// src/models/index.js
const { sequelize } = require('../config/database');
const buildUser = require('./user');
const buildMessage = require('./message');
const buildService = require('./service');
const buildRating = require('./rating');
const buildBilling = require('./billing'); // <- new

const User = buildUser(sequelize);
const Message = buildMessage(sequelize);
const Service = buildService(sequelize);
const Rating = buildRating(sequelize);
const Billing = buildBilling(sequelize); // <- new

/* ---- Associations ---- */

// Messages
Message.belongsTo(User, { as: 'sender', foreignKey: 'senderId' });
Message.belongsTo(User, { as: 'receiver', foreignKey: 'receiverId' });
User.hasMany(Message, { as: 'sentMessages', foreignKey: 'senderId' });
User.hasMany(Message, { as: 'receivedMessages', foreignKey: 'receiverId' });

// Services
Service.belongsTo(User, { as: 'owner', foreignKey: 'userId' });
User.hasMany(Service, { as: 'services', foreignKey: 'userId' });

// Ratings — service ratings (nullable)
Rating.belongsTo(Service, { as: 'service', foreignKey: 'serviceId' });
Service.hasMany(Rating, { as: 'ratings', foreignKey: 'serviceId' });

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
  Service,
  Rating,
  Billing, // <- export Billing
};
