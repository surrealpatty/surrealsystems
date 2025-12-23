"use strict";
// src/models/project.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { User } = require('./user'); // lowercase, relative to project.js
const project = sequelize.define('project', {
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    price: { type: DataTypes.FLOAT, allowNull: false },
});
project.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(project, { foreignKey: 'userId' });
module.exports = { project };


