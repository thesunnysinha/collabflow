const mongoose = require('mongoose');
const Document = require('../models/Document');
const { NotFoundError } = require('../utils/errors');

const isId = (id) => mongoose.Types.ObjectId.isValid(id);

const hasAccess = (doc, userId) =>
  String(doc.owner) === String(userId) || doc.collaborators.some((c) => String(c) === String(userId));

// Returns the document if the user owns it or collaborates on it. Responds with
// NotFound in both "missing" and "no access" cases so ids can't be probed.
async function getAccessibleDocument(id, userId) {
  if (!isId(id)) throw new NotFoundError('Document not found');
  const doc = await Document.findById(id);
  if (!doc || !hasAccess(doc, userId)) throw new NotFoundError('Document not found');
  return doc;
}

module.exports = { getAccessibleDocument, hasAccess, isId };
