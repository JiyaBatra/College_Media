const mongoose = require('mongoose');

const collectionSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    posts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post'
    }],
    color: {
        type: String,
        default: '#6366F1' // Indigo
    },
    isPublic: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

// Ensure unique collection names per user
collectionSchema.index({ userId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Collection', collectionSchema);
