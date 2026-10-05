const express = require('express');
const rateLimit = require('express-rate-limit');
const { githubLogin, githubCallback, me } = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const { failure } = require('../utils/envelope');
const { asyncHandler } = require('../utils/errorHandler');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: process.env.NODE_ENV === 'test' ? 1000 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json(failure('RATE_LIMITED', 'Too many attempts, please try again later', req.id))
});

router.get('/github', authLimiter, githubLogin);
router.get('/github/callback', authLimiter, asyncHandler(githubCallback));
router.get('/me', requireAuth, asyncHandler(me));

module.exports = router;
