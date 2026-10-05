const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { createApp } = require('../app');
const User = require('../models/User');
const { signToken } = require('../middleware/auth');

let mongod;
let app;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  app = createApp();
});
afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});
beforeEach(async () => {
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
});

let nextGithubId = 1;
// Creates a user directly (sign-in itself is covered in the oauth tests) and returns a token.
const register = async (username) => {
  const user = await User.create({ githubId: nextGithubId++, username });
  return { token: signToken(user._id), id: String(user._id) };
};
const auth = (t) => ({ Authorization: `Bearer ${t}` });

describe('health', () => {
  it('liveness and readiness', async () => {
    await request(app).get('/healthz').expect(200);
    const r = await request(app).get('/readyz').expect(200);
    expect(r.body.checks.mongo).toBe(true);
  });
});

describe('auth', () => {
  it('has no password endpoints', async () => {
    await request(app).post('/api/auth/login').send({ username: 'a', password: 'b' }).expect(404);
    await request(app).post('/api/auth/register').send({ username: 'a', password: 'b' }).expect(404);
  });

  it('/me returns the current user and rejects bad tokens', async () => {
    const a = await register('Alice');
    const me = await request(app).get('/api/auth/me').set(auth(a.token)).expect(200);
    expect(me.body.data.user.username).toBe('alice');
    await request(app).get('/api/auth/me').expect(401);
    await request(app).get('/api/auth/me').set(auth('garbage')).expect(401);
  });
});

describe('documents', () => {
  it('requires authentication', async () => {
    await request(app).get('/api/documents').expect(401);
    await request(app).post('/api/documents').send({ title: 'x' }).expect(401);
    await request(app).get('/api/documents/507f1f77bcf86cd799439011').set(auth('garbage')).expect(401);
  });

  it('enforces ownership and sharing', async () => {
    const a = await register('alice');
    const b = await register('bob');
    const create = await request(app).post('/api/documents').set(auth(a.token)).send({ title: 'Doc', content: 'hi' });
    expect(create.status).toBe(201);
    const id = create.body.data._id;

    // bob can't see it (404, not 403, so ids can't be probed)
    await request(app).get(`/api/documents/${id}`).set(auth(b.token)).expect(404);
    expect((await request(app).get('/api/documents').set(auth(b.token))).body.data).toHaveLength(0);

    // only the owner can share
    await request(app).post(`/api/documents/${id}/collaborators`).set(auth(b.token)).send({ username: 'bob' }).expect(404);
    await request(app).post(`/api/documents/${id}/collaborators`).set(auth(a.token)).send({ username: 'bob' }).expect(201);
    await request(app).post(`/api/documents/${id}/collaborators`).set(auth(a.token)).send({ username: 'ghost' }).expect(404);

    const got = await request(app).get(`/api/documents/${id}`).set(auth(b.token)).expect(200);
    expect(got.body.meta.isOwner).toBe(false);
    expect((await request(app).get('/api/documents').set(auth(b.token))).body.data).toHaveLength(1);

    // collaborators edit but cannot delete or re-share
    await request(app).patch(`/api/documents/${id}`).set(auth(b.token)).send({ content: '' }).expect(200);
    await request(app).delete(`/api/documents/${id}`).set(auth(b.token)).expect(403);

    // revoke
    await request(app).delete(`/api/documents/${id}/collaborators/${b.id}`).set(auth(a.token)).expect(204);
    await request(app).get(`/api/documents/${id}`).set(auth(b.token)).expect(404);
    await request(app).delete(`/api/documents/${id}`).set(auth(a.token)).expect(204);
  });

  it('validates input and allows clearing content', async () => {
    const a = await register('alice');
    await request(app).post('/api/documents').set(auth(a.token)).send({}).expect(400);
    await request(app).post('/api/documents').set(auth(a.token)).send({ title: 'x', language: 'cobol' }).expect(400);
    const { body } = await request(app).post('/api/documents').set(auth(a.token)).send({ title: 'x', content: 'abc' });
    const r = await request(app).patch(`/api/documents/${body.data._id}`).set(auth(a.token)).send({ content: '' });
    expect(r.body.data.content).toBe('');
    await request(app).get('/api/documents/not-an-id').set(auth(a.token)).expect(400);
  });
});

describe('misc', () => {
  it('404s unknown routes and hides internals', async () => {
    const r = await request(app).get('/api/nope').expect(404);
    expect(r.body.success).toBe(false);
    expect(r.headers['x-powered-by']).toBeUndefined();
  });
});
