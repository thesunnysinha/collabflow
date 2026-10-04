const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { register, login, me } = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../utils/errorHandler');
const validate = require('../utils/validate');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: process.env.NODE_ENV === 'test' ? 1000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many attempts, please try again later' }
});

const username = body('username')
  .isString().trim()
  .matches(/^[a-zA-Z0-9_.-]{3,32}$/)
  .withMessage('Username must be 3-32 characters (letters, numbers, _ . -)');

router.post('/register', authLimiter, username,
  body('password').isString().isLength({ min: 8, max: 72 })
    .withMessage('Password must be 8-72 characters'),
  validate, asyncHandler(register));

router.post('/login', authLimiter, username,
  body('password').isString().isLength({ min: 1, max: 72 }),
  validate, asyncHandler(login));

router.get('/me', requireAuth, asyncHandler(me));

module.exports = router;
