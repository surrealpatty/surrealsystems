const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database'); // ✅ correct named import

const User = sequelize.define('User', {
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        defaultValue: ''
    }
}, {
    tableName: 'users',
    timestamps: true
});

module.exports = User;
