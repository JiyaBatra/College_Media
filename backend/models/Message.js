/**
 * Message Model
 * Issue #933: Real-time WebSocket-Based Messaging with E2E Encryption
 * 
 * Message model with encryption fields and delivery status tracking.
 */

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    // Conversation reference
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true,
        index: true
    },

    // Sender
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // Recipient (for direct messages)
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },

    // Message content (encrypted)
    content: {
        // Encrypted message content
        encrypted: {
            type: String,
            required: true
        },
        // Initialization vector for decryption
        iv: {
            type: String,
            required: true
        },
        // Encryption algorithm used
        algorithm: {
            type: String,
            default: 'aes-256-gcm'
        },
        // Auth tag for GCM mode
        authTag: String
    },

    // Message type
    type: {
        type: String,
        enum: ['text', 'image', 'video', 'audio', 'file', 'location', 'system'],
        default: 'text'
    },

    // Attachments (encrypted file references)
    attachments: [{
        type: {
            type: String,
            enum: ['image', 'video', 'audio', 'file']
        },
        encryptedUrl: String,
        iv: String,
        fileName: String,
        fileSize: Number,
        mimeType: String,
        thumbnailUrl: String
    }],

    // Reply to another message
    replyTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    },

    // Delivery status
    status: {
        type: String,
        enum: ['sending', 'sent', 'delivered', 'read', 'failed'],
        default: 'sending',
        index: true
    },

    // Delivery tracking
    deliveredTo: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        deliveredAt: Date
    }],

    // Read receipts
    readBy: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        readAt: Date
    }],

    // Timestamps
    sentAt: {
        type: Date,
        default: Date.now
    },

    // Edit history
    edited: {
        type: Boolean,
        default: false
    },

    editedAt: Date,

    // Deletion (soft delete)
    deleted: {
        type: Boolean,
        default: false
    },

    deletedAt: Date,

    deletedFor: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],

    // Expiring messages
    expiresAt: {
        type: Date,
        index: true
    },

    // Tenant for multi-tenancy
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        index: true
    },

    // Metadata
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true
});

// Compound indexes
messageSchema.index({ conversationId: 1, sentAt: -1 });
messageSchema.index({ sender: 1, sentAt: -1 });
messageSchema.index({ recipient: 1, status: 1 });

// Mark message as delivered
messageSchema.methods.markDelivered = function (userId) {
    const alreadyDelivered = this.deliveredTo.some(
        d => d.userId.toString() === userId.toString()
    );

    if (!alreadyDelivered) {
        this.deliveredTo.push({
            userId,
            deliveredAt: new Date()
        });

        if (this.status === 'sent') {
            this.status = 'delivered';
        }
    }

    return this.save();
};

// Mark message as read
messageSchema.methods.markRead = function (userId) {
    const alreadyRead = this.readBy.some(
        r => r.userId.toString() === userId.toString()
    );

    if (!alreadyRead) {
        this.readBy.push({
            userId,
            readAt: new Date()
        });

        this.status = 'read';
    }

    return this.save();
};

// Soft delete message
messageSchema.methods.softDelete = function (userId = null) {
    if (userId) {
        // Delete for specific user
        if (!this.deletedFor.includes(userId)) {
            this.deletedFor.push(userId);
        }
    } else {
        // Delete for everyone
        this.deleted = true;
        this.deletedAt = new Date();
    }

    return this.save();
};

// Get conversation messages
messageSchema.statics.getConversationMessages = function (conversationId, options = {}) {
    const { limit = 50, before, after, userId } = options;

    const query = {
        conversationId,
        deleted: false
    };

    // Exclude messages deleted for this user
    if (userId) {
        query.deletedFor = { $ne: userId };
    }

    if (before) {
        query.sentAt = { $lt: before };
    }

    if (after) {
        query.sentAt = { $gt: after };
    }

    return this.find(query)
        .sort({ sentAt: -1 })
        .limit(limit)
        .populate('sender', 'username avatar')
        .populate('replyTo', 'content.encrypted sender')
        .lean();
};

// Get unread count
messageSchema.statics.getUnreadCount = function (userId, conversationId = null) {
    const query = {
        recipient: userId,
        status: { $in: ['sent', 'delivered'] },
        deleted: false,
        deletedFor: { $ne: userId }
    };

    if (conversationId) {
        query.conversationId = conversationId;
    }

    return this.countDocuments(query);
};

// Mark all as read
messageSchema.statics.markAllRead = function (userId, conversationId) {
    return this.updateMany(
        {
            conversationId,
            recipient: userId,
            status: { $in: ['sent', 'delivered'] }
        },
        {
            $set: { status: 'read' },
            $push: {
                readBy: {
                    userId,
                    readAt: new Date()
                }
            }
        }
    );
};

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
