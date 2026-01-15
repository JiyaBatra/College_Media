const mongoose = require('mongoose');

/**
 * DocumentChunk Model
 * Stores parsed document chunks with vector embeddings for RAG
 */
const documentChunkSchema = new mongoose.Schema({
    documentId: {
        type: String,
        required: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    fileName: {
        type: String,
        required: true
    },
    chunkIndex: {
        type: Number,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    // Vector embedding (1536 dimensions for text-embedding-ada-002)
    embedding: {
        type: [Number],
        required: true,
        validate: [arr => arr.length === 1536, 'Embedding must have 1536 dimensions']
    },
    metadata: {
        pageNumber: Number,
        totalPages: Number,
        charCount: Number
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for similarity search (MongoDB Atlas Vector Search compatible)
// Note: In production, create Atlas Vector Search index via MongoDB Atlas UI
documentChunkSchema.index({ documentId: 1, chunkIndex: 1 });
documentChunkSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('DocumentChunk', documentChunkSchema);
