import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
    SparklesIcon,
    PaperAirplaneIcon,
    XMarkIcon,
    MinusIcon
} from '@heroicons/react/24/outline';
import { getApiPath } from '../../config/api';
import { useAuth } from '../../contexts/AuthContext';
import styles from './ChatBoxAI.module.css';

const ChatBoxAI = ({ isOpen, onClose, onMinimize }) => {
    const { t, i18n } = useTranslation();
    const { user } = useAuth();

    // Create welcome message with translation (updates when language changes)
    // Use i18n.language as dependency instead of t to prevent recreation on every render
    const welcomeMessage = useMemo(() => ({
        id: 'welcome-message',
        content: t('chatAI.box.greeting'),
        isAI: true,
        timestamp: new Date()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [i18n.language]);

    // Helper function to convert history array to messages format
    // Always includes welcome message at the top
    // Wrapped in useCallback to prevent recreation on every render (fixes infinite loop)
    const historyToMessages = useCallback((historyArray) => {
        const messageObjects = [welcomeMessage]; // Always start with welcome message

        if (historyArray && historyArray.length > 0) {
            // Reconstruct messages from history (alternating user/AI)
            for (let i = 0; i < historyArray.length; i++) {
                messageObjects.push({
                    id: `history-${i}`,
                    content: historyArray[i],
                    isAI: i % 2 === 1, // Odd indices (1, 3, 5...) are AI responses
                    timestamp: new Date()
                });
            }
        }

        return messageObjects;
    }, [welcomeMessage]);

    // Initialize history from sessionStorage
    const [history, setHistory] = useState(() => {
        try {
            if (!user) return [];
            const saved = sessionStorage.getItem('chat_history');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    // Convert history to messages format for display
    const [messages, setMessages] = useState(() => {
        try {
            if (!user) {
                return historyToMessages([]);
            }
            const saved = sessionStorage.getItem('chat_history');
            const historyArray = saved ? JSON.parse(saved) : [];
            return historyToMessages(historyArray);
        } catch {
            return historyToMessages([]);
        }
    });

    const [newMessage, setNewMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    // If user is guest, clear stored history on mount or when becoming guest
    useEffect(() => {
        if (!user) {
            try {
                sessionStorage.removeItem('chat_history');
            } catch {
                // ignore
            }
            setHistory([]);
            setMessages(historyToMessages([]));
        }
    }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

    // Clear chat when receiving global clear event (e.g., logout)
    useEffect(() => {
        const handleClear = () => {
            setHistory([]);
            setMessages(historyToMessages([]));
            setNewMessage('');
            setIsTyping(false);
        };
        window.addEventListener('aiChatClear', handleClear);
        return () => window.removeEventListener('aiChatClear', handleClear);
    }, [historyToMessages]);

    // When guest closes chat, clear history immediately
    useEffect(() => {
        if (!isOpen && !user) {
            setHistory([]);
            setMessages(historyToMessages([]));
            setNewMessage('');
            setIsTyping(false);
        }
    }, [isOpen, user, historyToMessages]);

    // Update welcome message when language changes
    useEffect(() => {
        setMessages(prev => {
            // Find and update welcome message, keep rest of messages
            const updated = prev.map(msg =>
                msg.id === 'welcome-message'
                    ? { ...msg, content: t('chatAI.box.greeting') }
                    : msg
            );
            return updated;
        });
    }, [i18n.language, t]);


    const handleSendMessage = async () => {
        if (!newMessage.trim()) return;

        const userMessageText = newMessage.trim();
        const userMessage = {
            id: Date.now(),
            content: userMessageText,
            isAI: false,
            timestamp: new Date()
        };

        // Add user message to UI immediately (after welcome message)
        setMessages(prev => [...prev, userMessage]);
        setNewMessage('');
        setIsTyping(true);

        try {
            // Prepare payload for backend
            const payload = {
                history: history,
                message: userMessageText
            };

            // Call backend API
            const response = await fetch(getApiPath('/api/gemini/chat'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const assistantReply = await response.text();

            // Update history: add both user message and AI reply
            const updatedHistory = [...history, userMessageText, assistantReply];
            setHistory(updatedHistory);

            // Save to sessionStorage only for logged-in users
            if (user) {
                sessionStorage.setItem('chat_history', JSON.stringify(updatedHistory));
            }

            // Add AI response to UI
            const aiResponse = {
                id: Date.now() + 1,
                content: assistantReply,
                isAI: true,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, aiResponse]);
        } catch {
            // Show error message to user
            const errorMessage = {
                id: Date.now() + 1,
                content: t('chatAI.box.error'),
                isAI: true,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        // Map i18n language to locale for time formatting
        const localeMap = {
            'vi': 'vi-VN',
            'en': 'en-US',
            'ko': 'ko-KR'
        };
        const locale = localeMap[i18n.language] || localeMap['vi'];
        return new Date(timestamp).toLocaleTimeString(locale, {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className={`${styles.chatBox} ${isOpen ? styles.show : styles.hide}`}>
            {/* Header */}
            <div className={styles.chatHeader}>
                <div className={styles.chatInfo}>
                    <div className={styles.aiAvatar}>
                        <img src="/logoKDBS.png" alt="KDBS" className={styles.aiAvatarImg} />
                    </div>
                    <div className={styles.chatDetails}>
                        <h3 className={styles.chatTitle}>{t('chatAI.box.title')}</h3>
                        <span className={styles.chatStatus}>
                            {isTyping ? t('chatAI.box.status.typing') : t('chatAI.box.status.ready')}
                        </span>
                    </div>
                </div>

                <div className={styles.chatActions}>
                    <button
                        className={styles.actionBtn}
                        onClick={onMinimize}
                        title={t('chatAI.box.actions.minimize')}
                    >
                        <MinusIcon className={styles.btnIcon} />
                    </button>
                    <button
                        className={styles.closeBtn}
                        onClick={onClose}
                        title={t('chatAI.box.actions.close')}
                    >
                        <XMarkIcon className={styles.btnIcon} />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className={styles.messagesContainer}>
                <div className={styles.messages}>
                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={`${styles.message} ${message.isAI ? styles.received : styles.sent}`}
                        >
                            {message.isAI && (
                                <div className={styles.messageAvatar}>
                                    <img src="/logoKDBS.png" alt="KDBS" className={styles.avatarImg} />
                                </div>
                            )}
                            <div className={styles.messageContent}>
                                <p className={styles.messageText}>{message.content}</p>
                                <span className={styles.messageTime}>{formatTime(message.timestamp)}</span>
                            </div>
                        </div>
                    ))}

                    {isTyping && (
                        <div className={`${styles.message} ${styles.received}`}>
                            <div className={styles.messageAvatar}>
                                <img src="/logoKDBS.png" alt="KDBS" className={styles.avatarImg} />
                            </div>
                            <div className={styles.messageContent}>
                                <div className={styles.typingIndicator}>
                                    <div className={styles.typingDot}></div>
                                    <div className={styles.typingDot}></div>
                                    <div className={styles.typingDot}></div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input */}
            <div className={styles.chatInput}>
                <div className={styles.inputContainer}>
                    <textarea
                        ref={inputRef}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder={t('chatAI.box.input.placeholder')}
                        className={styles.messageInput}
                        rows={1}
                    />

                    <button
                        className={styles.sendBtn}
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim()}
                        title={t('chatAI.box.actions.send')}
                    >
                        <PaperAirplaneIcon className={styles.sendIcon} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatBoxAI;
