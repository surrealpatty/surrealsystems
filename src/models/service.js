// src/models/project.js
module.exports = (sequelize) => {
  const { DataTypes } = require("sequelize");

  const project = sequelize.define(
    "project",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

      // owner
      userId: { type: DataTypes.INTEGER, allowNull: false, field: "userId" },

      title: { type: DataTypes.STRING, allowNull: false },

      // project description
      description: { type: DataTypes.TEXT, allowNull: false },

      // what the project needs
      needs: { type: DataTypes.TEXT, allowNull: false },

      // percentage of company up for offer (0.5 to 99.5)
      equityPercentage: {
        type: DataTypes.DECIMAL(4, 1), // 99.5 fits
        allowNull: false,
        validate: { min: 0.5, max: 99.5 },
      },
    },
    {
      tableName: "projects",
      timestamps: true,
      underscored: false,
    }
  );

  return project;
};
