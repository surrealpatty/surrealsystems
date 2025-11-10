// tests/rating.mockPaid.test.js
const request = require('supertest');

let app;
const models = require('../src/models');

function makeSuffix() {
  // short unique suffix: timestamp + random letters
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

beforeAll(async () => {
  app = require('../src/index').app || require('../src/index');
  await models.sequelize.authenticate();
});

afterAll(async () => {
  // restore mock if any left and close DB
  if (models.Billing && models.Billing.findOne && models.Billing.findOne._isMockFunction) {
    models.Billing.findOne.mockRestore();
  }
  await models.sequelize.close();
});

describe('POST /api/ratings (mock-paid rater)', () => {
  test('allows a rater when Billing.findOne is mocked to active', async () => {
    const s = makeSuffix();
    const raterPayload = {
      username: `mock_rater_paid_${s}`,
      email: `mock_rater_paid_${s}@example.com`,
      password: 'Password123!',
      description: 'rater',
    };
    const rateePayload = {
      username: `mock_ratee_${s}`,
      email: `mock_ratee_${s}@example.com`,
      password: 'Password123!',
      description: 'ratee',
    };

    // Register rater and ratee (expect 201 Created)
    const raterRes = await request(app).post('/api/users/register').send(raterPayload).expect(201);
    const rateeRes = await request(app).post('/api/users/register').send(rateePayload).expect(201);

    const token = raterRes.body.token || raterRes.body.data?.token;
    const rateeId = rateeRes.body.user?.id || rateeRes.body.data?.user?.id;

    expect(token).toBeTruthy();
    expect(rateeId).toBeTruthy();

    // Mock Billing.findOne so isUserPaid returns true
    const billingFindOneMock = jest.spyOn(models.Billing, 'findOne').mockImplementation(async () => {
      return { status: 'active' };
    });

    // Post rating
    const resp = await request(app)
      .post('/api/ratings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        rateeId,
        stars: 5,
        comment: 'Mock-paid rating OK',
      });

    expect([200, 201]).toContain(resp.status);
    expect(resp.body).toHaveProperty('rating');
    expect(resp.body.rating).toMatchObject({
      stars: 5,
      comment: 'Mock-paid rating OK',
    });

    billingFindOneMock.mockRestore();
  }, 20000);
});

// CHORE: small edit to trigger PR

