// src/models/index.js
// Central model registry and association setup.

const { sequelize } = require('../config/database');
const buildUser = require('./user');
const buildMessage = require('./message');

const User = buildUser(sequelize);
const Message = buildMessage(sequelize);

// Associations
Message.belongsTo(User, { as: 'sender', foreignKey: 'senderId' });
Message.belongsTo(User, { as: 'receiver', foreignKey: 'receiverId' });

User.hasMany(Message, { as: 'sentMessages', foreignKey: 'senderId' });
User.hasMany(Message, { as: 'receivedMessages', foreignKey: 'receiverId' });

// Export the sequelize instance and models
module.exports = { sequelize, User, Message };
