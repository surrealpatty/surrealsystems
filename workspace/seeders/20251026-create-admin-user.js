'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // bcrypt / bcryptjs fallback
    let bcrypt;
    try {
      bcrypt = require('bcrypt');
    } catch (e) {
      bcrypt = require('bcryptjs');
    }

    const { QueryTypes } = Sequelize;
    const now = new Date();
    const pw = 'adminpass';
    const pwHash = await bcrypt.hash(pw, 10);

    const adminEmail = 'admin@example.com';

    // check existing admin by email
    const existing = await queryInterface.sequelize.query(
      'SELECT id FROM users WHERE email = :email',
      { replacements: { email: adminEmail }, type: QueryTypes.SELECT },
    );

    if (!existing || existing.length === 0) {
      await queryInterface.bulkInsert(
        'users',
        [
          {
            username: 'admin',
            email: adminEmail,
            password: pwHash,
            description: 'Administrator account',
            tier: 'paid',
            stripecustomerid: null,
            createdAt: now,
            updatedAt: now,
          },
        ],
        {},
      );
      console.info('Seeded admin user: admin@example.com');
    } else {
      console.info('Admin user already exists, skipping insert.');
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('users', { email: 'admin@example.com' }, {});
  },
};
