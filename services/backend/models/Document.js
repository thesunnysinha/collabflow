const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, default: "" },
}, { timestamps: true });

const Document = mongoose.model('Document', documentSchema);
module.exports = Document;
