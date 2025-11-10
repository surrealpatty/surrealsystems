// tests/users.test.js
const request = require('supertest');
const { getApp, sequelize } = require('./testUtils');

let app;

beforeAll(async () => {
  app = await getApp();
});

beforeEach(async () => {
  // reset DB for deterministic suites
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});

describe('Users API', () => {
  test('register -> login -> /me', async () => {
    const username = 'testuser';
    const email = 'testuser@example.com';
    const password = 'password123';

    // register
    const reg = await request(app)
      .post('/api/users/register')
      .send({ username, email, password })
      .expect(201);

    expect(reg.body.token).toBeDefined();
    expect(reg.body.user).toBeDefined();
    expect(reg.body.user.email).toBe(email);

    // login
    const login = await request(app).post('/api/users/login').send({ email, password }).expect(200);

    expect(login.body.token).toBeDefined();
    const token = login.body.token;

    // /me
    const me = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(me.body.user).toBeDefined();
    expect(me.body.user.email).toBe(email);
    expect(me.body.user.username).toBe(username);
  });
});
