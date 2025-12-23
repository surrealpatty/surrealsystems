"use strict";
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
// User model
const User = sequelize.define('User', {
    username: { type: DataTypes.STRING, allowNull: false, unique: true },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, defaultValue: '' },
    tier: { type: DataTypes.ENUM('free', 'paid'), defaultValue: 'free' }
}, { tableName: 'users', timestamps: true });
// project model
const project = sequelize.define('project', {
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    price: { type: DataTypes.FLOAT, allowNull: false }
}, { tableName: 'projects', timestamps: true });
// Associations
User.hasMany(project, { as: 'projects', foreignKey: 'userId' });
project.belongsTo(User, { as: 'user', foreignKey: 'userId' });
module.exports = { sequelize, User, project };


