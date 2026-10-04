const http = require('http');
const mongoose = require('mongoose');
const { PORT, MONGO_URI } = require('./config/env');
const logger = require('./utils/logger');
const { createApp } = require('./app');
const { initializeSocket } = require('./services/socket');
const { connectToKafka, shutdownProducer, isProducerConnected } = require('./services/kafka/producer');
const { startConsumer, shutdownConsumer, isConsumerRunning } = require('./services/kafka/consumer');

const app = createApp({
  ready: () => ({ kafkaProducer: isProducerConnected(), kafkaConsumer: isConsumerRunning() })
});
const server = http.createServer(app);
const io = initializeSocket(server);

let shuttingDown = false;
const shutdown = async (code = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info('Shutting down gracefully...');
  const force = setTimeout(() => process.exit(1), 10000);
  force.unref();
  try {
    io.close();
    await new Promise((resolve) => server.close(resolve));
    await shutdownConsumer();
    await shutdownProducer();
    await mongoose.disconnect();
  } catch (err) {
    logger.error({ err }, 'Error during shutdown');
    code = 1;
  }
  process.exit(code);
};

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
process.on('unhandledRejection', (err) => { logger.fatal({ err }, 'Unhandled rejection'); shutdown(1); });
process.on('uncaughtException', (err) => { logger.fatal({ err }, 'Uncaught exception'); shutdown(1); });

(async () => {
  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 10000 });
    logger.info('MongoDB connected');
    await connectToKafka();
    await startConsumer(io);
    server.listen(PORT, () => logger.info(`Server listening on port ${PORT}`));
  } catch (err) {
    logger.fatal({ err }, 'Startup failed');
    shutdown(1);
  }
})();
