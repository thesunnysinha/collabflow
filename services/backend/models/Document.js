const mongoose = require('mongoose');

const LANGUAGES = ['javascript', 'python', 'typescript', 'html', 'css', 'java', 'c_cpp', 'ruby'];
const THEMES = ['github', 'monokai', 'tomorrow', 'twilight'];

const documentSchema = new mongoose.Schema({
  title: { type: String, required: [true, 'Title is required'], trim: true, maxlength: 200 },
  content: { type: String, default: '' },
  language: { type: String, enum: LANGUAGES, default: 'python' },
  theme: { type: String, enum: THEMES, default: 'github' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  collaborators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

documentSchema.index({ collaborators: 1 });

const Document = mongoose.model('Document', documentSchema);
Document.LANGUAGES = LANGUAGES;
Document.THEMES = THEMES;

module.exports = Document;
