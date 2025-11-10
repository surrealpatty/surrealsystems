// debug_services.js
require('dotenv').config();
const { sequelize } = require('./src/config/database');
const { QueryTypes } = require('sequelize');
const models = require('./src/models');

(async () => {
  try {
    console.log('== DEBUG: connecting to DB with sequelize ==');
    await sequelize.authenticate();
    console.log('✅ DB connected (sequelize.authenticate OK)\n');

    // Raw SQL rows
    const raw = await sequelize.query(
      'SELECT id, user_id, title, created_at FROM services ORDER BY created_at DESC LIMIT 20',
      { type: QueryTypes.SELECT },
    );
    console.log('== Raw services rows (DB columns) ==');
    console.log(JSON.stringify(raw, null, 2), '\n');

    // Query referenced user_ids
    const userIds = Array.from(new Set(raw.map((r) => r.user_id).filter(Boolean)));
    if (userIds.length) {
      const users = await sequelize.query(
        `SELECT id, username, email FROM users WHERE id IN (${userIds.join(',')})`,
        { type: QueryTypes.SELECT },
      );
      console.log('== Users referenced by services ==');
      console.log(JSON.stringify(users, null, 2), '\n');
    } else {
      console.log('No user_id values found in those service rows.\n');
    }

    // ORM query (Sequelize + association) — show owner if attached
    console.log('== ORM result: Service.findAll(...) with owner association ==');
    const orm = await models.Service.findAll({
      limit: 20,
      include: [{ model: models.User, as: 'owner', attributes: ['id', 'username'] }],
      order: [['createdAt', 'DESC']],
    });

    const ormPlain = orm.map((s) => ({
      id: s.id,
      userId: s.userId,
      title: s.title,
      createdAt: s.createdAt,
      owner: s.owner ? { id: s.owner.id, username: s.owner.username } : null,
    }));
    console.log(JSON.stringify(ormPlain, null, 2), '\n');

    console.log('== DONE ==');
    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('DEBUG ERROR:', err && err.stack ? err.stack : err);
    try {
      await sequelize.close();
    } catch (e) {}
    process.exit(1);
  }
})();
