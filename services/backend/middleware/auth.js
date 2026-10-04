const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/env');
const { UnauthorizedError } = require('../utils/errors');

const signToken = (userId) =>
  jwt.sign({ id: String(userId) }, JWT_SECRET, { algorithm: 'HS256', expiresIn: JWT_EXPIRES_IN });

const verifyToken = (token) => {
  try {
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    if (!payload.id) throw new Error('missing id');
    return payload;
  } catch (e) {
    throw new UnauthorizedError('Invalid or expired token');
  }
};

const requireAuth = (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return next(new UnauthorizedError());
  try {
    req.user = { id: verifyToken(token).id };
    return next();
  } catch (e) {
    return next(e);
  }
};

module.exports = { signToken, verifyToken, requireAuth };
