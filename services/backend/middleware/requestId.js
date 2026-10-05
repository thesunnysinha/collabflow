const crypto = require('crypto');

// Accepts a caller-supplied X-Request-ID (bounded, printable only) or generates one,
// and echoes it back so a request can be traced across proxy, API and logs.
module.exports = (req, res, next) => {
  const incoming = req.headers['x-request-id'];
  const valid = typeof incoming === 'string' && /^[\w.:-]{1,128}$/.test(incoming);
  req.id = valid ? incoming : crypto.randomUUID();
  res.setHeader('X-Request-ID', req.id);
  next();
};
