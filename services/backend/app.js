const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const mongoose = require('mongoose');
const pinoHttp = require('pino-http');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');
const { CORS_ORIGINS, NODE_ENV } = require('./config/env');
const authRoutes = require('./routes/authRoutes');
const documentRoutes = require('./routes/documentRoutes');
const { globalErrorHandler, notFoundHandler } = require('./utils/errorHandler');
const { ok, failure } = require('./utils/envelope');
const requestId = require('./middleware/requestId');

// `ready` reports dependency health for /api/v1/ready (injected so tests can run without Kafka).
const createApp = ({ ready = () => true } = {}) => {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1); // behind the Caddy edge proxy

  app.use(requestId);

  // Liveness never touches dependencies; readiness reports MongoDB and Kafka.
  app.get('/api/v1/health', (req, res) => res.json(ok({ status: 'ok' }, req.id)));
  app.get('/api/v1/ready', (req, res) => {
    const checks = { mongo: mongoose.connection.readyState === 1, ...ready() };
    if (Object.values(checks).every(Boolean)) return res.json(ok({ status: 'ready', checks }, req.id));
    return res.status(503).json(failure('NOT_READY', 'A dependency is not ready.', req.id, { checks }));
  });

  if (NODE_ENV !== 'test') {
    app.use(pinoHttp({
      logger,
      genReqId: (req) => req.id,
      autoLogging: { ignore: (req) => req.url === '/api/v1/health' || req.url === '/api/v1/ready' }
    }));
  }
  app.use(helmet());
  app.use(cors({ origin: CORS_ORIGINS.length ? CORS_ORIGINS : false }));
  app.use(express.json({ limit: '2mb' }));
  app.use('/api/v1', rateLimit({
    windowMs: 60 * 1000,
    limit: NODE_ENV === 'test' ? 10000 : 300,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json(failure('RATE_LIMITED', 'Too many requests', req.id))
  }));

  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/documents', documentRoutes);

  app.use(notFoundHandler);
  app.use(globalErrorHandler);
  return app;
};

module.exports = { createApp };
