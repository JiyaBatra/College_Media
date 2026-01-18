/**
 * Message Queue Worker
 * Issue #933: Real-time WebSocket-Based Messaging with E2E Encryption
 * 
 * Offline message queuing system.
 */

const Message = require('../models/Message');
const { sendToUser, isUserOnline } = require('../socket');

class MessageQueue {

    constructor() {
        this.queue = new Map(); // userId -> messages[]
        this.retryInterval = 30000; // 30 seconds
        this.maxRetries = 10;
        this.isRunning = false;
        this.checkInterval = null;
    }

    /**
     * Start the queue processor
     */
    start() {
        if (this.isRunning) return;

        this.isRunning = true;
        console.log('[MessageQueue] Started');

        // Check for pending messages periodically
        this.checkInterval = setInterval(() => this.processQueue(), this.retryInterval);
    }

    /**
     * Stop the queue processor
     */
    stop() {
        this.isRunning = false;
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        console.log('[MessageQueue] Stopped');
    }

    /**
     * Queue a message for offline delivery
     */
    async queueMessage(message) {
        const recipientId = message.recipient.toString();

        if (!this.queue.has(recipientId)) {
            this.queue.set(recipientId, []);
        }

        this.queue.get(recipientId).push({
            messageId: message._id,
            conversationId: message.conversationId,
            sender: message.sender,
            sentAt: message.sentAt,
            retries: 0,
            queuedAt: new Date()
        });

        console.log(`[MessageQueue] Queued message for user ${recipientId}`);
    }

    /**
     * Process the queue and deliver messages to online users
     */
    async processQueue() {
        if (!this.isRunning) return;

        for (const [userId, messages] of this.queue.entries()) {
            if (messages.length === 0) {
                this.queue.delete(userId);
                continue;
            }

            // Check if user is now online
            if (isUserOnline(userId)) {
                console.log(`[MessageQueue] Delivering ${messages.length} messages to user ${userId}`);

                const delivered = [];

                for (const queuedMessage of messages) {
                    try {
                        // Fetch full message
                        const message = await Message.findById(queuedMessage.messageId)
                            .populate('sender', 'username avatar');

                        if (message && message.status === 'sent') {
                            // Deliver via WebSocket
                            sendToUser(userId, 'message:new', {
                                message: {
                                    _id: message._id,
                                    conversationId: message.conversationId,
                                    sender: message.sender,
                                    content: message.content,
                                    type: message.type,
                                    sentAt: message.sentAt,
                                    status: message.status,
                                    offline: true // Flag to indicate it was queued
                                }
                            });

                            // Mark as delivered
                            await message.markDelivered(userId);

                            delivered.push(queuedMessage.messageId.toString());
                        }
                    } catch (error) {
                        console.error(`[MessageQueue] Delivery error:`, error);
                        queuedMessage.retries++;
                    }
                }

                // Remove delivered messages from queue
                const remaining = messages.filter(
                    m => !delivered.includes(m.messageId.toString()) && m.retries < this.maxRetries
                );

                if (remaining.length > 0) {
                    this.queue.set(userId, remaining);
                } else {
                    this.queue.delete(userId);
                }
            }
        }
    }

    /**
     * Get pending messages for user
     */
    async getPendingMessages(userId) {
        try {
            const messages = await Message.find({
                recipient: userId,
                status: 'sent',
                deleted: false
            })
                .populate('sender', 'username avatar')
                .sort({ sentAt: 1 })
                .limit(100)
                .lean();

            return messages;
        } catch (error) {
            console.error('[MessageQueue] Get pending error:', error);
            return [];
        }
    }

    /**
     * Deliver all pending messages to user (when they come online)
     */
    async deliverPendingMessages(userId) {
        try {
            const pendingMessages = await this.getPendingMessages(userId);

            if (pendingMessages.length === 0) return;

            console.log(`[MessageQueue] Delivering ${pendingMessages.length} pending messages to ${userId}`);

            // Send all at once
            sendToUser(userId, 'messages:pending', {
                messages: pendingMessages
            });

            // Mark all as delivered
            const messageIds = pendingMessages.map(m => m._id);
            await Message.updateMany(
                { _id: { $in: messageIds } },
                {
                    $set: { status: 'delivered' },
                    $push: {
                        deliveredTo: {
                            userId,
                            deliveredAt: new Date()
                        }
                    }
                }
            );

            // Notify senders
            const senderIds = [...new Set(pendingMessages.map(m => m.sender._id.toString()))];
            for (const senderId of senderIds) {
                const senderMessages = pendingMessages
                    .filter(m => m.sender._id.toString() === senderId)
                    .map(m => m._id);

                sendToUser(senderId, 'messages:delivered', {
                    messageIds: senderMessages,
                    deliveredTo: userId,
                    deliveredAt: new Date()
                });
            }

        } catch (error) {
            console.error('[MessageQueue] Deliver pending error:', error);
        }
    }

    /**
     * Get queue status
     */
    getStatus() {
        let totalQueued = 0;
        const userCounts = {};

        for (const [userId, messages] of this.queue.entries()) {
            totalQueued += messages.length;
            userCounts[userId] = messages.length;
        }

        return {
            isRunning: this.isRunning,
            totalQueued,
            userCounts,
            queuedUsers: this.queue.size
        };
    }

    /**
     * Clear queue for user
     */
    clearForUser(userId) {
        this.queue.delete(userId);
    }

    /**
     * Clear entire queue
     */
    clearAll() {
        this.queue.clear();
    }
}

module.exports = new MessageQueue();
