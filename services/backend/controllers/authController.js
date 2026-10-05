const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { signToken } = require('../middleware/auth');
const { UnauthorizedError } = require('../utils/errors');
const logger = require('../utils/logger');
const { JWT_SECRET, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, PUBLIC_URL, isProd } = require('../config/env');

const COOKIE = 'oauth_state';
const COOKIE_PATH = '/api/auth/github';
const STATE_TTL_S = 600;
const CALLBACK_URL = `${PUBLIC_URL}/api/auth/github/callback`;

const readCookie = (req, name) => {
  const match = (req.headers.cookie || '').split(';').map((c) => c.trim()).find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : undefined;
};

const clearStateCookie = (res) => res.clearCookie(COOKIE, { path: COOKIE_PATH });
const failRedirect = (res, reason) => { clearStateCookie(res); return res.redirect(`${PUBLIC_URL}/login?error=${reason}`); };

// Step 1: send the browser to GitHub. `state` is a signed token whose nonce is also bound to
// this browser via an httpOnly cookie, so a callback can't be replayed from another session.
exports.githubLogin = (req, res) => {
  const nonce = crypto.randomBytes(16).toString('hex');
  const state = jwt.sign({ nonce }, JWT_SECRET, { algorithm: 'HS256', expiresIn: STATE_TTL_S });
  res.cookie(COOKIE, nonce, {
    httpOnly: true, sameSite: 'lax', secure: isProd, path: COOKIE_PATH, maxAge: STATE_TTL_S * 1000
  });
  const params = new URLSearchParams({ client_id: GITHUB_CLIENT_ID, redirect_uri: CALLBACK_URL, state });
  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
};

const exchangeCode = async (code) => {
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID, client_secret: GITHUB_CLIENT_SECRET, code, redirect_uri: CALLBACK_URL
    })
  });
  const body = await tokenRes.json();
  if (!tokenRes.ok || !body.access_token) throw new Error(`token exchange failed: ${body.error || tokenRes.status}`);

  const userRes = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${body.access_token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'collabflow'
    }
  });
  if (!userRes.ok) throw new Error(`profile fetch failed: ${userRes.status}`);
  return userRes.json();
};

// Step 2: GitHub redirects back here. On success the app JWT is handed to the SPA in the URL
// fragment (never sent to servers or written to access logs).
exports.githubCallback = async (req, res) => {
  const { code, state, error } = req.query;
  if (error) return failRedirect(res, 'access_denied');

  try {
    const payload = jwt.verify(String(state), JWT_SECRET, { algorithms: ['HS256'] });
    const cookieNonce = readCookie(req, COOKIE);
    const a = Buffer.from(String(cookieNonce || ''));
    const b = Buffer.from(payload.nonce);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new Error('state mismatch');
  } catch (e) {
    return failRedirect(res, 'invalid_state');
  }
  if (typeof code !== 'string' || !code) return failRedirect(res, 'invalid_request');

  try {
    const profile = await exchangeCode(code);
    if (!profile.id || !profile.login) throw new Error('unexpected profile payload');
    const user = await User.findOneAndUpdate(
      { githubId: profile.id },
      { $set: { username: profile.login, avatarUrl: profile.avatar_url } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    clearStateCookie(res);
    return res.redirect(`${PUBLIC_URL}/auth/callback#token=${signToken(user._id)}`);
  } catch (err) {
    logger.error({ err: err.message }, 'GitHub sign-in failed');
    return failRedirect(res, 'github_failed');
  }
};

exports.me = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new UnauthorizedError();
  res.json({ success: true, data: { user } });
};
