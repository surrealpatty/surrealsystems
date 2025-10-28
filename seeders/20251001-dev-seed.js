'use strict';

const bcrypt = require('bcrypt');

module.exports = {
  async up(queryInterface /* , Sequelize */) {
    const now = new Date();

    // Insert a dev user (id = 1 expected)
    const passwordHash = bcrypt.hashSync('password123', 10);

    await queryInterface.bulkInsert('users', [
      {
        username: 'devuser',
        email: 'devuser@example.com',
        password: passwordHash,
        description: 'Dev user for local testing',
        tier: 'paid', // give paid so you can test paid-only flows
        stripecustomerid: null,
        createdAt: now,
        updatedAt: now
      }
    ], {});

    // Insert a sample service owned by the dev user (assumes user id = 1)
    await queryInterface.bulkInsert('services', [
      {
        userId: 1,
        title: 'Dev Sample Service',
        description: 'A sample service for local testing.',
        price: '25.00',
        createdAt: now,
        updatedAt: now
      }
    ], {});
  },

  async down(queryInterface /* , Sequelize */) {
    await queryInterface.bulkDelete('services', { title: 'Dev Sample Service' }, {});
    await queryInterface.bulkDelete('users', { email: 'devuser@example.com' }, {});
  }
};
