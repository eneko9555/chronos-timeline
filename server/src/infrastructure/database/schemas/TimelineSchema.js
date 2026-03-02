const mongoose = require('mongoose');

// Embedded Event Schema
const EventSchema = new mongoose.Schema({
    id: { type: String, required: true }, // UUID from frontend
    title: String,
    start: Date,
    end: Date,
    color: String,
    parentId: String,
    isParent: Boolean,
    type: String,
    order: Number,

    isMilestone: Boolean,
    description: String,
    mediaUrls: [String],
    geo: {
        lat: Number,
        lng: Number,
        name: String
    },
    tags: [String]
});

const NoteSchema = new mongoose.Schema({
    id: { type: String, required: true },
    text: { type: String, default: '' },
    x: Number,    // absolute timestamp (ms)
    y: Number,    // vertical position in px
    width: Number,
    height: Number,
    color: { type: String, default: '#fbbf24' }
});

const TimelineSchema = new mongoose.Schema({
    userId: { type: String, required: true, ref: 'User' },
    identifier: { type: String, required: true, default: 'default' },
    description: { type: String, default: '' },
    coverImage: { type: String, default: '' },
    themeId: { type: String, default: 'chronos' },
    events: [EventSchema],
    notes: [NoteSchema],
    updatedAt: { type: Date, default: Date.now }
});

// Compound index to ensure one 'default' timeline per user, or generally unique identifiers per user
TimelineSchema.index({ userId: 1, identifier: 1 }, { unique: true });

module.exports = mongoose.model('Timeline', TimelineSchema);
