const { Server } = require('socket.io');
const { sendDocumentUpdate } = require('./kafka/producer');
const { ValidationError } = require('../utils/errors');

const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    },
    connectionStateRecovery: {
      maxDisconnectionDuration: 120000 // 2 minutes
    }
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    let currentDocumentId = null;

    // Join document-specific room
    socket.on('join-document', (documentId) => {
      try {
        if (!documentId) {
          throw new ValidationError('Document ID is required');
        }

        if (currentDocumentId) {
          socket.leave(currentDocumentId);
        }

        currentDocumentId = documentId;
        socket.join(documentId);
        console.log(`Client ${socket.id} joined document ${documentId}`);
      } catch (err) {
        socket.emit('error', err.message);
      }
    });

    // Handle document updates
    socket.on('document-update', async (update) => {
      try {
        // Validate update
        if (!currentDocumentId) {
          throw new ValidationError('Join a document first');
        }
        if (!update.content && !update.title && !update.language && !update.theme) {
          throw new ValidationError('No valid update fields provided');
        }

        // Prepare Kafka message
        const kafkaMessage = {
          documentId: currentDocumentId,
          content: update.content,
          title: update.title,
          language: update.language,
          theme: update.theme
        };

        // Persist to Kafka
        await sendDocumentUpdate(kafkaMessage);

        // Broadcast to other clients in the room
        socket.to(currentDocumentId).emit('document-update', kafkaMessage);
        
      } catch (err) {
        console.error(`Update error from ${socket.id}:`, err.message);
        socket.emit('error', err.message);
      }
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`Client disconnected (${reason}): ${socket.id}`);
      if (currentDocumentId) {
        socket.leave(currentDocumentId);
      }
    });

    // Error handler
    socket.on('error', (err) => {
      console.error(`Socket error from ${socket.id}:`, err);
    });
  });

  return io;
};

module.exports = { initializeSocket };