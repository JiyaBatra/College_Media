/**
 * Message Controller
 * Issue #933: Real-time WebSocket-Based Messaging with E2E Encryption
 * 
 * Encrypted message handling logic.
 */

const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const encryptionService = require('../services/encryptionService');
const { sendToConversation, sendToUser, isUserOnline } = require('../socket');
const messageQueue = require('../workers/messageQueue');

const messageController = {

    /**
     * POST /api/messages
     * Send encrypted message
     */
    async sendMessage(req, res) {
        try {
            const senderId = req.user._id;
            const {
                conversationId,
                recipientId,
                content,
                type = 'text',
                attachments = [],
                replyTo = null,
                expiresIn = null
            } = req.body;

            // Validate content is encrypted
            if (!content.encrypted || !content.iv) {
                return res.status(400).json({
                    success: false,
                    message: 'Message must be encrypted'
                });
            }

            // Get or create conversation
            let conversation;
            if (conversationId) {
                conversation = await Conversation.findById(conversationId);
                if (!conversation || !conversation.participants.includes(senderId)) {
                    return res.status(403).json({
                        success: false,
                        message: 'Cannot access this conversation'
                    });
                }
            } else if (recipientId) {
                conversation = await Conversation.findOrCreate(senderId, recipientId);
            } else {
                return res.status(400).json({
                    success: false,
                    message: 'conversationId or recipientId required'
                });
            }

            // Create message
            const message = await Message.create({
                conversationId: conversation._id,
                sender: senderId,
                recipient: recipientId || conversation.participants.find(p => p.toString() !== senderId.toString()),
                content: {
                    encrypted: content.encrypted,
                    iv: content.iv,
                    authTag: content.authTag,
                    algorithm: content.algorithm || 'aes-256-gcm'
                },
                type,
                attachments,
                replyTo,
                status: 'sent',
                sentAt: new Date(),
                expiresAt: expiresIn ? new Date(Date.now() + expiresIn) : null,
                tenantId: req.tenant?._id
            });

            // Update conversation
            await conversation.updateLastMessage(message);

            // Populate sender info
            await message.populate('sender', 'username avatar');

            // Send via WebSocket if recipient is online
            const recipient = message.recipient.toString();
            if (isUserOnline(recipient)) {
                sendToConversation(conversation._id.toString(), 'message:new', {
                    message: {
                        _id: message._id,
                        conversationId: conversation._id,
                        sender: message.sender,
                        content: message.content,
                        type: message.type,
                        sentAt: message.sentAt,
                        status: message.status
                    }
                });
            } else {
                // Queue for offline delivery
                await messageQueue.queueMessage(message);
            }

            res.json({
                success: true,
                data: { message }
            });
        } catch (error) {
            console.error('Send message error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to send message'
            });
        }
    },

    /**
     * GET /api/messages/conversation/:conversationId
     * Get conversation messages
     */
    async getMessages(req, res) {
        try {
            const userId = req.user._id;
            const { conversationId } = req.params;
            const { limit = 50, before, after } = req.query;

            // Verify access
            const conversation = await Conversation.findOne({
                _id: conversationId,
                participants: userId
            });

            if (!conversation) {
                return res.status(403).json({
                    success: false,
                    message: 'Cannot access this conversation'
                });
            }

            const messages = await Message.getConversationMessages(conversationId, {
                limit: parseInt(limit),
                before: before ? new Date(before) : null,
                after: after ? new Date(after) : null,
                userId
            });

            // Mark messages as read
            await Message.markAllRead(userId, conversationId);

            // Notify sender of read status
            sendToConversation(conversationId, 'messages:read', {
                conversationId,
                readBy: userId,
                readAt: new Date()
            });

            res.json({
                success: true,
                data: {
                    messages: messages.reverse(),
                    hasMore: messages.length === parseInt(limit)
                }
            });
        } catch (error) {
            console.error('Get messages error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get messages'
            });
        }
    },

    /**
     * GET /api/messages/conversations
     * Get user's conversations
     */
    async getConversations(req, res) {
        try {
            const userId = req.user._id;
            const { limit = 20, skip = 0 } = req.query;

            const conversations = await Conversation.find({
                participants: userId
            })
                .populate('participants', 'username avatar lastActive')
                .populate('lastMessage.sender', 'username')
                .sort({ 'lastMessage.sentAt': -1 })
                .skip(parseInt(skip))
                .limit(parseInt(limit))
                .lean();

            // Get unread counts
            const conversationsWithUnread = await Promise.all(
                conversations.map(async conv => ({
                    ...conv,
                    unreadCount: await Message.getUnreadCount(userId, conv._id)
                }))
            );

            res.json({
                success: true,
                data: { conversations: conversationsWithUnread }
            });
        } catch (error) {
            console.error('Get conversations error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get conversations'
            });
        }
    },

    /**
     * PUT /api/messages/:messageId/read
     * Mark message as read
     */
    async markRead(req, res) {
        try {
            const userId = req.user._id;
            const { messageId } = req.params;

            const message = await Message.findById(messageId);

            if (!message) {
                return res.status(404).json({
                    success: false,
                    message: 'Message not found'
                });
            }

            await message.markRead(userId);

            // Notify sender
            sendToUser(message.sender.toString(), 'message:read', {
                messageId,
                readBy: userId,
                readAt: new Date()
            });

            res.json({
                success: true,
                message: 'Message marked as read'
            });
        } catch (error) {
            console.error('Mark read error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to mark message as read'
            });
        }
    },

    /**
     * DELETE /api/messages/:messageId
     * Delete message
     */
    async deleteMessage(req, res) {
        try {
            const userId = req.user._id;
            const { messageId } = req.params;
            const { forEveryone = false } = req.body;

            const message = await Message.findById(messageId);

            if (!message) {
                return res.status(404).json({
                    success: false,
                    message: 'Message not found'
                });
            }

            // Only sender can delete for everyone
            if (forEveryone && message.sender.toString() !== userId.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Cannot delete this message for everyone'
                });
            }

            await message.softDelete(forEveryone ? null : userId);

            if (forEveryone) {
                sendToConversation(message.conversationId.toString(), 'message:deleted', {
                    messageId
                });
            }

            res.json({
                success: true,
                message: 'Message deleted'
            });
        } catch (error) {
            console.error('Delete message error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete message'
            });
        }
    },

    /**
     * POST /api/messages/keys/exchange
     * Exchange encryption keys
     */
    async exchangeKeys(req, res) {
        try {
            const userId = req.user._id;
            const { recipientId, publicKey } = req.body;

            // Store public key for user
            await req.user.updateOne({
                'encryption.publicKey': publicKey
            });

            // Notify recipient
            if (isUserOnline(recipientId)) {
                sendToUser(recipientId, 'keys:received', {
                    senderId: userId,
                    publicKey
                });
            }

            res.json({
                success: true,
                message: 'Keys exchanged'
            });
        } catch (error) {
            console.error('Key exchange error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to exchange keys'
            });
        }
    },

    /**
     * GET /api/messages/keys/:userId
     * Get user's public key
     */
    async getPublicKey(req, res) {
        try {
            const { userId } = req.params;

            const user = await require('../models/User').findById(userId)
                .select('encryption.publicKey');

            if (!user || !user.encryption?.publicKey) {
                return res.status(404).json({
                    success: false,
                    message: 'Public key not found'
                });
            }

            res.json({
                success: true,
                data: {
                    userId,
                    publicKey: user.encryption.publicKey
                }
            });
        } catch (error) {
            console.error('Get public key error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get public key'
            });
        }
    }
};

module.exports = messageController;
