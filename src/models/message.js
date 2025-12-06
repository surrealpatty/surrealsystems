// src/models/message.js
module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');

  const Message = sequelize.define(
    'Message',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

      // sender / receiver
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

      // Optional subject – e.g. title of the ad / service this message is about
      subject: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'subject',
      },

      content: { type: DataTypes.TEXT, allowNull: false },
    },
    {
      tableName: 'messages',
      timestamps: true,
      underscored: false, // createdAt / updatedAt
    },
  );

  // If your models/index.js calls associate, this will wire up relations.
  Message.associate = (models) => {
    // sender / receiver associations (already used by includes with "as")
    Message.belongsTo(models.User, {
      as: 'sender',
      foreignKey: 'senderId',
    });
    Message.belongsTo(models.User, {
      as: 'receiver',
      foreignKey: 'receiverId',
    });

    // If later you add a Service FK, you can also do:
    // Message.belongsTo(models.Service, {
    //   as: 'service',
    //   foreignKey: 'serviceId',
    // });
  };

  return Message;
};
