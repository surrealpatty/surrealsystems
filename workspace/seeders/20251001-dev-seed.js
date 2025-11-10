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
    const { QueryTypes, Op } = Sequelize;
    const now = new Date();
    const pw = 'devpass';
    const pwHash = await bcrypt.hash(pw, 10);

    // USERS
    const usersToEnsure = [
      {
        username: 'devuser',
        email: 'devuser@example.com',
        password: pwHash,
        description: 'Developer account',
        tier: 'free',
        stripecustomerid: null,
        createdAt: now,
        updatedAt: now,
      },
      {
        username: 'svcuser',
        email: 'svcuser@example.com',
        password: pwHash,
        description: 'Service owner for samples',
        tier: 'free',
        stripecustomerid: null,
        createdAt: now,
        updatedAt: now,
      },
    ];

    const emails = usersToEnsure.map((u) => u.email);
    const existingUsers = await queryInterface.sequelize.query(
      'SELECT email FROM users WHERE email IN (:emails)',
      { replacements: { emails }, type: QueryTypes.SELECT },
    );
    const existingEmails = new Set(existingUsers.map((r) => r.email));
    const usersToInsert = usersToEnsure.filter((u) => !existingEmails.has(u.email));
    if (usersToInsert.length) await queryInterface.bulkInsert('users', usersToInsert, {});

    // map emails -> ids
    const usersRows = await queryInterface.sequelize.query(
      'SELECT id, email FROM users WHERE email IN (:emails)',
      { replacements: { emails }, type: QueryTypes.SELECT },
    );
    const idByEmail = {};
    usersRows.forEach((r) => (idByEmail[r.email] = r.id));

    // SERVICES (ensure a sample service owned by svcuser)
    const svcUserId = idByEmail['svcuser@example.com'];
    if (svcUserId) {
      const servicesToEnsure = [
        {
          userId: svcUserId,
          title: 'Dev Sample Service',
          description: 'A small sample service for development/testing',
          price: '25.00',
          createdAt: now,
          updatedAt: now,
        },
      ];

      const titles = servicesToEnsure.map((s) => s.title);
      const existingServices = await queryInterface.sequelize.query(
        'SELECT title, "userId" FROM services WHERE title IN (:titles)',
        { replacements: { titles }, type: QueryTypes.SELECT },
      );
      const existingKey = new Set(existingServices.map((r) => `${r.title}::${r.userId}`));
      const servicesToInsert = servicesToEnsure.filter(
        (s) => !existingKey.has(`${s.title}::${s.userId}`),
      );
      if (servicesToInsert.length) {
        await queryInterface.bulkInsert('services', servicesToInsert, {});
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    const Op = Sequelize.Op;
    await queryInterface.bulkDelete('services', { title: 'Dev Sample Service' }, {});
    await queryInterface.bulkDelete(
      'users',
      { email: { [Op.in]: ['devuser@example.com', 'svcuser@example.com'] } },
      {},
    );
  },
};
