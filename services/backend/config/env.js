require('dotenv').config();

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProd = NODE_ENV === 'production';

const required = ['MONGO_URI', 'JWT_SECRET'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

if (isProd && process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters in production');
}

const list = (v, fallback) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : fallback);

module.exports = {
  NODE_ENV,
  isProd,
  PORT: parseInt(process.env.PORT, 10) || 8000,
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1h',
  KAFKA_BROKERS: list(process.env.KAFKA_BROKERS, ['kafka:9092']),
  // Comma-separated list of allowed browser origins. Empty = same-origin only.
  CORS_ORIGINS: list(process.env.CORS_ORIGINS, []),
  LOG_LEVEL: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
  MAX_DOCUMENT_BYTES: parseInt(process.env.MAX_DOCUMENT_BYTES, 10) || 1024 * 1024
};
