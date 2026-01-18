/**
 * WebSocket Server
 * Issue #933: Real-time WebSocket-Based Messaging with E2E Encryption
 * 
 * Implements WebSocket server with rooms and authentication.
 */

const { Server } = require('socket.io');
const socketAuthMiddleware = require('../middleware/authSocket');

let io = null;

// Connected users map
const connectedUsers = new Map();

// User socket rooms map
const userRooms = new Map();

/**
 * Initialize WebSocket server
 */
function initializeSocket(server) {
    io = new Server(server, {
        cors: {
            origin: process.env.CLIENT_URL || 'http://localhost:3000',
            methods: ['GET', 'POST'],
            credentials: true
        },
        pingTimeout: 60000,
        pingInterval: 25000
    });

    // Apply authentication middleware
    io.use(socketAuthMiddleware);

    // Connection handler
    io.on('connection', (socket) => {
        const userId = socket.user._id.toString();

        console.log(`[Socket] User connected: ${userId}`);

        // Add to connected users
        connectedUsers.set(userId, {
            socketId: socket.id,
            user: socket.user,
            connectedAt: new Date()
        });

        // Join user's personal room
        socket.join(`user:${userId}`);

        // Broadcast online status
        broadcastUserStatus(userId, 'online');

        // Handle joining conversation rooms
        socket.on('join:conversation', (conversationId) => {
            socket.join(`conversation:${conversationId}`);

            // Track user rooms
            if (!userRooms.has(userId)) {
                userRooms.set(userId, new Set());
            }
            userRooms.get(userId).add(conversationId);

            console.log(`[Socket] User ${userId} joined conversation: ${conversationId}`);
        });

        // Handle leaving conversation rooms
        socket.on('leave:conversation', (conversationId) => {
            socket.leave(`conversation:${conversationId}`);

            if (userRooms.has(userId)) {
                userRooms.get(userId).delete(conversationId);
            }
        });

        // Handle sending messages
        socket.on('message:send', async (data) => {
            try {
                const { conversationId, encryptedContent, recipientId, messageId } = data;

                // Emit to conversation room
                socket.to(`conversation:${conversationId}`).emit('message:new', {
                    conversationId,
                    encryptedContent,
                    senderId: userId,
                    messageId,
                    timestamp: new Date().toISOString()
                });

                // Emit to recipient's personal room for push notification
                io.to(`user:${recipientId}`).emit('message:notification', {
                    conversationId,
                    senderId: userId,
                    senderName: socket.user.username
                });

                // Acknowledge receipt
                socket.emit('message:sent', { messageId, status: 'sent' });

            } catch (error) {
                console.error('[Socket] Message send error:', error);
                socket.emit('message:error', { error: 'Failed to send message' });
            }
        });

        // Handle typing indicators
        socket.on('typing:start', (data) => {
            socket.to(`conversation:${data.conversationId}`).emit('typing:start', {
                userId,
                username: socket.user.username,
                conversationId: data.conversationId
            });
        });

        socket.on('typing:stop', (data) => {
            socket.to(`conversation:${data.conversationId}`).emit('typing:stop', {
                userId,
                conversationId: data.conversationId
            });
        });

        // Handle message delivery receipt
        socket.on('message:delivered', (data) => {
            const { messageId, conversationId } = data;

            socket.to(`conversation:${conversationId}`).emit('message:delivered', {
                messageId,
                deliveredAt: new Date().toISOString(),
                deliveredBy: userId
            });
        });

        // Handle message read receipt
        socket.on('message:read', (data) => {
            const { messageId, conversationId } = data;

            socket.to(`conversation:${conversationId}`).emit('message:read', {
                messageId,
                readAt: new Date().toISOString(),
                readBy: userId
            });
        });

        // Handle presence updates
        socket.on('presence:update', (status) => {
            broadcastUserStatus(userId, status);
        });

        // Handle key exchange for E2E encryption
        socket.on('keys:exchange', (data) => {
            const { recipientId, publicKey } = data;

            io.to(`user:${recipientId}`).emit('keys:received', {
                senderId: userId,
                publicKey
            });
        });

        // Handle disconnect
        socket.on('disconnect', () => {
            console.log(`[Socket] User disconnected: ${userId}`);

            connectedUsers.delete(userId);
            userRooms.delete(userId);

            // Broadcast offline status with delay (in case of reconnect)
            setTimeout(() => {
                if (!connectedUsers.has(userId)) {
                    broadcastUserStatus(userId, 'offline');
                }
            }, 5000);
        });

        // Handle errors
        socket.on('error', (error) => {
            console.error(`[Socket] Error for user ${userId}:`, error);
        });
    });

    console.log('[Socket] WebSocket server initialized');

    return io;
}

/**
 * Broadcast user status to their contacts
 */
function broadcastUserStatus(userId, status) {
    io.emit('user:status', {
        userId,
        status,
        timestamp: new Date().toISOString()
    });
}

/**
 * Send message to specific user
 */
function sendToUser(userId, event, data) {
    io.to(`user:${userId}`).emit(event, data);
}

/**
 * Send message to conversation
 */
function sendToConversation(conversationId, event, data) {
    io.to(`conversation:${conversationId}`).emit(event, data);
}

/**
 * Check if user is online
 */
function isUserOnline(userId) {
    return connectedUsers.has(userId);
}

/**
 * Get online users
 */
function getOnlineUsers() {
    return Array.from(connectedUsers.keys());
}

/**
 * Get socket instance
 */
function getIO() {
    return io;
}

module.exports = {
    initializeSocket,
    sendToUser,
    sendToConversation,
    isUserOnline,
    getOnlineUsers,
    getIO
};
