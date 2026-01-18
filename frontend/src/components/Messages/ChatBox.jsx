/**
 * ChatBox Component
 * Issue #933: Real-time WebSocket-Based Messaging with E2E Encryption
 * 
 * Chat interface with encryption/decryption UI.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useMessaging } from '../../context/MessagingContext';
import { format, isToday, isYesterday } from 'date-fns';

const ChatBox = ({ conversationId, recipient }) => {
    const {
        messages,
        sendMessage,
        sendTyping,
        typingUsers,
        isOnline,
        loadMessages,
        joinConversation,
        leaveConversation
    } = useMessaging();

    const [inputValue, setInputValue] = useState('');
    const [sending, setSending] = useState(false);
    const [showEncryptionInfo, setShowEncryptionInfo] = useState(false);

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const conversationMessages = messages[conversationId] || [];
    const typingInChat = typingUsers[conversationId] || [];

    // Join conversation on mount
    useEffect(() => {
        joinConversation(conversationId);
        loadMessages(conversationId);

        return () => {
            leaveConversation(conversationId);
        };
    }, [conversationId, joinConversation, leaveConversation, loadMessages]);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [conversationMessages]);

    // Handle input change
    const handleInputChange = (e) => {
        setInputValue(e.target.value);
        sendTyping(conversationId, e.target.value.length > 0);
    };

    // Handle send message
    const handleSend = async (e) => {
        e.preventDefault();

        if (!inputValue.trim() || sending) return;

        setSending(true);
        sendTyping(conversationId, false);

        try {
            await sendMessage(conversationId, inputValue.trim(), {
                recipientId: recipient?._id
            });
            setInputValue('');
            inputRef.current?.focus();
        } finally {
            setSending(false);
        }
    };

    // Format message time
    const formatTime = (date) => {
        const d = new Date(date);
        if (isToday(d)) {
            return format(d, 'HH:mm');
        } else if (isYesterday(d)) {
            return 'Yesterday ' + format(d, 'HH:mm');
        }
        return format(d, 'MMM d, HH:mm');
    };

    // Get status icon
    const getStatusIcon = (status) => {
        switch (status) {
            case 'sending':
                return <Icon icon="mdi:clock-outline" className="w-4 h-4 text-gray-400" />;
            case 'sent':
                return <Icon icon="mdi:check" className="w-4 h-4 text-gray-400" />;
            case 'delivered':
                return <Icon icon="mdi:check-all" className="w-4 h-4 text-gray-400" />;
            case 'read':
                return <Icon icon="mdi:check-all" className="w-4 h-4 text-blue-500" />;
            default:
                return null;
        }
    };

    return (
        <div className="chat-box flex flex-col h-full bg-white dark:bg-gray-900">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <img
                            src={recipient?.avatar || '/default-avatar.png'}
                            alt={recipient?.username}
                            className="w-10 h-10 rounded-full object-cover"
                        />
                        {isOnline(recipient?._id) && (
                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900" />
                        )}
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                            {recipient?.displayName || recipient?.username}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {isOnline(recipient?._id) ? 'Online' : 'Offline'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Encryption indicator */}
                    <button
                        onClick={() => setShowEncryptionInfo(!showEncryptionInfo)}
                        className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                        title="End-to-end encrypted"
                    >
                        <Icon icon="mdi:lock" className="w-5 h-5" />
                    </button>

                    <button className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                        <Icon icon="mdi:phone" className="w-5 h-5" />
                    </button>

                    <button className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                        <Icon icon="mdi:video" className="w-5 h-5" />
                    </button>

                    <button className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                        <Icon icon="mdi:dots-vertical" className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Encryption info banner */}
            {showEncryptionInfo && (
                <div className="px-4 py-3 bg-green-50 dark:bg-green-900/20 border-b border-green-100 dark:border-green-800">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                        <Icon icon="mdi:shield-lock" className="w-5 h-5" />
                        <p className="text-sm">
                            Messages are end-to-end encrypted. Only you and {recipient?.username} can read them.
                        </p>
                    </div>
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {conversationMessages.map((message, index) => {
                    const isMine = message.sender?._id === 'me' || message.sender === 'me';
                    const showAvatar = !isMine && (
                        index === 0 ||
                        conversationMessages[index - 1]?.sender?._id !== message.sender?._id
                    );

                    return (
                        <div
                            key={message._id}
                            className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`flex gap-2 max-w-[70%] ${isMine ? 'flex-row-reverse' : ''}`}>
                                {/* Avatar */}
                                {showAvatar && !isMine && (
                                    <img
                                        src={message.sender?.avatar || '/default-avatar.png'}
                                        alt=""
                                        className="w-8 h-8 rounded-full mt-auto"
                                    />
                                )}
                                {!showAvatar && !isMine && <div className="w-8" />}

                                {/* Message bubble */}
                                <div
                                    className={`
                    px-4 py-2 rounded-2xl
                    ${isMine
                                            ? 'bg-blue-600 text-white rounded-br-md'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-md'}
                  `}
                                >
                                    {/* Decrypted content */}
                                    <p className="break-words">
                                        {message.decryptedContent || (
                                            <span className="flex items-center gap-1 text-sm opacity-70">
                                                <Icon icon="mdi:lock" className="w-4 h-4" />
                                                Encrypted message
                                            </span>
                                        )}
                                    </p>

                                    {/* Time and status */}
                                    <div className={`flex items-center gap-1 mt-1 text-xs ${isMine ? 'text-blue-200' : 'text-gray-500'}`}>
                                        <span>{formatTime(message.sentAt)}</span>
                                        {isMine && getStatusIcon(message.status)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Typing indicator */}
                {typingInChat.length > 0 && (
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                        <div className="flex gap-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-sm">{typingInChat.join(', ')} typing...</span>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <form onSubmit={handleSend} className="flex items-center gap-2">
                    <button
                        type="button"
                        className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                    >
                        <Icon icon="mdi:plus" className="w-6 h-6" />
                    </button>

                    <div className="flex-1 relative">
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputValue}
                            onChange={handleInputChange}
                            placeholder="Type a message..."
                            className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />

                        <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                            <Icon icon="mdi:emoticon-outline" className="w-6 h-6" />
                        </button>
                    </div>

                    <button
                        type="submit"
                        disabled={!inputValue.trim() || sending}
                        className="p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-full transition-colors"
                    >
                        {sending ? (
                            <Icon icon="mdi:loading" className="w-6 h-6 animate-spin" />
                        ) : (
                            <Icon icon="mdi:send" className="w-6 h-6" />
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatBox;
