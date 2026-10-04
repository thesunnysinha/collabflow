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

// `ready` reports dependency health for /readyz (injected so tests can run without Kafka).
const createApp = ({ ready = () => true } = {}) => {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1); // behind the Caddy edge proxy

  app.get('/healthz', (req, res) => res.json({ status: 'ok' }));
  app.get('/readyz', (req, res) => {
    const checks = { mongo: mongoose.connection.readyState === 1, ...ready() };
    const ok = Object.values(checks).every(Boolean);
    res.status(ok ? 200 : 503).json({ status: ok ? 'ready' : 'degraded', checks });
  });

  if (NODE_ENV !== 'test') {
    app.use(pinoHttp({
      logger,
      autoLogging: { ignore: (req) => req.url === '/healthz' || req.url === '/readyz' }
    }));
  }
  app.use(helmet());
  app.use(cors({ origin: CORS_ORIGINS.length ? CORS_ORIGINS : false }));
  app.use(express.json({ limit: '2mb' }));
  app.use('/api', rateLimit({
    windowMs: 60 * 1000,
    limit: NODE_ENV === 'test' ? 10000 : 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many requests' }
  }));

  app.use('/api/auth', authRoutes);
  app.use('/api/documents', documentRoutes);

  app.use(notFoundHandler);
  app.use(globalErrorHandler);
  return app;
};

module.exports = { createApp };
