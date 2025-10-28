// tests/health.test.js
const request = require('supertest');
const { app, startServer } = require('../src/index');

beforeAll(async () => {
  // initialize DB connection and any dev-only sync; startServer does not call app.listen when imported
  await startServer();
});

afterAll(async () => {
  // Close DB connection if needed
  try {
    const { sequelize } = require('../src/config/database');
    await sequelize.close();
  } catch (e) {
    // ignore
  }
});

describe('GET /api/health', () => {
  test('returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('ok', true);
    expect(res.body).toHaveProperty('ts');
  });
});
