const { Kafka, logLevel } = require('kafkajs');
const { KAFKA_BROKERS } = require('../../config/env');
const Document = require('../../models/Document');
const logger = require('../../utils/logger');
const { TOPIC } = require('./producer');
const { sanitizeChanges } = require('../updateSchema');

let consumer = null;
let running = false;

// Persists each accepted edit to MongoDB, then fans it out to the document's room.
const handleMessage = async (io, raw) => {
  let update;
  try {
    update = JSON.parse(raw);
  } catch (e) {
    logger.warn('Dropping unparseable Kafka message');
    return;
  }
  const changes = update.documentId && sanitizeChanges(update.changes);
  if (!changes) {
    logger.warn({ documentId: update.documentId }, 'Dropping invalid Kafka message');
    return;
  }

  // Throws on DB failure so kafkajs retries instead of silently losing the edit.
  await Document.updateOne({ _id: update.documentId }, { $set: changes });

  io.to(String(update.documentId)).emit(`document-update-${update.documentId}`, {
    ...changes,
    socketId: update.socketId,
    timestamp: update.timestamp
  });
};

const startConsumer = async (io) => {
  const kafka = new Kafka({
    clientId: 'collabflow-consumer',
    brokers: KAFKA_BROKERS,
    logLevel: logLevel.WARN,
    retry: { initialRetryTime: 500, maxRetryTime: 30000, retries: 10 }
  });
  consumer = kafka.consumer({ groupId: 'document-group' });
  await consumer.connect();
  await consumer.subscribe({ topic: TOPIC, fromBeginning: false });
  await consumer.run({
    eachMessage: async ({ message }) => handleMessage(io, message.value.toString())
  });
  running = true;
  consumer.on(consumer.events.CRASH, ({ payload }) => {
    running = false;
    logger.error({ err: payload.error }, 'Kafka consumer crashed');
  });
  logger.info('Kafka consumer started');
};

const isConsumerRunning = () => running;

const shutdownConsumer = async () => {
  if (consumer) {
    running = false;
    await consumer.disconnect();
    logger.info('Kafka consumer disconnected');
  }
};

module.exports = { startConsumer, shutdownConsumer, isConsumerRunning, handleMessage };
