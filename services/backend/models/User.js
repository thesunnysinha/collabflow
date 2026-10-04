const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, lowercase: true, minlength: 3, maxlength: 32 },
  password: { type: String, required: true }
}, { timestamps: true });

userSchema.set('toJSON', {
  transform: (doc, ret) => ({ id: ret._id, username: ret.username })
});

module.exports = mongoose.model('User', userSchema);
