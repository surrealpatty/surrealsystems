'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('ratings', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      service_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'services', key: 'id' },
        onDelete: 'SET NULL',
      },
      rater_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      ratee_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      stars: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      score: { type: Sequelize.INTEGER, allowNull: true },
      comment: { type: Sequelize.TEXT, allowNull: true },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    await queryInterface.addIndex('ratings', ['rater_id', 'ratee_id'], {
      unique: true,
      name: 'ratings_unique_rater_ratee',
      where: {
        ratee_id: { [Sequelize.Op.ne]: null },
      },
    });

    await queryInterface.sequelize.query(`
      ALTER TABLE "ratings"
      ADD CONSTRAINT ratings_stars_check CHECK ("stars" >= 1 AND "stars" <= 5)
    `);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('ratings');
  },
};
