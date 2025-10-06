// src/models/message.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('./database');

const Message = sequelize.define('Message', {
  senderId: { type: DataTypes.INTEGER, allowNull: false },
  receiverId: { type: DataTypes.INTEGER, allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: false },
}, { tableName: 'messages', timestamps: true });

module.exports = Message;
