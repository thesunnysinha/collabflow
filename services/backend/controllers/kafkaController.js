const { Kafka } = require('kafkajs');
const { KAFKA_BROKERS } = require('../config/env');
const Document = require('../models/Document');

// Kafka configuration
const kafka = new Kafka({
  clientId: 'collab-editor',
  brokers: KAFKA_BROKERS,
});

// Create Kafka producer instance
const producer = kafka.producer();
let isProducerConnected = false;

// Create Kafka consumer instance
const consumer = kafka.consumer({ groupId: 'document-group' });
let isConsumerConnected = false;

// Initialize Kafka Producer
const initializeProducer = async () => {
  try {
    if (!isProducerConnected) {
      await producer.connect();
      isProducerConnected = true;
      console.log('Kafka Producer connected successfully');
    }
  } catch (err) {
    console.error('Error connecting Kafka Producer:', err);
    throw err;
  }
};

// Initialize Kafka Consumer
const initializeConsumer = async (io) => {
  try {
    if (!isConsumerConnected) {
      await consumer.connect();
      await consumer.subscribe({ topic: 'document-updates', fromBeginning: true });
      isConsumerConnected = true;
      console.log('Kafka Consumer connected and subscribed');
      
      await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            const update = JSON.parse(message.value.toString());
            
            // Update MongoDB with latest changes
            const doc = await Document.findByIdAndUpdate(
              update.documentId,
              {
                $set: {
                  title: update.title,
                  content: update.content,
                  language: update.language,
                  theme: update.theme
                }
              },
              { new: true }
            );
            
            // Broadcast update to all connected clients
            io.to(update.documentId).emit('document-update', {
              title: doc.title,
              content: doc.content,
              language: doc.language,
              theme: doc.theme
            });
          } catch (err) {
            console.error('Error processing Kafka message:', err);
          }
        },
      });
    }
  } catch (err) {
    console.error('Error connecting Kafka Consumer:', err);
    throw err;
  }
};

// Send document update to Kafka
const sendDocumentUpdate = async (documentId, updateData) => {
  try {
    if (!isProducerConnected) {
      await initializeProducer();
    }

    const message = {
      documentId,
      ...updateData,
      timestamp: new Date().toISOString()
    };

    await producer.send({
      topic: 'document-updates',
      messages: [{ value: JSON.stringify(message) }]
    });

    console.log(`Sent update to Kafka for document ${documentId}`);
  } catch (err) {
    console.error('Error sending message to Kafka:', err);
    throw err;
  }
};

module.exports = {
  initializeProducer,
  initializeConsumer,
  sendDocumentUpdate
};