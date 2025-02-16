require('dotenv').config();

module.exports = {
  MONGO_URI: process.env.MONGO_URI || 'mongodb://root:password@mongodb:27017',
  KAFKA_BROKERS: process.env.KAFKA_BROKERS?.split(',') || ['kafka:9092'],
  NODE_ENV: process.env.NODE_ENV || 'development'
};