// tests/testUtils.js
// Helper to start the app and expose sequelize for tests.

process.env.JWT_SECRETS = process.env.JWT_SECRETS || 'testsecret';
process.env.NODE_ENV = process.env.NODE_ENV || 'test';

const { startServer } = require('../src/index');
const { sequelize } = require('../src/config/database');

let appInstance = null;

async function getApp() {
  if (!appInstance) {
    // startServer initializes DB/auth and returns the express app
    appInstance = await startServer();
    // ensure a clean schema for the first use
    await sequelize.sync({ force: true });
  }
  return appInstance;
}

module.exports = { getApp, sequelize };
