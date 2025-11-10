// tests/services.test.js
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

describe('Services API', () => {
  let token;
  let userId;

  beforeEach(async () => {
    // create a user and get token
    const username = 'svcuser';
    const email = 'svcuser@example.com';
    const password = 'password123';

    await request(app).post('/api/users/register').send({ username, email, password }).expect(201);

    const login = await request(app).post('/api/users/login').send({ email, password }).expect(200);

    token = login.body.token;
    userId = login.body.user?.id;
  });

  test('create, list, get, update, delete service', async () => {
    // create
    const create = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Test Service',
        description: 'Do the thing',
        price: '12.50',
      })
      .expect(201);

    const svc = create.body.service;
    expect(svc).toBeDefined();
    expect(svc.title).toBe('Test Service');

    const serviceId = svc.id;

    // list (by user)
    const list = await request(app).get(`/api/services?userId=${userId}`).expect(200);

    expect(Array.isArray(list.body.services || list.body.data?.services)).toBeTruthy();
    const servicesList = list.body.services || list.body.data?.services || [];
    expect(servicesList.find((s) => Number(s.id) === Number(serviceId))).toBeTruthy();

    // get by id
    const get = await request(app).get(`/api/services/${serviceId}`).expect(200);
    expect(get.body.service || get.body.data?.service).toBeDefined();

    // update
    const newTitle = 'Updated Title';
    const upd = await request(app)
      .put(`/api/services/${serviceId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: newTitle })
      .expect(200);

    const updated = upd.body.service || upd.body.data?.service;
    expect(updated.title).toBe(newTitle);

    // delete
    await request(app)
      .delete(`/api/services/${serviceId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // ensure gone
    await request(app).get(`/api/services/${serviceId}`).expect(404);
  });
});
