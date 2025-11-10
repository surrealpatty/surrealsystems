// tests/ratings.test.js
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

describe('Ratings API', () => {
  const { User } = require('../src/models');

  test('free user cannot rate; paid user can rate and update rating', async () => {
    // create ratee
    await request(app)
      .post('/api/users/register')
      .send({
        username: 'ratee',
        email: 'ratee@example.com',
        password: 'password123',
      })
      .expect(201);

    const loginRatee = await request(app)
      .post('/api/users/login')
      .send({ email: 'ratee@example.com', password: 'password123' })
      .expect(200);

    const ratee = loginRatee.body.user;

    // create rater (free)
    await request(app)
      .post('/api/users/register')
      .send({
        username: 'rater',
        email: 'rater@example.com',
        password: 'password123',
      })
      .expect(201);

    const loginRater = await request(app)
      .post('/api/users/login')
      .send({ email: 'rater@example.com', password: 'password123' })
      .expect(200);

    const rater = loginRater.body.user;
    const tokenRater = loginRater.body.token;

    // attempt to rate (should be forbidden)
    await request(app)
      .post('/api/ratings')
      .set('Authorization', `Bearer ${tokenRater}`)
      .send({ rateeId: ratee.id, stars: 5, comment: 'Great!' })
      .expect(403);

    // make rater 'paid' directly in DB
    await User.update({ tier: 'paid' }, { where: { id: rater.id } });

    // now rate -> should succeed (create)
    const create = await request(app)
      .post('/api/ratings')
      .set('Authorization', `Bearer ${tokenRater}`)
      .send({ rateeId: ratee.id, stars: 5, comment: 'Great!' })
      .expect(201);

    expect(create.body.rating).toBeDefined();
    expect(create.body.summary).toBeDefined();
    expect(create.body.summary.count).toBe(1);
    expect(Number(create.body.summary.average)).toBeCloseTo(5.0);

    // update rating (change stars)
    const update = await request(app)
      .post('/api/ratings')
      .set('Authorization', `Bearer ${tokenRater}`)
      .send({ rateeId: ratee.id, stars: 3, comment: 'Good' })
      .expect(200);

    expect(update.body.message).toMatch(/updated/i);
    expect(Number(update.body.summary.average)).toBeCloseTo(3.0);
  });
});
