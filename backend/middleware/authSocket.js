/**
 * Socket Authentication Middleware
 * Issue #933: Real-time WebSocket-Based Messaging with E2E Encryption
 * 
 * WebSocket authentication middleware for secure connections.
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Socket.IO authentication middleware
 */
const socketAuthMiddleware = async (socket, next) => {
    try {
        // Get token from handshake auth or query
        const token = socket.handshake.auth?.token ||
            socket.handshake.query?.token ||
            socket.handshake.headers?.authorization?.replace('Bearer ', '');

        if (!token) {
            return next(new Error('Authentication token required'));
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

        // Get user from database
        const user = await User.findById(decoded.userId || decoded.id || decoded._id)
            .select('-password -tokens');

        if (!user) {
            return next(new Error('User not found'));
        }

        // Check if user is active
        if (user.status === 'suspended' || user.status === 'banned') {
            return next(new Error('Account suspended'));
        }

        // Attach user to socket
        socket.user = user;
        socket.userId = user._id.toString();

        // Track last activity
        User.findByIdAndUpdate(user._id, {
            lastActive: new Date(),
            lastSocketConnection: new Date()
        }).catch(err => console.error('[Socket Auth] Last active update error:', err));

        console.log(`[Socket Auth] User authenticated: ${user.username}`);

        next();
    } catch (error) {
        console.error('[Socket Auth] Authentication error:', error.message);

        if (error.name === 'TokenExpiredError') {
            return next(new Error('Token expired'));
        }

        if (error.name === 'JsonWebTokenError') {
            return next(new Error('Invalid token'));
        }

        next(new Error('Authentication failed'));
    }
};

/**
 * Verify socket connection for specific operations
 */
const verifySocketConnection = (socket) => {
    if (!socket.user) {
        throw new Error('Not authenticated');
    }

    return socket.user;
};

/**
 * Check if user can access conversation
 */
const canAccessConversation = async (userId, conversationId) => {
    try {
        const Conversation = require('../models/Conversation');

        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: userId
        });

        return !!conversation;
    } catch (error) {
        console.error('[Socket Auth] Conversation access check error:', error);
        return false;
    }
};

/**
 * Check if user can message recipient
 */
const canMessageUser = async (senderId, recipientId) => {
    try {
        const User = require('../models/User');

        const recipient = await User.findById(recipientId);

        if (!recipient) {
            return false;
        }

        // Check if blocked
        if (recipient.blockedUsers?.includes(senderId)) {
            return false;
        }

        // Check privacy settings
        if (recipient.settings?.messagePrivacy === 'following') {
            return recipient.following?.includes(senderId);
        }

        return true;
    } catch (error) {
        console.error('[Socket Auth] Message permission check error:', error);
        return false;
    }
};

module.exports = socketAuthMiddleware;
module.exports.verifySocketConnection = verifySocketConnection;
module.exports.canAccessConversation = canAccessConversation;
module.exports.canMessageUser = canMessageUser;
