const { Kafka, logLevel } = require('kafkajs');
const { KAFKA_BROKERS } = require('../../config/env');
const logger = require('../../utils/logger');

const TOPIC = 'document-updates';
let producer = null;
let connected = false;

const connectToKafka = async () => {
  if (connected) return;
  const kafka = new Kafka({
    clientId: 'collabflow-producer',
    brokers: KAFKA_BROKERS,
    logLevel: logLevel.WARN,
    retry: { initialRetryTime: 500, maxRetryTime: 30000, retries: 10 }
  });
  producer = kafka.producer({ allowAutoTopicCreation: true, idempotent: true });
  producer.on(producer.events.DISCONNECT, () => { connected = false; });
  await producer.connect();
  connected = true;
  logger.info('Kafka producer connected');
};

// message: { documentId, userId, socketId, changes }
const sendDocumentUpdate = async (message) => {
  if (!message || !message.documentId || !message.changes) {
    throw new Error('Invalid message format - documentId and changes are required');
  }
  if (!connected) await connectToKafka();
  await producer.send({
    topic: TOPIC,
    acks: -1,
    messages: [{
      key: String(message.documentId), // same document -> same partition -> ordered
      value: JSON.stringify({ ...message, timestamp: new Date().toISOString() })
    }]
  });
};

const isProducerConnected = () => connected;

const shutdownProducer = async () => {
  if (producer && connected) {
    connected = false;
    await producer.disconnect();
    logger.info('Kafka producer disconnected');
  }
};

module.exports = { TOPIC, connectToKafka, sendDocumentUpdate, shutdownProducer, isProducerConnected };
