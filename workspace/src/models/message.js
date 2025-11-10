// src/models/message.js
module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');

  const Message = sequelize.define(
    'Message',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

      // Use camelCase column names (senderId / receiverId) to match the DB
      senderId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'senderId',
      },
      receiverId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'receiverId',
      },

      content: { type: DataTypes.TEXT, allowNull: false },
    },
    {
      tableName: 'messages',
      timestamps: true,
      underscored: false, // ensure createdAt/updatedAt are used (camelCase)
    },
  );

  return Message;
};
