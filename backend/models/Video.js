const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    originalUrl: {
        type: String,
        required: true
    },
    hlsUrl: {
        type: String,
    },
    qualities: [{
        resolution: String, // e.g., '1080p', '720p'
        url: String
    }],
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
    },
    duration: Number, // in seconds
    thumbnail: String,
    uploader: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Video', videoSchema);
