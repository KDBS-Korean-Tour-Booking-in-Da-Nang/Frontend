import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { SparklesIcon } from '@heroicons/react/24/outline';
import ChatBoxAI from './ChatBoxAI';
import styles from './BubbleChatAI.module.css';

// Custom event names for chat coordination
export const CHAT_EVENTS = {
    AI_CHAT_OPENED: 'aiChatOpened',
    REGULAR_CHAT_OPENED: 'regularChatOpened'
};

const BubbleChatAI = () => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);

    // Listen for regular chat opened event - minimize AI chat when regular chat opens
    useEffect(() => {
        const handleRegularChatOpened = () => {
            if (isOpen && !isMinimized) {
                setIsMinimized(true);
                setIsOpen(false);
            }
        };

        window.addEventListener(CHAT_EVENTS.REGULAR_CHAT_OPENED, handleRegularChatOpened);
        return () => {
            window.removeEventListener(CHAT_EVENTS.REGULAR_CHAT_OPENED, handleRegularChatOpened);
        };
    }, [isOpen, isMinimized]);

    // Listen for global AI chat clear (e.g., logout) to close and reset bubble
    useEffect(() => {
        const handleClear = () => {
            setIsOpen(false);
            setIsMinimized(false);
        };
        window.addEventListener('aiChatClear', handleClear);
        return () => window.removeEventListener('aiChatClear', handleClear);
    }, []);

    const handleBubbleClick = useCallback(() => {
        // Emit event to tell regular chat to minimize
        window.dispatchEvent(new CustomEvent(CHAT_EVENTS.AI_CHAT_OPENED));

        setIsOpen(true);
        setIsMinimized(false);
    }, []);

    const handleClose = useCallback(() => {
        setIsOpen(false);
        setIsMinimized(false);
    }, []);

    const handleMinimize = useCallback(() => {
        setIsMinimized(true);
        setIsOpen(false);
    }, []);

    return (
        <>
            {/* Chat Bubble */}
            <div
                className={`${styles.bubble} ${isOpen && !isMinimized ? styles.hidden : ''}`}
                onClick={handleBubbleClick}
                title={t('chatAI.bubble.title')}
            >
                <div className={styles.bubbleContent}>
                    <SparklesIcon className={styles.bubbleIcon} />
                </div>

                {/* Glow effect */}
                <div className={styles.bubbleGlow}></div>
            </div>

            {/* Chat Box */}
            <ChatBoxAI
                isOpen={isOpen && !isMinimized}
                onClose={handleClose}
                onMinimize={handleMinimize}
            />
        </>
    );
};

export default BubbleChatAI;
