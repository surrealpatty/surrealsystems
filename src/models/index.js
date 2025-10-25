// src/models/index.js
const { sequelize } = require('../config/database');
const buildUser = require('./user');
const buildMessage = require('./message');
const buildService = require('./service');
const buildRating = require('./rating');

const User = buildUser(sequelize);
const Message = buildMessage(sequelize);
const Service = buildService(sequelize);
const Rating = buildRating(sequelize);

/* ---- Associations ---- */

// Messages
Message.belongsTo(User, { as: 'sender', foreignKey: 'senderId' });
Message.belongsTo(User, { as: 'receiver', foreignKey: 'receiverId' });
User.hasMany(Message, { as: 'sentMessages', foreignKey: 'senderId' });
User.hasMany(Message, { as: 'receivedMessages', foreignKey: 'receiverId' });

// Services
Service.belongsTo(User, { as: 'owner', foreignKey: 'userId' });
User.hasMany(Service, { as: 'services', foreignKey: 'userId' });

// Ratings
// Service ratings
Rating.belongsTo(Service, { as: 'service', foreignKey: 'serviceId' });
Service.hasMany(Rating, { as: 'ratings', foreignKey: 'serviceId' });

// User-to-user ratings
Rating.belongsTo(User, { as: 'rater', foreignKey: 'raterId' });
Rating.belongsTo(User, { as: 'ratee', foreignKey: 'rateeId' });

// Helpful user associations
User.hasMany(Rating, { as: 'givenRatings', foreignKey: 'raterId' });
User.hasMany(Rating, { as: 'receivedRatings', foreignKey: 'rateeId' });

module.exports = {
  sequelize,
  User,
  Message,
  Service,
  Rating
};
