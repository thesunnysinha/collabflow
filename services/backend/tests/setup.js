const crypto = require('crypto');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
process.env.MONGO_URI = 'mongodb://localhost/unused';
