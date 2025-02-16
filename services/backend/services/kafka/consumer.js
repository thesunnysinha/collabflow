const { Kafka } = require('kafkajs');
const { KAFKA_BROKERS } = require('../../config/env');

const kafka = new Kafka({
  clientId: 'collab-editor-consumer',
  brokers: KAFKA_BROKERS
});

let consumer = null;
let isConnected = false;

const startConsumer = async (io) => {
  try {
    if (!consumer) {
      consumer = kafka.consumer({ 
        groupId: 'document-group',
        retry: {
          maxRetryTime: 30000,
          initialRetryTime: 1000
        }
      });
    }

    if (!isConnected) {
      await consumer.connect();
      isConnected = true;
      console.log('Connected to Kafka broker');
    }

    await consumer.subscribe({ 
      topic: 'document-updates', 
      fromBeginning: false 
    });

    console.log('Subscribed to document-updates topic');

    await consumer.run({
      autoCommit: true,
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const update = JSON.parse(message.value.toString());
          
          // Validate message format
          if (!update.documentId || !update.content) {
            console.error('Invalid message format:', update);
            return;
          }

          // Broadcast to document-specific room
          io.to(update.documentId).emit('document-update', {
            content: update.content,
            title: update.title || '',
            language: update.language || 'python',
            theme: update.theme || 'github',
            timestamp: update.timestamp
          });

          console.log(`Processed update for document ${update.documentId}`);
        } catch (err) {
          console.error('Error processing message:', err);
          // Implement dead-letter queue logic here if needed
        }
      }
    });

    console.log('Kafka consumer started successfully');

  } catch (err) {
    console.error('Failed to start Kafka consumer:', err);
    // Implement proper error recovery here
    process.exit(1); // Exit process for containerized environments
  }
};

const shutdownConsumer = async () => {
  if (isConnected) {
    await consumer.disconnect();
    isConnected = false;
    console.log('Kafka consumer disconnected');
  }
};

process.on('SIGTERM', shutdownConsumer);
process.on('SIGINT', shutdownConsumer);

module.exports = { 
  startConsumer,
  shutdownConsumer
};