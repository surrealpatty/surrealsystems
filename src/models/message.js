// src/models/message.js
// Define Message model (factory). Uses `content` as the message text column.

module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');

  const Message = sequelize.define('Message', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    senderId: { type: DataTypes.INTEGER, allowNull: false },
    receiverId: { type: DataTypes.INTEGER, allowNull: false },
    content: { type: DataTypes.TEXT, allowNull: false }
  }, {
    tableName: 'messages',
    timestamps: true
  });

  return Message;
};
