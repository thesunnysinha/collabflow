const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors'); // Import CORS
const connectDB = require('./config/db');
const documentRoutes = require('./routes/documentRoutes');
const { Kafka } = require('kafkajs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000", // Allow requests from the frontend
    methods: ["GET", "POST"],
    credentials: true // Allow credentials (if needed)
  }
});

// Initialize Kafka
const kafka = new Kafka({
  clientId: 'document-editor',
  brokers: ['kafka:9092'], // Use the service name defined in docker-compose.yml.
});

const producer = kafka.producer();
producer.connect();

app.use(cors());
app.use(express.json());
app.use('/api/documents', documentRoutes);

// MongoDB connection.
connectDB();

// Socket.IO setup for real-time collaboration.
let contributorsMap = {}; // Track contributors per document.

io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('joinDocument', ({ docId, username }) => {
    if (!contributorsMap[docId]) contributorsMap[docId] = new Set();
    contributorsMap[docId].add(username);

    // Notify all clients about current contributors.
    io.emit(`contributors-${docId}`, Array.from(contributorsMap[docId]));

    socket.on('disconnect', () => {
      console.log('Client disconnected');
      contributorsMap[docId]?.delete(username);
      io.emit(`contributors-${docId}`, Array.from(contributorsMap[docId]));
    });
  });

  socket.on('editDocument', async (data) => {
    // Emit change to other clients via Socket.IO.
    socket.broadcast.emit(`documentUpdated-${data.id}`, data.content);

    // Produce message to Kafka topic for document updates.
    await producer.send({
      topic: 'document-updates',
      messages: [{ key: data.id.toString(), value: JSON.stringify(data) }],
    });
  });

  // Handle new collaborator addition.
  socket.on('newCollaborator', async (name) => {
    // Broadcast new collaborator to all clients in the same document.
    socket.broadcast.emit('newCollaborator', name);
    
    // Produce message to Kafka topic for new collaborators.
    await producer.send({
      topic: 'collaborator-updates',
      messages: [{ key: name, value: JSON.stringify({ name }) }],
    });
  });
});

// Start the server.
server.listen(5000, () => console.log(`Server running on port 5000`));
