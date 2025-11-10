// tests/rating.mockPaid.debug.test.js
const request = require('supertest');

let app;
const models = require('../src/models'); // real models used by the app

beforeAll(async () => {
  app = require('../src/index').app || require('../src/index');
  await models.sequelize.authenticate();
});

afterAll(async () => {
  // restore mock if left over
  if (models.Billing && models.Billing.findOne && models.Billing.findOne._isMockFunction) {
    models.Billing.findOne.mockRestore();
  }
  await models.sequelize.close();
});

describe('POST /api/ratings (mock-paid rater) - DEBUG', () => {
  test('debug registration, then mock paid and post rating', async () => {
    // 1) create two users (rater & ratee) — do NOT .expect here; capture response
    const raterRes = await request(app)
      .post('/api/users/register')
      .send({
        username: 'mock_rater_paid_debug',
        email: 'mock_rater_paid_debug@example.com',
        password: 'Password123!',
        description: 'rater',
      });

    console.log('RATER REGISTER RESPONSE:', raterRes.status, JSON.stringify(raterRes.body, null, 2));

    const rateeRes = await request(app)
      .post('/api/users/register')
      .send({
        username: 'mock_ratee_debug',
        email: 'mock_ratee_debug@example.com',
        password: 'Password123!',
        description: 'ratee',
      });

    console.log('RATEE REGISTER RESPONSE:', rateeRes.status, JSON.stringify(rateeRes.body, null, 2));

    // stop if registration failed
    if (raterRes.status >= 400) {
      throw new Error('Rater registration failed — see log above');
    }
    if (rateeRes.status >= 400) {
      throw new Error('Ratee registration failed — see log above');
    }

    // extract token and ratee id
    const token = raterRes.body.token || raterRes.body.data?.token;
    const rateeId = rateeRes.body.user?.id || rateeRes.body.data?.user?.id;

    expect(token).toBeTruthy();
    expect(rateeId).toBeTruthy();

    // 2) Mock Billing.findOne so isUserPaid returns true for our rater
    const billingFindOneMock = jest.spyOn(models.Billing, 'findOne').mockImplementation(async () => {
      return { status: 'active' };
    });

    // 3) Post rating as the rater
    const resp = await request(app)
      .post('/api/ratings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        rateeId,
        stars: 5,
        comment: 'Mock-paid rating OK',
      });

    console.log('RATE POST RESPONSE:', resp.status, JSON.stringify(resp.body, null, 2));

    expect([200, 201]).toContain(resp.status);
    expect(resp.body).toHaveProperty('rating');

    // cleanup
    billingFindOneMock.mockRestore();
  }, 30000);
});
