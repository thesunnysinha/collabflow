const { Kafka } = require('kafkajs');
const { KAFKA_BROKERS } = require('../../config/env');

let producer = null;
let isConnected = false;
const MAX_RETRIES = 5;
const TOPIC = 'document-updates'; // Single topic for all updates

const connectToKafka = async () => {
  try {
    if (isConnected) return;

    const kafka = new Kafka({
      clientId: 'collab-editor-producer',
      brokers: KAFKA_BROKERS,
      retry: {
        maxRetryTime: 30000,
        initialRetryTime: 1000,
        retries: MAX_RETRIES
      }
    });

    producer = kafka.producer();
    await producer.connect();
    isConnected = true;
    console.log('Successfully connected to Kafka cluster');
  } catch (err) {
    console.error('Failed to connect to Kafka:', err);
    throw new Error('Kafka connection failed');
  }
};

const sendDocumentUpdate = async (message) => {
  try {
    if (!isConnected) {
      await connectToKafka();
    }

    // Validate message structure
    if (!message.documentId || !message.content) {
      throw new Error('Invalid message format - missing required fields');
    }

    const formattedMessage = {
      ...message,
      timestamp: new Date().toISOString(),
      source: 'collab-editor'
    };

    await producer.send({
      topic: TOPIC,
      messages: [{
        value: JSON.stringify(formattedMessage),
        key: message.documentId // Partition by document ID
      }]
    });

    console.debug(`Successfully sent update for document ${message.documentId}`);
  } catch (err) {
    console.error('Failed to send message:', err);
    throw new Error('Message production failed');
  }
};

const shutdownProducer = async () => {
  if (isConnected) {
    await producer.disconnect();
    isConnected = false;
    console.log('Kafka producer disconnected gracefully');
  }
};

// Handle process termination gracefully
process.on('SIGTERM', shutdownProducer);
process.on('SIGINT', shutdownProducer);

module.exports = {
  connectToKafka,
  sendDocumentUpdate,
  shutdownProducer
};