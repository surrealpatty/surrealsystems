"use strict";
// src/models/service.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { User } = require('./user'); // lowercase, relative to service.js
const Service = sequelize.define('Service', {
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    price: { type: DataTypes.FLOAT, allowNull: false },
});
Service.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(Service, { foreignKey: 'userId' });
module.exports = { Service };
