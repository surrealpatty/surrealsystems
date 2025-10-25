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

// Associations for messages
Message.belongsTo(User, { as: 'sender', foreignKey: 'senderId' });
Message.belongsTo(User, { as: 'receiver', foreignKey: 'receiverId' });
User.hasMany(Message, { as: 'sentMessages', foreignKey: 'senderId' });
User.hasMany(Message, { as: 'receivedMessages', foreignKey: 'receiverId' });

// Associations for services
Service.belongsTo(User, { as: 'owner', foreignKey: 'userId' });
User.hasMany(Service, { as: 'services', foreignKey: 'userId' });

// Associations for ratings
Rating.belongsTo(User, { as: 'user', foreignKey: 'userId' });
Rating.belongsTo(Service, { as: 'service', foreignKey: 'serviceId' });
Service.hasMany(Rating, { as: 'ratings', foreignKey: 'serviceId' });
User.hasMany(Rating, { as: 'ratings', foreignKey: 'userId' });

// *** NEW: Add a rater alias so routes that include "rater" succeed ***
Rating.belongsTo(User, { as: 'rater', foreignKey: 'userId' });
// (If you later add a separate rateeId column, you could add a 'ratee' association too.)

module.exports = {
  sequelize,
  User,
  Message,
  Service,
  Rating
};
