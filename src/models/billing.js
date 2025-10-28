// src/models/billing.js
module.exports = (sequelize) => {
  const { DataTypes, Op } = require('sequelize');

  const Billing = sequelize.define('Billing', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    userId: { type: DataTypes.INTEGER, allowNull: false },

    stripeCustomerId: { type: DataTypes.STRING, allowNull: false },
    stripeSubscriptionId: { type: DataTypes.STRING, allowNull: true },

    status: { type: DataTypes.STRING, allowNull: false }, // active, past_due, canceled, trialing, etc.

    priceId: { type: DataTypes.STRING, allowNull: true },

    currentPeriodEnd: { type: DataTypes.DATE, allowNull: true }
  }, {
    tableName: 'billings',
    timestamps: true,
    underscored: false
  });

  return Billing;
};
