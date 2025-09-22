const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

const Message = sequelize.define('Message', {
    content: { type: DataTypes.TEXT, allowNull: false }
});

// Relations
Message.belongsTo(User, { as: 'sender' });
Message.belongsTo(User, { as: 'receiver' });

module.exports = Message;
