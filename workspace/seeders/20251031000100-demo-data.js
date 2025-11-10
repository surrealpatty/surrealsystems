'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Use bcrypt if available, otherwise bcryptjs (avoids native build issues in CI)
    let bcrypt;
    try {
      bcrypt = require('bcrypt');
    } catch (e) {
      bcrypt = require('bcryptjs');
    }
    const { QueryTypes, Op } = Sequelize;

    const now = new Date();
    const pw = 'password123';
    const pwHash = await bcrypt.hash(pw, 10);

    // USERS
    const usersToEnsure = [
      {
        username: 'alice',
        email: 'alice@example.com',
        password: pwHash,
        description: 'Alice — frontend reviewer',
        tier: 'free',
        stripecustomerid: null,
        createdAt: now,
        updatedAt: now,
      },
      {
        username: 'bob',
        email: 'bob@example.com',
        password: pwHash,
        description: 'Bob — full-stack freelancer',
        tier: 'paid',
        stripecustomerid: null,
        createdAt: now,
        updatedAt: now,
      },
      {
        username: 'carol',
        email: 'carol@example.com',
        password: pwHash,
        description: 'Carol — early tester',
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
    if (usersToInsert.length) {
      await queryInterface.bulkInsert('users', usersToInsert, {});
    }

    // map emails -> ids
    const usersRows = await queryInterface.sequelize.query(
      'SELECT id, email, username FROM users WHERE email IN (:emails)',
      { replacements: { emails }, type: QueryTypes.SELECT },
    );
    const idByEmail = {};
    usersRows.forEach((r) => (idByEmail[r.email] = r.id));

    // SERVICES (idempotent by title + user)
    const servicesToEnsure = [
      {
        userId: idByEmail['bob@example.com'],
        title: 'Fix bugs',
        description: 'I will fix the bugs in your Node/Express app.',
        price: '49.99',
        createdAt: now,
        updatedAt: now,
      },
      {
        userId: idByEmail['bob@example.com'],
        title: 'Build REST API',
        description: 'I will build a REST API with proper tests and docs.',
        price: '200.00',
        createdAt: now,
        updatedAt: now,
      },
      {
        userId: idByEmail['alice@example.com'],
        title: 'Frontend review',
        description: 'Detailed UX and accessibility review.',
        price: '75.00',
        createdAt: now,
        updatedAt: now,
      },
    ];

    const serviceTitles = servicesToEnsure.map((s) => s.title);
    const existingServices = await queryInterface.sequelize.query(
      'SELECT title, "userId" FROM services WHERE title IN (:titles)',
      { replacements: { titles: serviceTitles }, type: QueryTypes.SELECT },
    );
    const existingKey = new Set(existingServices.map((r) => `${r.title}::${r.userId}`));
    const servicesToInsertFinal = servicesToEnsure.filter(
      (s) => !existingKey.has(`${s.title}::${s.userId}`),
    );
    if (servicesToInsertFinal.length) {
      await queryInterface.bulkInsert('services', servicesToInsertFinal, {});
    }

    // BILLINGS - ensure Bob has one (idempotent)
    const bobId = idByEmail['bob@example.com'];
    if (bobId) {
      const existingBilling = await queryInterface.sequelize.query(
        'SELECT id FROM billings WHERE "userId" = :bobId LIMIT 1',
        { replacements: { bobId }, type: QueryTypes.SELECT },
      );

      if (!existingBilling || existingBilling.length === 0) {
        await queryInterface.bulkInsert(
          'billings',
          [
            {
              userId: bobId,
              stripeCustomerId: 'cus_demo_bob',
              stripeSubscriptionId: 'sub_demo_bob',
              status: 'active',
              priceId: 'price_demo',
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              createdAt: now,
              updatedAt: now,
            },
          ],
          {},
        );
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    const Op = Sequelize.Op;

    // Remove demo billings, services, users (safe selective deletion)
    await queryInterface.bulkDelete('billings', { stripeCustomerId: 'cus_demo_bob' }, {});
    await queryInterface.bulkDelete(
      'services',
      { title: { [Op.in]: ['Fix bugs', 'Build REST API', 'Frontend review'] } },
      {},
    );
    await queryInterface.bulkDelete(
      'users',
      { email: { [Op.in]: ['alice@example.com', 'bob@example.com', 'carol@example.com'] } },
      {},
    );
  },
};
