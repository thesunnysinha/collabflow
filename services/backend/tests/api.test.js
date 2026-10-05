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
    const live = await request(app).get('/api/v1/health').expect(200);
    expect(live.body).toMatchObject({ success: true, code: 'OK', data: { status: 'ok' } });
    const r = await request(app).get('/api/v1/ready').expect(200);
    expect(r.body.data.checks.mongo).toBe(true);
  });

  it('readiness reports 503 with a NOT_READY envelope when a dependency is down', async () => {
    const down = createApp({ ready: () => ({ kafkaProducer: false }) });
    const r = await request(down).get('/api/v1/ready').expect(503);
    expect(r.body).toMatchObject({ success: false, code: 'NOT_READY', data: null });
    expect(r.body.meta.checks.kafkaProducer).toBe(false);
  });
});

describe('auth', () => {
  it('has no password endpoints', async () => {
    await request(app).post('/api/v1/auth/login').send({ username: 'a', password: 'b' }).expect(404);
    await request(app).post('/api/v1/auth/register').send({ username: 'a', password: 'b' }).expect(404);
  });

  it('/me returns the current user and rejects bad tokens', async () => {
    const a = await register('Alice');
    const me = await request(app).get('/api/v1/auth/me').set(auth(a.token)).expect(200);
    expect(me.body.data.user.username).toBe('alice');
    await request(app).get('/api/v1/auth/me').expect(401);
    await request(app).get('/api/v1/auth/me').set(auth('garbage')).expect(401);
  });
});

describe('documents', () => {
  it('requires authentication', async () => {
    await request(app).get('/api/v1/documents').expect(401);
    await request(app).post('/api/v1/documents').send({ title: 'x' }).expect(401);
    await request(app).get('/api/v1/documents/507f1f77bcf86cd799439011').set(auth('garbage')).expect(401);
  });

  it('enforces ownership and sharing', async () => {
    const a = await register('alice');
    const b = await register('bob');
    const create = await request(app).post('/api/v1/documents').set(auth(a.token)).send({ title: 'Doc', content: 'hi' });
    expect(create.status).toBe(201);
    const id = create.body.data._id;

    // bob can't see it (404, not 403, so ids can't be probed)
    await request(app).get(`/api/v1/documents/${id}`).set(auth(b.token)).expect(404);
    expect((await request(app).get('/api/v1/documents').set(auth(b.token))).body.data).toHaveLength(0);

    // only the owner can share
    await request(app).post(`/api/v1/documents/${id}/collaborators`).set(auth(b.token)).send({ username: 'bob' }).expect(404);
    await request(app).post(`/api/v1/documents/${id}/collaborators`).set(auth(a.token)).send({ username: 'bob' }).expect(201);
    await request(app).post(`/api/v1/documents/${id}/collaborators`).set(auth(a.token)).send({ username: 'ghost' }).expect(404);

    const got = await request(app).get(`/api/v1/documents/${id}`).set(auth(b.token)).expect(200);
    expect(got.body.meta.isOwner).toBe(false);
    expect((await request(app).get('/api/v1/documents').set(auth(b.token))).body.data).toHaveLength(1);

    // collaborators edit but cannot delete or re-share
    await request(app).patch(`/api/v1/documents/${id}`).set(auth(b.token)).send({ content: '' }).expect(200);
    await request(app).delete(`/api/v1/documents/${id}`).set(auth(b.token)).expect(403);

    // revoke
    await request(app).delete(`/api/v1/documents/${id}/collaborators/${b.id}`).set(auth(a.token)).expect(204);
    await request(app).get(`/api/v1/documents/${id}`).set(auth(b.token)).expect(404);
    await request(app).delete(`/api/v1/documents/${id}`).set(auth(a.token)).expect(204);
  });

  it('validates input and allows clearing content', async () => {
    const a = await register('alice');
    await request(app).post('/api/v1/documents').set(auth(a.token)).send({}).expect(422);
    await request(app).post('/api/v1/documents').set(auth(a.token)).send({ title: 'x', language: 'cobol' }).expect(422);
    const { body } = await request(app).post('/api/v1/documents').set(auth(a.token)).send({ title: 'x', content: 'abc' });
    const r = await request(app).patch(`/api/v1/documents/${body.data._id}`).set(auth(a.token)).send({ content: '' });
    expect(r.body.data.content).toBe('');
    await request(app).get('/api/v1/documents/not-an-id').set(auth(a.token)).expect(422);
  });
});

describe('misc', () => {
  it('404s unknown routes and hides internals', async () => {
    const r = await request(app).get('/api/v1/nope').expect(404);
    expect(r.body).toMatchObject({ success: false, code: 'NOT_FOUND', data: null });
    expect(r.headers['x-powered-by']).toBeUndefined();
  });

  it('uses the shared envelope with a trace id that matches X-Request-ID', async () => {
    const r = await request(app).get('/api/v1/documents');
    expect(r.status).toBe(401);
    expect(r.body).toMatchObject({ success: false, code: 'UNAUTHORIZED', data: null, meta: {} });
    expect(r.body.trace_id).toBe(r.headers['x-request-id']);

    const echoed = await request(app).get('/api/v1/documents').set('X-Request-ID', 'abc-123');
    expect(echoed.headers['x-request-id']).toBe('abc-123');
    expect(echoed.body.trace_id).toBe('abc-123');

    // Unsafe ids are replaced, not echoed.
    const bad = await request(app).get('/api/v1/documents').set('X-Request-ID', 'a b<script>');
    expect(bad.headers['x-request-id']).not.toBe('a b<script>');
  });

  it('returns field details for validation errors', async () => {
    const a = await register('alice');
    const r = await request(app).post('/api/v1/documents').set(auth(a.token)).send({ title: '' }).expect(422);
    expect(r.body.code).toBe('VALIDATION_ERROR');
    expect(r.body.meta.details[0]).toMatchObject({ field: 'title' });
  });

  it('rejects malformed JSON with 400', async () => {
    const r = await request(app).post('/api/v1/documents').set('Content-Type', 'application/json').send('{bad').expect(400);
    expect(r.body.code).toBe('BAD_REQUEST');
  });
});
