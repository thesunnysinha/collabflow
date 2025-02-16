require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const cors = require('cors');
const { initializeSocket } = require('./services/socket');
const documentRoutes = require('./routes/documentRoutes');
const { connectToKafka, shutdownProducer } = require('./services/kafka/producer');
const { startConsumer, shutdownConsumer } = require('./services/kafka/consumer');

const app = express();
const server = http.createServer(app);

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB connected successfully');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Socket.IO
const io = initializeSocket(server);

// Initialize Kafka and start consumer
const initializeMessaging = async () => {
  try {
    await connectToKafka();
    await startConsumer(io);
    console.log('Kafka initialized successfully');
  } catch (err) {
    console.error('Kafka initialization failed:', err);
    process.exit(1);
  }
};

// Routes
app.use('/api/documents', documentRoutes);

// Error Handling Middleware
app.use(require('./utils/errorHandler'));

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down gracefully...');
  await shutdownProducer();
  await shutdownConsumer();
  server.close();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start server
const startServer = async () => {
  try {
    await connectDB();
    await initializeMessaging();
    
    const PORT = process.env.PORT || 8000;
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Server startup failed:', err);
    process.exit(1);
  }
};

startServer();