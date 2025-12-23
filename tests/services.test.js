// tests/projects.test.js
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

describe('projects API', () => {
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

  test('create, list, get, update, delete project', async () => {
    // create
    const create = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Test project',
        description: 'Do the thing',
        price: '12.50',
      })
      .expect(201);

    const svc = create.body.project;
    expect(svc).toBeDefined();
    expect(svc.title).toBe('Test project');

    const projectId = svc.id;

    // list (by user)
    const list = await request(app).get(`/api/projects?userId=${userId}`).expect(200);

    expect(Array.isArray(list.body.projects || list.body.data?.projects)).toBeTruthy();
    const projectsList = list.body.projects || list.body.data?.projects || [];
    expect(projectsList.find((s) => Number(s.id) === Number(projectId))).toBeTruthy();

    // get by id
    const get = await request(app).get(`/api/projects/${projectId}`).expect(200);
    expect(get.body.project || get.body.data?.project).toBeDefined();

    // update
    const newTitle = 'Updated Title';
    const upd = await request(app)
      .put(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: newTitle })
      .expect(200);

    const updated = upd.body.project || upd.body.data?.project;
    expect(updated.title).toBe(newTitle);

    // delete
    await request(app)
      .delete(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // ensure gone
    await request(app).get(`/api/projects/${projectId}`).expect(404);
  });
});
