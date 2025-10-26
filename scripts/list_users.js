/*
  scripts/list_users.js
  Lists last 10 users (id, username, email, tier, createdAt)
*/
require('dotenv').config();
const models = require('../src/models'); // adjust path if your models are elsewhere
const { User } = models;

(async () => {
  try {
    const rows = await User.findAll({
      attributes: ['id','username','email','tier','createdAt'],
      order: [['id','DESC']],
      limit: 10
    });
    console.log(rows.map(r => r.get({ plain: true })));
    process.exit(0);
  } catch (e) {
    console.error('Error listing users:', e);
    process.exit(1);
  }
})();
