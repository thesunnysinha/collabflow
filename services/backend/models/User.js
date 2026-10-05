const mongoose = require('mongoose');

// Accounts are created on first GitHub sign-in; there are no passwords.
const userSchema = new mongoose.Schema({
  githubId: { type: Number, required: true, unique: true },
  // GitHub login (lowercased). Refreshed on every sign-in because GitHub users can rename.
  username: { type: String, required: true, trim: true, lowercase: true, index: true },
  avatarUrl: { type: String }
}, { timestamps: true });

userSchema.set('toJSON', {
  transform: (doc, ret) => ({ id: ret._id, username: ret.username, avatarUrl: ret.avatarUrl })
});

module.exports = mongoose.model('User', userSchema);
