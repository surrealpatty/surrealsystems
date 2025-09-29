const { DataTypes } = require('sequelize');
const { sequelize } = require('./database');
const User = require('./User');

const Message = sequelize.define('Message', {
    content: { type: DataTypes.TEXT, allowNull: false }
}, { timestamps: true });

Message.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
Message.belongsTo(User, { foreignKey: 'receiverId', as: 'receiver' });

module.exports = Message;
