const { Server } = require('socket.io');
const User = require('../models/User');
const Document = require('../models/Document');
const { verifyToken } = require('../middleware/auth');
const { getAccessibleDocument, isId } = require('./documentAccess');
const { sendDocumentUpdate } = require('./kafka/producer');
const { sanitizeChanges } = require('./updateSchema');
const { CORS_ORIGINS, MAX_DOCUMENT_BYTES } = require('../config/env');
const logger = require('../utils/logger');

const MAX_EVENTS = 40;      // per socket
const WINDOW_MS = 5000;

const presence = async (io, documentId) => {
  const sockets = await io.in(documentId).fetchSockets();
  const seen = new Map();
  for (const s of sockets) seen.set(s.data.userId, { id: s.data.userId, name: s.data.username });
  io.to(documentId).emit('collaborators-update', [...seen.values()]);
};

const initializeSocket = (server) => {
  const io = new Server(server, {
    path: '/socket.io',
    maxHttpBufferSize: MAX_DOCUMENT_BYTES + 4096,
    cors: CORS_ORIGINS.length ? { origin: CORS_ORIGINS, methods: ['GET', 'POST'] } : undefined
  });

  // Authenticate during the handshake; the display name comes from the DB, never the client.
  io.use(async (socket, next) => {
    try {
      const { id } = verifyToken(socket.handshake.auth?.token);
      const user = await User.findById(id).select('username');
      if (!user) throw new Error('unknown user');
      socket.data.userId = String(user._id);
      socket.data.username = user.username;
      next();
    } catch (e) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    let currentDocumentId = null;
    let windowStart = Date.now();
    let count = 0;

    const allowed = () => {
      const now = Date.now();
      if (now - windowStart > WINDOW_MS) { windowStart = now; count = 0; }
      return ++count <= MAX_EVENTS;
    };
    const fail = (message) => socket.emit('app-error', message);

    socket.on('join-document', async ({ documentId } = {}) => {
      try {
        if (!allowed()) return fail('Too many requests');
        if (!isId(documentId)) return fail('Invalid document');
        await getAccessibleDocument(documentId, socket.data.userId);

        if (currentDocumentId && currentDocumentId !== documentId) {
          const prev = currentDocumentId;
          await socket.leave(prev);
          await presence(io, prev);
        }
        currentDocumentId = String(documentId);
        await socket.join(currentDocumentId);
        await presence(io, currentDocumentId);
      } catch (err) {
        fail(err.isOperational ? err.message : 'Failed to join document');
        if (!err.isOperational) logger.error({ err }, 'join-document failed');
      }
    });

    socket.on('document-update', async (update) => {
      try {
        if (!allowed()) return fail('Too many requests');
        if (!currentDocumentId) return fail('Join a document first');
        const changes = sanitizeChanges(update);
        if (!changes) return fail('Invalid update');

        // Access may have been revoked since joining.
        const stillAllowed = await Document.exists({
          _id: currentDocumentId,
          $or: [{ owner: socket.data.userId }, { collaborators: socket.data.userId }]
        });
        if (!stillAllowed) {
          await socket.leave(currentDocumentId);
          currentDocumentId = null;
          return fail('Access to this document was revoked');
        }

        await sendDocumentUpdate({
          documentId: currentDocumentId,
          userId: socket.data.userId,
          socketId: socket.id,
          changes
        });
      } catch (err) {
        logger.error({ err }, 'document-update failed');
        fail('Failed to save update');
      }
    });

    socket.on('disconnect', () => {
      if (currentDocumentId) presence(io, currentDocumentId).catch(() => {});
    });
  });

  return io;
};

module.exports = { initializeSocket };
