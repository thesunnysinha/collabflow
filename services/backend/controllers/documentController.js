const Document = require('../models/Document');
const User = require('../models/User');
const { getAccessibleDocument, isId } = require('../services/documentAccess');
const { ok } = require('../utils/envelope');
const { NotFoundError, ForbiddenError, ValidationError } = require('../utils/errors');

const summary = '_id title language theme owner updatedAt createdAt';

exports.listDocuments = async (req, res) => {
  const docs = await Document.find({ $or: [{ owner: req.user.id }, { collaborators: req.user.id }] })
    .select(summary).sort({ updatedAt: -1 }).limit(200).lean();
  res.json(ok(docs, req.id));
};

exports.createDocument = async (req, res) => {
  const { title, content, language, theme } = req.body;
  const doc = await Document.create({ title, content, language, theme, owner: req.user.id });
  res.status(201).json(ok(doc, req.id));
};

exports.getDocument = async (req, res) => {
  const doc = await getAccessibleDocument(req.params.id, req.user.id);
  await doc.populate('collaborators', 'username');
  res.json(ok(doc, req.id, { isOwner: String(doc.owner) === req.user.id }));
};

exports.updateDocument = async (req, res) => {
  const doc = await getAccessibleDocument(req.params.id, req.user.id);
  for (const key of ['title', 'content', 'language', 'theme']) {
    if (req.body[key] !== undefined) doc[key] = req.body[key];
  }
  await doc.save();
  res.json(ok(doc, req.id));
};

exports.deleteDocument = async (req, res) => {
  const doc = await getAccessibleDocument(req.params.id, req.user.id);
  if (String(doc.owner) !== req.user.id) throw new ForbiddenError('Only the owner can delete a document');
  await doc.deleteOne();
  res.status(204).end();
};

exports.addCollaborator = async (req, res) => {
  const doc = await getAccessibleDocument(req.params.id, req.user.id);
  if (String(doc.owner) !== req.user.id) throw new ForbiddenError('Only the owner can share a document');
  const user = await User.findOne({ username: String(req.body.username).toLowerCase() }).sort({ updatedAt: -1 });
  if (!user) throw new NotFoundError('User not found');
  if (String(user._id) === String(doc.owner)) throw new ValidationError('Owner already has access');
  await Document.updateOne({ _id: doc._id }, { $addToSet: { collaborators: user._id } });
  res.status(201).json(ok({ id: user._id, username: user.username }, req.id));
};

exports.removeCollaborator = async (req, res) => {
  const doc = await getAccessibleDocument(req.params.id, req.user.id);
  if (String(doc.owner) !== req.user.id) throw new ForbiddenError('Only the owner can change sharing');
  if (!isId(req.params.userId)) throw new NotFoundError('User not found');
  await Document.updateOne({ _id: doc._id }, { $pull: { collaborators: req.params.userId } });
  res.status(204).end();
};
