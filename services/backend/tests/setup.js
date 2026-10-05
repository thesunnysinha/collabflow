const crypto = require('crypto');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
process.env.MONGO_URI = 'mongodb://localhost/unused';
process.env.GITHUB_CLIENT_ID = 'test-client-id';
process.env.GITHUB_CLIENT_SECRET = crypto.randomBytes(8).toString('hex');
process.env.PUBLIC_URL = 'https://app.example.com';
