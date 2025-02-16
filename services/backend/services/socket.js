const { Server } = require('socket.io');
const { sendDocumentUpdate } = require('./kafka/producer');
const { ValidationError } = require('../utils/errors');

// Track collaborators for each document { documentId: [{ id, name }] }
const documentCollaborators = new Map();

const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    },
    connectionStateRecovery: {
      maxDisconnectionDuration: 120000
    }
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    let currentDocumentId = null;
    let currentUserName = null;

    // Join document with username
    socket.on('join-document', ({ documentId, userName }) => {
      try {
        if (!documentId || !userName) {
          throw new ValidationError('Document ID and username are required');
        }

        // Leave previous document
        if (currentDocumentId) {
          socket.leave(currentDocumentId);
          const prevCollabs = documentCollaborators.get(currentDocumentId)
            ?.filter(c => c.id !== socket.id) || [];
          documentCollaborators.set(currentDocumentId, prevCollabs);
          io.to(currentDocumentId).emit('collaborators-update', prevCollabs);
        }

        // Join new document
        currentDocumentId = documentId;
        currentUserName = userName;
        socket.join(documentId);

        // Update collaborators list
        const newCollabs = [
          ...documentCollaborators.get(documentId) || [],
          { id: socket.id, name: userName }
        ];
        documentCollaborators.set(documentId, newCollabs);
        io.to(documentId).emit('collaborators-update', newCollabs);

      } catch (err) {
        socket.emit('error', err.message);
      }
    });

    // Handle document updates
    socket.on('document-update', async (update) => {
      try {
        if (!currentDocumentId) throw new ValidationError('Join a document first');

        // Prepare Kafka message
        const kafkaMessage = {
          documentId: currentDocumentId,
          ...update
        };

        // Persist to Kafka
        await sendDocumentUpdate(kafkaMessage);

        // Broadcast to other clients with document-specific event name
        socket.to(currentDocumentId).emit(`document-update-${currentDocumentId}`, kafkaMessage);

      } catch (err) {
        socket.emit('error', err.message);
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      if (currentDocumentId) {
        const collabs = documentCollaborators.get(currentDocumentId)
          ?.filter(c => c.id !== socket.id) || [];
        documentCollaborators.set(currentDocumentId, collabs);
        io.to(currentDocumentId).emit('collaborators-update', collabs);
      }
    });

    // Error handling
    socket.on('error', (err) => {
      console.error(`Socket error (${socket.id}):`, err);
    });
  });

  return io;
};

module.exports = { initializeSocket };