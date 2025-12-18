import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { SparklesIcon } from '@heroicons/react/24/outline';
import ChatBoxAI from './ChatBoxAI';
import styles from './BubbleChatAI.module.css';

export const CHAT_EVENTS = {
    AI_CHAT_OPENED: 'aiChatOpened',
    REGULAR_CHAT_OPENED: 'regularChatOpened'
};

const BubbleChatAI = () => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);

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

    useEffect(() => {
        const handleClear = () => {
            setIsOpen(false);
            setIsMinimized(false);
        };
        window.addEventListener('aiChatClear', handleClear);
        return () => window.removeEventListener('aiChatClear', handleClear);
    }, []);

    const handleBubbleClick = useCallback(() => {
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
            <div
                className={`${styles.bubble} ${isOpen && !isMinimized ? styles.hidden : ''}`}
                onClick={handleBubbleClick}
                title={t('chatAI.bubble.title')}
            >
                <div className={styles.bubbleContent}>
                    <img src="/logoKDBS.png" alt="KDBS" className={styles.bubbleImg} />
                </div>

                <div className={styles.bubbleGlow}></div>
            </div>

            <ChatBoxAI
                isOpen={isOpen && !isMinimized}
                onClose={handleClose}
                onMinimize={handleMinimize}
            />
        </>
    );
};

export default BubbleChatAI;
