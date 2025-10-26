'use strict';

const bcrypt = require('bcrypt');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Change these values to suit your environment before running in production
    const email = 'admin@example.com';
    const username = 'admin';
    const rawPassword = 'AdminPass123!'; // change this to something secure before going live

    const hash = await bcrypt.hash(rawPassword, 10);
    await queryInterface.bulkInsert('users', [{
      username: username,
      email: email,
      password: hash,
      description: 'Seeded admin user (paid)',
      tier: 'paid',
      createdAt: new Date(),
      updatedAt: new Date()
    }], {});
    console.log('Seeded admin user:', email);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('users', { email: 'admin@example.com' }, {});
    console.log('Removed seeded admin user: admin@example.com');
  }
};
