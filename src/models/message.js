// src/models/message.js
"use strict";

const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Message = sequelize.define(
    "Message",
    {
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      senderId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      receiverId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      serviceId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName: "Messages",
    },
  );

  Message.associate = (models) => {
    Message.belongsTo(models.User, {
      as: "sender",
      foreignKey: "senderId",
    });
    Message.belongsTo(models.User, {
      as: "receiver",
      foreignKey: "receiverId",
    });
    Message.belongsTo(models.Service, {
      as: "service",
      foreignKey: "serviceId",
    });
  };

  return Message;
};
