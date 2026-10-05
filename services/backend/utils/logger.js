const pino = require('pino');
const { LOG_LEVEL, isProd } = require('../config/env');

module.exports = pino({
  level: LOG_LEVEL,
  redact: ['req.headers.authorization', 'req.headers.cookie', 'password', '*.password', 'token'],
  ...(isProd ? {} : { transport: { target: 'pino-pretty' } })
});
