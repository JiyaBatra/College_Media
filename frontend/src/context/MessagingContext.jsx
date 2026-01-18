/**
 * MessagingContext
 * Issue #933: Real-time WebSocket-Based Messaging with E2E Encryption
 * 
 * WebSocket-based real-time messaging context.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { encryption } from '../utils/encryption';
import { messagesApi } from '../api/endpoints';
import toast from 'react-hot-toast';

const MessagingContext = createContext(null);

export const MessagingProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [connected, setConnected] = useState(false);
    const [conversations, setConversations] = useState([]);
    const [activeConversation, setActiveConversation] = useState(null);
    const [messages, setMessages] = useState({});
    const [typingUsers, setTypingUsers] = useState({});
    const [onlineUsers, setOnlineUsers] = useState(new Set());
    const [unreadCounts, setUnreadCounts] = useState({});
    const [loading, setLoading] = useState(false);

    const typingTimeoutRef = useRef({});
    const keyPairRef = useRef(null);

    /**
     * Initialize WebSocket connection
     */
    const connect = useCallback((token) => {
        if (socket?.connected) return;

        const newSocket = io(process.env.REACT_APP_WS_URL || 'http://localhost:5000', {
            auth: { token },
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000
        });

        newSocket.on('connect', () => {
            console.log('[Messaging] Connected');
            setConnected(true);
        });

        newSocket.on('disconnect', () => {
            console.log('[Messaging] Disconnected');
            setConnected(false);
        });

        newSocket.on('connect_error', (error) => {
            console.error('[Messaging] Connection error:', error.message);
            setConnected(false);
        });

        // Handle incoming messages
        newSocket.on('message:new', async (data) => {
            await handleNewMessage(data);
        });

        // Handle message status updates
        newSocket.on('message:delivered', (data) => {
            updateMessageStatus(data.messageId, 'delivered');
        });

        newSocket.on('message:read', (data) => {
            updateMessageStatus(data.messageId, 'read');
        });

        newSocket.on('messages:read', (data) => {
            markConversationRead(data.conversationId, data.readBy);
        });

        // Handle typing indicators
        newSocket.on('typing:start', (data) => {
            setTypingUsers(prev => ({
                ...prev,
                [data.conversationId]: [...(prev[data.conversationId] || []), data.username]
            }));
        });

        newSocket.on('typing:stop', (data) => {
            setTypingUsers(prev => ({
                ...prev,
                [data.conversationId]: (prev[data.conversationId] || []).filter(u => u !== data.username)
            }));
        });

        // Handle user status
        newSocket.on('user:status', (data) => {
            setOnlineUsers(prev => {
                const updated = new Set(prev);
                if (data.status === 'online') {
                    updated.add(data.userId);
                } else {
                    updated.delete(data.userId);
                }
                return updated;
            });
        });

        // Handle pending messages (on reconnect)
        newSocket.on('messages:pending', (data) => {
            data.messages.forEach(msg => handleNewMessage({ message: msg }));
        });

        // Handle key exchange
        newSocket.on('keys:received', async (data) => {
            await handleKeyExchange(data);
        });

        setSocket(newSocket);
    }, [socket]);

    /**
     * Disconnect WebSocket
     */
    const disconnect = useCallback(() => {
        if (socket) {
            socket.disconnect();
            setSocket(null);
            setConnected(false);
        }
    }, [socket]);

    /**
     * Handle new incoming message
     */
    const handleNewMessage = async (data) => {
        const { message } = data;
        const conversationId = message.conversationId;

        // Decrypt message if we have the key
        let decryptedContent = null;
        if (encryption.hasKey(conversationId)) {
            try {
                const key = encryption.getKey(conversationId);
                decryptedContent = await encryption.decrypt(message.content, key);
            } catch (error) {
                console.error('[Messaging] Decryption failed:', error);
            }
        }

        const processedMessage = {
            ...message,
            decryptedContent,
            receivedAt: new Date()
        };

        // Add to messages
        setMessages(prev => ({
            ...prev,
            [conversationId]: [...(prev[conversationId] || []), processedMessage]
        }));

        // Update unread count
        if (conversationId !== activeConversation) {
            setUnreadCounts(prev => ({
                ...prev,
                [conversationId]: (prev[conversationId] || 0) + 1
            }));

            // Show notification
            toast(`New message from ${message.sender?.username || 'Unknown'}`, {
                icon: '💬'
            });
        }

        // Emit delivered receipt
        socket?.emit('message:delivered', {
            messageId: message._id,
            conversationId
        });
    };

    /**
     * Handle key exchange
     */
    const handleKeyExchange = async (data) => {
        const { senderId, publicKey } = data;

        if (!keyPairRef.current) {
            keyPairRef.current = await encryption.generateKeyPair();
        }

        // Derive shared key
        const sharedKey = await encryption.deriveSharedKey(
            keyPairRef.current.privateKey,
            publicKey
        );

        // Store for conversation with this user
        encryption.storeKey(`user:${senderId}`, sharedKey);
    };

    /**
     * Send message
     */
    const sendMessage = useCallback(async (conversationId, content, options = {}) => {
        if (!socket?.connected) {
            toast.error('Not connected');
            return null;
        }

        try {
            // Get or generate encryption key for this conversation
            let key = encryption.getKey(conversationId);
            if (!key) {
                key = await encryption.generateEncryptionKey();
                encryption.storeKey(conversationId, key);
            }

            // Encrypt message
            const encryptedContent = await encryption.encrypt(content, key);

            // Create local message
            const localMessage = {
                _id: `local_${Date.now()}`,
                conversationId,
                content: encryptedContent,
                decryptedContent: content,
                status: 'sending',
                sentAt: new Date().toISOString(),
                sender: { _id: 'me' }
            };

            // Add to messages optimistically
            setMessages(prev => ({
                ...prev,
                [conversationId]: [...(prev[conversationId] || []), localMessage]
            }));

            // Send via API
            const response = await messagesApi.send({
                conversationId,
                content: encryptedContent,
                ...options
            });

            // Update with server message
            const serverMessage = response.data.data.message;
            setMessages(prev => ({
                ...prev,
                [conversationId]: prev[conversationId].map(m =>
                    m._id === localMessage._id ? { ...serverMessage, decryptedContent: content } : m
                )
            }));

            // Emit via socket for real-time delivery
            socket.emit('message:send', {
                messageId: serverMessage._id,
                conversationId,
                encryptedContent,
                recipientId: options.recipientId
            });

            return serverMessage;
        } catch (error) {
            console.error('[Messaging] Send error:', error);
            toast.error('Failed to send message');
            return null;
        }
    }, [socket]);

    /**
     * Send typing indicator
     */
    const sendTyping = useCallback((conversationId, isTyping) => {
        if (!socket?.connected) return;

        if (isTyping) {
            socket.emit('typing:start', { conversationId });

            // Auto-stop after 3 seconds
            if (typingTimeoutRef.current[conversationId]) {
                clearTimeout(typingTimeoutRef.current[conversationId]);
            }
            typingTimeoutRef.current[conversationId] = setTimeout(() => {
                socket.emit('typing:stop', { conversationId });
            }, 3000);
        } else {
            socket.emit('typing:stop', { conversationId });
            if (typingTimeoutRef.current[conversationId]) {
                clearTimeout(typingTimeoutRef.current[conversationId]);
            }
        }
    }, [socket]);

    /**
     * Join conversation room
     */
    const joinConversation = useCallback((conversationId) => {
        socket?.emit('join:conversation', conversationId);
        setActiveConversation(conversationId);

        // Clear unread count
        setUnreadCounts(prev => ({
            ...prev,
            [conversationId]: 0
        }));
    }, [socket]);

    /**
     * Leave conversation room
     */
    const leaveConversation = useCallback((conversationId) => {
        socket?.emit('leave:conversation', conversationId);
        if (activeConversation === conversationId) {
            setActiveConversation(null);
        }
    }, [socket, activeConversation]);

    /**
     * Load conversations
     */
    const loadConversations = useCallback(async () => {
        setLoading(true);
        try {
            const response = await messagesApi.getConversations();
            setConversations(response.data.data.conversations);

            // Update unread counts
            const counts = {};
            response.data.data.conversations.forEach(conv => {
                counts[conv._id] = conv.unreadCount || 0;
            });
            setUnreadCounts(counts);
        } catch (error) {
            console.error('[Messaging] Load conversations error:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Load messages for conversation
     */
    const loadMessages = useCallback(async (conversationId, options = {}) => {
        try {
            const response = await messagesApi.getMessages(conversationId, options);
            const msgs = response.data.data.messages;

            // Decrypt messages
            const key = encryption.getKey(conversationId);
            const decryptedMessages = await Promise.all(
                msgs.map(async msg => {
                    let decryptedContent = null;
                    if (key) {
                        try {
                            decryptedContent = await encryption.decrypt(msg.content, key);
                        } catch {
                            // Decryption failed
                        }
                    }
                    return { ...msg, decryptedContent };
                })
            );

            setMessages(prev => ({
                ...prev,
                [conversationId]: decryptedMessages
            }));

            return decryptedMessages;
        } catch (error) {
            console.error('[Messaging] Load messages error:', error);
            return [];
        }
    }, []);

    /**
     * Update message status
     */
    const updateMessageStatus = (messageId, status) => {
        setMessages(prev => {
            const updated = { ...prev };
            for (const convId in updated) {
                updated[convId] = updated[convId].map(msg =>
                    msg._id === messageId ? { ...msg, status } : msg
                );
            }
            return updated;
        });
    };

    /**
     * Mark conversation as read
     */
    const markConversationRead = (conversationId, readBy) => {
        setMessages(prev => ({
            ...prev,
            [conversationId]: (prev[conversationId] || []).map(msg => ({
                ...msg,
                status: 'read'
            }))
        }));
    };

    /**
     * Check if user is online
     */
    const isOnline = useCallback((userId) => {
        return onlineUsers.has(userId);
    }, [onlineUsers]);

    /**
     * Get total unread count
     */
    const getTotalUnread = useCallback(() => {
        return Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
    }, [unreadCounts]);

    // Initialize encryption keys on mount
    useEffect(() => {
        const initKeys = async () => {
            if (!keyPairRef.current) {
                keyPairRef.current = await encryption.generateKeyPair();
            }
        };
        initKeys();
    }, []);

    const value = {
        // State
        socket,
        connected,
        conversations,
        activeConversation,
        messages,
        typingUsers,
        onlineUsers,
        unreadCounts,
        loading,

        // Actions
        connect,
        disconnect,
        sendMessage,
        sendTyping,
        joinConversation,
        leaveConversation,
        loadConversations,
        loadMessages,
        isOnline,
        getTotalUnread
    };

    return (
        <MessagingContext.Provider value={value}>
            {children}
        </MessagingContext.Provider>
    );
};

export const useMessaging = () => {
    const context = useContext(MessagingContext);

    if (!context) {
        throw new Error('useMessaging must be used within a MessagingProvider');
    }

    return context;
};

export default MessagingContext;
