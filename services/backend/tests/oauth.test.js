const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { createApp } = require('../app');
const User = require('../models/User');

let mongod, app;
const realFetch = global.fetch;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  app = createApp();
});
afterAll(async () => {
  global.fetch = realFetch;
  await mongoose.disconnect();
  await mongod.stop();
});
beforeEach(async () => { await User.deleteMany({}); });

const jsonRes = (body, ok = true, status = 200) => ({ ok, status, json: async () => body });
const mockGithub = (profile) => {
  global.fetch = jest.fn(async (url) => {
    if (url.includes('access_token')) return jsonRes({ access_token: 'gho_fake' });
    if (url.includes('api.github.com/user')) return jsonRes(profile);
    throw new Error(`unexpected fetch ${url}`);
  });
};

// Performs step 1 and returns what the browser would send back to the callback.
const start = async () => {
  const res = await request(app).get('/api/auth/github').expect(302);
  const loc = new URL(res.headers.location);
  const cookie = res.headers['set-cookie'][0].split(';')[0];
  return { loc, cookie, state: loc.searchParams.get('state') };
};

describe('GitHub OAuth', () => {
  it('redirects to GitHub with client id, callback and a signed state, and sets a nonce cookie', async () => {
    const { loc, cookie, state } = await start();
    expect(loc.origin + loc.pathname).toBe('https://github.com/login/oauth/authorize');
    expect(loc.searchParams.get('client_id')).toBe('test-client-id');
    expect(loc.searchParams.get('redirect_uri')).toBe('https://app.example.com/api/auth/github/callback');
    expect(cookie).toMatch(/^oauth_state=/);
    expect(jwt.decode(state).nonce).toBe(cookie.split('=')[1]);
    const raw = (await request(app).get('/api/auth/github')).headers['set-cookie'][0];
    expect(raw).toMatch(/HttpOnly/i);
    expect(raw).toMatch(/SameSite=Lax/i);
  });

  it('creates the user on first sign-in and hands a working token to the SPA in the URL fragment', async () => {
    mockGithub({ id: 42, login: 'Octocat', avatar_url: 'https://a/b.png' });
    const { cookie, state } = await start();
    const res = await request(app).get('/api/auth/github/callback')
      .query({ code: 'abc', state }).set('Cookie', cookie).expect(302);

    const loc = new URL(res.headers.location);
    expect(loc.origin + loc.pathname).toBe('https://app.example.com/auth/callback');
    const token = new URLSearchParams(loc.hash.slice(1)).get('token');
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`).expect(200);
    expect(me.body.data.user.username).toBe('octocat');
    expect(await User.countDocuments()).toBe(1);

    // Code exchange used our credentials.
    const exchange = global.fetch.mock.calls.find(([u]) => u.includes('access_token'));
    expect(JSON.parse(exchange[1].body)).toMatchObject({ client_id: 'test-client-id', code: 'abc' });
  });

  it('reuses the account and refreshes the username when the GitHub login changes', async () => {
    for (const login of ['old-name', 'new-name']) {
      mockGithub({ id: 7, login });
      const { cookie, state } = await start();
      await request(app).get('/api/auth/github/callback').query({ code: 'c', state }).set('Cookie', cookie).expect(302);
    }
    const users = await User.find();
    expect(users).toHaveLength(1);
    expect(users[0].username).toBe('new-name');
  });

  it('rejects a callback without the matching cookie (login CSRF)', async () => {
    mockGithub({ id: 1, login: 'x' });
    const { state } = await start();
    const res = await request(app).get('/api/auth/github/callback').query({ code: 'c', state }).expect(302);
    expect(res.headers.location).toBe('https://app.example.com/login?error=invalid_state');
    expect(global.fetch).not.toHaveBeenCalled();
    expect(await User.countDocuments()).toBe(0);
  });

  it('rejects forged or missing state and a cookie that does not match', async () => {
    mockGithub({ id: 1, login: 'x' });
    const { cookie } = await start();
    const forged = jwt.sign({ nonce: 'whatever' }, 'wrong-secret');
    for (const q of [{ code: 'c' }, { code: 'c', state: 'junk' }, { code: 'c', state: forged }]) {
      const res = await request(app).get('/api/auth/github/callback').query(q).set('Cookie', cookie);
      expect(res.headers.location).toBe('https://app.example.com/login?error=invalid_state');
    }
    expect(await User.countDocuments()).toBe(0);
  });

  it('handles the user denying access and GitHub failures without creating users', async () => {
    let r = await request(app).get('/api/auth/github/callback').query({ error: 'access_denied' }).expect(302);
    expect(r.headers.location).toMatch(/error=access_denied/);

    global.fetch = jest.fn(async () => jsonRes({ error: 'bad_verification_code' }, true, 200));
    const { cookie, state } = await start();
    r = await request(app).get('/api/auth/github/callback').query({ code: 'bad', state }).set('Cookie', cookie).expect(302);
    expect(r.headers.location).toBe('https://app.example.com/login?error=github_failed');
    expect(await User.countDocuments()).toBe(0);
  });
});
