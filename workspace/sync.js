// src/sync.js
const sequelize = require('./config/database');
const { User } = require('./models/User');
const { Service } = require('./models/Service');

(async () => {
  try {
    await sequelize.sync({ alter: true }); // create tables if missing or update schema
    console.log('✅ All tables synced successfully');
    process.exit(0);
  } catch (err) {
    console.error('❌ Table sync failed', err);
    process.exit(1);
  }
})();
