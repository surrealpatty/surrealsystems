// tests/messages.test.js
const request = require('supertest');
const { getApp, sequelize } = require('./testUtils');

let app;

beforeAll(async () => {
  app = await getApp();
});

beforeEach(async () => {
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});

describe('Messages API', () => {
  let tokenA, tokenB, userA, userB;

  beforeEach(async () => {
    // Create user A
    await request(app)
      .post('/api/users/register')
      .send({
        username: 'alice',
        email: 'alice@example.com',
        password: 'password123',
      })
      .expect(201);

    const loginA = await request(app)
      .post('/api/users/login')
      .send({ email: 'alice@example.com', password: 'password123' })
      .expect(200);

    tokenA = loginA.body.token;
    userA = loginA.body.user;

    // Create user B
    await request(app)
      .post('/api/users/register')
      .send({
        username: 'bob',
        email: 'bob@example.com',
        password: 'password123',
      })
      .expect(201);

    const loginB = await request(app)
      .post('/api/users/login')
      .send({ email: 'bob@example.com', password: 'password123' })
      .expect(200);

    tokenB = loginB.body.token;
    userB = loginB.body.user;
  });

  test('send message and fetch inbox/thread', async () => {
    // A -> B
    const send = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ to: userB.id, content: 'Hello Bob!' })
      .expect(201);

    expect(send.body.message).toBeDefined();
    expect(send.body.message.content).toBe('Hello Bob!');

    // B inbox
    const inbox = await request(app)
      .get('/api/messages/inbox')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);

    const messages = inbox.body.messages || [];
    expect(messages.length).toBeGreaterThanOrEqual(1);
    expect(messages[0].content).toBe('Hello Bob!');

    // Thread B <-> A
    const thread = await request(app)
      .get(`/api/messages/thread/${userA.id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);

    expect(Array.isArray(thread.body.messages)).toBeTruthy();
    expect(thread.body.messages.find((m) => m.content === 'Hello Bob!')).toBeTruthy();
  });
});
