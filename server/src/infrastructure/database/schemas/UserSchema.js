const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    _id: { type: String, required: true }, // Google UID
    email: { type: String, required: true },
    displayName: String,
    photoURL: String,
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
