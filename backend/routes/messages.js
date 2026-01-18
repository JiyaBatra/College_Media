/**
 * Message Routes
 * Issue #933: Real-time WebSocket-Based Messaging with E2E Encryption
 * 
 * API endpoints for encrypted messaging.
 */

const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');

// Middleware (simplified - use actual auth middleware in production)
const authMiddleware = (req, res, next) => next();

/**
 * @swagger
 * /api/messages:
 *   post:
 *     summary: Send encrypted message
 *     tags: [Messages]
 */
router.post('/', authMiddleware, messageController.sendMessage);

/**
 * @swagger
 * /api/messages/conversations:
 *   get:
 *     summary: Get user's conversations
 *     tags: [Messages]
 */
router.get('/conversations', authMiddleware, messageController.getConversations);

/**
 * @swagger
 * /api/messages/conversation/:conversationId:
 *   get:
 *     summary: Get conversation messages
 *     tags: [Messages]
 */
router.get('/conversation/:conversationId', authMiddleware, messageController.getMessages);

/**
 * @swagger
 * /api/messages/:messageId/read:
 *   put:
 *     summary: Mark message as read
 *     tags: [Messages]
 */
router.put('/:messageId/read', authMiddleware, messageController.markRead);

/**
 * @swagger
 * /api/messages/:messageId:
 *   delete:
 *     summary: Delete message
 *     tags: [Messages]
 */
router.delete('/:messageId', authMiddleware, messageController.deleteMessage);

/**
 * @swagger
 * /api/messages/keys/exchange:
 *   post:
 *     summary: Exchange encryption keys
 *     tags: [Messages]
 */
router.post('/keys/exchange', authMiddleware, messageController.exchangeKeys);

/**
 * @swagger
 * /api/messages/keys/:userId:
 *   get:
 *     summary: Get user's public key
 *     tags: [Messages]
 */
router.get('/keys/:userId', authMiddleware, messageController.getPublicKey);

module.exports = router;
