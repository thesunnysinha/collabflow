const http = require('http');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { io: connect } = require('socket.io-client');

jest.mock('../services/kafka/producer', () => ({
  sendDocumentUpdate: jest.fn().mockResolvedValue(undefined)
}));
const { sendDocumentUpdate } = require('../services/kafka/producer');
const { initializeSocket } = require('../services/socket');
const { handleMessage } = require('../services/kafka/consumer');
const { sanitizeChanges } = require('../services/updateSchema');
const User = require('../models/User');
const Document = require('../models/Document');
const { signToken } = require('../middleware/auth');

let mongod, server, ioServer, url;
const clients = [];

const client = (token) => {
  const c = connect(url, { auth: { token }, reconnection: false, forceNew: true });
  clients.push(c);
  return c;
};
const once = (c, ev) => new Promise((r) => c.once(ev, r));

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  server = http.createServer();
  ioServer = initializeSocket(server);
  await new Promise((r) => server.listen(0, r));
  url = `http://localhost:${server.address().port}`;
});
afterAll(async () => {
  clients.forEach((c) => c.close());
  ioServer.close();
  await mongoose.disconnect();
  await mongod.stop();
});
beforeEach(() => sendDocumentUpdate.mockClear());

describe('socket auth + access', () => {
  let alice, bob, doc;
  beforeAll(async () => {
    alice = await User.create({ username: 'alice', password: 'x' });
    bob = await User.create({ username: 'bob', password: 'x' });
    doc = await Document.create({ title: 'd', owner: alice._id });
  });

  it('rejects missing/invalid tokens', async () => {
    const c = client(undefined);
    expect((await once(c, 'connect_error')).message).toBe('Authentication failed');
    const d = client('nope');
    expect((await once(d, 'connect_error')).message).toBe('Authentication failed');
  });

  it('denies joining a document without access', async () => {
    const c = client(signToken(bob._id));
    await once(c, 'connect');
    c.emit('join-document', { documentId: String(doc._id) });
    expect(await once(c, 'app-error')).toBe('Document not found');
  });

  it('lets the owner join, uses server-side username, and publishes sanitized updates', async () => {
    const c = client(signToken(alice._id));
    await once(c, 'connect');
    c.emit('join-document', { documentId: String(doc._id), userName: 'spoofed' });
    const presence = await once(c, 'collaborators-update');
    expect(presence).toEqual([{ id: String(alice._id), name: 'alice' }]);

    c.emit('document-update', { content: 'hello', documentId: 'other', owner: 'x' });
    await new Promise((r) => setTimeout(r, 200));
    expect(sendDocumentUpdate).toHaveBeenCalledWith({
      documentId: String(doc._id), userId: String(alice._id), socketId: c.id, changes: { content: 'hello' }
    });

    c.emit('document-update', { language: 'cobol' });
    expect(await once(c, 'app-error')).toBe('Invalid update');
  });
});

describe('consumer', () => {
  it('persists valid updates and drops invalid ones', async () => {
    const u = await User.create({ username: 'carol', password: 'x' });
    const doc = await Document.create({ title: 'd', owner: u._id });
    const emit = jest.fn();
    const io = { to: jest.fn(() => ({ emit })) };

    await handleMessage(io, JSON.stringify({ documentId: String(doc._id), socketId: 's1', changes: { content: '' , title: ' New '} }));
    const saved = await Document.findById(doc._id);
    expect(saved.title).toBe('New');
    expect(emit).toHaveBeenCalledWith(`document-update-${doc._id}`, expect.objectContaining({ title: 'New', socketId: 's1' }));

    emit.mockClear();
    await handleMessage(io, 'not json');
    await handleMessage(io, JSON.stringify({ documentId: String(doc._id), changes: { theme: 'evil' } }));
    expect(emit).not.toHaveBeenCalled();
  });
});

describe('sanitizeChanges', () => {
  it('whitelists fields', () => {
    expect(sanitizeChanges({ content: '', owner: 'x' })).toEqual({ content: '' });
    expect(sanitizeChanges({})).toBeNull();
    expect(sanitizeChanges({ title: '   ' })).toBeNull();
    expect(sanitizeChanges({ content: 5 })).toBeNull();
    expect(sanitizeChanges('x')).toBeNull();
  });
});
