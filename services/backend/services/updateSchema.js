const Document = require('../models/Document');
const { MAX_DOCUMENT_BYTES } = require('../config/env');

// Whitelists and validates a client-supplied partial update.
// Returns the cleaned changes object, or null if empty/invalid.
function sanitizeChanges(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const out = {};

  if ('content' in input) {
    if (typeof input.content !== 'string' || Buffer.byteLength(input.content) > MAX_DOCUMENT_BYTES) return null;
    out.content = input.content;
  }
  if ('title' in input) {
    if (typeof input.title !== 'string') return null;
    const t = input.title.trim();
    if (!t || t.length > 200) return null;
    out.title = t;
  }
  if ('language' in input) {
    if (!Document.LANGUAGES.includes(input.language)) return null;
    out.language = input.language;
  }
  if ('theme' in input) {
    if (!Document.THEMES.includes(input.theme)) return null;
    out.theme = input.theme;
  }
  return Object.keys(out).length ? out : null;
}

module.exports = { sanitizeChanges };
