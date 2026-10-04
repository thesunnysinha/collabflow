const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { signToken } = require('../middleware/auth');
const { UnauthorizedError, ConflictError } = require('../utils/errors');

const BCRYPT_COST = 12;
// Compared against when the user doesn't exist so response time doesn't reveal valid usernames.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_COST);

exports.register = async (req, res) => {
  const { username, password } = req.body;
  const password_hash = await bcrypt.hash(password, BCRYPT_COST);
  try {
    const user = await User.create({ username, password: password_hash });
    res.status(201).json({ success: true, data: { token: signToken(user._id), user } });
  } catch (err) {
    if (err.code === 11000) throw new ConflictError('Username is already taken');
    throw err;
  }
};

exports.login = async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username: String(username).toLowerCase() });
  const ok = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);
  if (!user || !ok) throw new UnauthorizedError('Invalid credentials');
  res.json({ success: true, data: { token: signToken(user._id), user } });
};

exports.me = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new UnauthorizedError();
  res.json({ success: true, data: { user } });
};
