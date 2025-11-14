// scripts/sync_db.js
require('dotenv').config();
const { sequelize } = require('../src/config/database');

(async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log('DB sync complete');
    process.exit(0);
  } catch (err) {
    console.error('DB sync error', err);
    process.exit(1);
  }
})();
