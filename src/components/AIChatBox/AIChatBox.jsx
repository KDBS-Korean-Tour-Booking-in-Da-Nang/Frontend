import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  SparklesIcon,
  PaperAirplaneIcon,
  XMarkIcon,
  FaceSmileIcon,
  MinusIcon
} from '@heroicons/react/24/outline';
import styles from './AIChatBox.module.css';

const AIChatBox = ({ isOpen, onClose, onMinimize }) => {
  const { t } = useTranslation();
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Focus input when chatbox opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      content: newMessage.trim(),
      isOwn: true,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setIsTyping(true);

    // TODO: Implement AI response logic here
    // For now, simulate AI response
    setTimeout(() => {
      const aiMessage = {
        id: `ai-${Date.now()}`,
        content: 'Xin chào! Tôi là AI assistant. Tính năng này đang được phát triển.',
        isOwn: false,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1000);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Vừa xong';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('vi-VN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <>
      {/* AI ChatBox - Full */}
      <div 
        className={`${styles.aiChatBox} ${isOpen ? styles.show : styles.hide}`}
      >
        {/* Header */}
        <div className={styles.chatHeader}>
          <div className={styles.chatInfo}>
            <div className={styles.avatar}>
              <SparklesIcon className="w-6 h-6" />
            </div>
            <div className={styles.chatDetails}>
              <h3 className={styles.chatTitle}>AI Assistant</h3>
              <span className={styles.chatStatus}>Sẵn sàng hỗ trợ</span>
            </div>
          </div>
          
          <div className={styles.chatActions}>
            <button 
              className={styles.actionBtn}
              onClick={onMinimize}
              title="Thu nhỏ"
            >
              <MinusIcon className="w-4 h-4" />
            </button>
            <button 
              className={styles.closeBtn}
              onClick={onClose}
              title="Đóng"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className={styles.messagesContainer}>
          <div 
            ref={messagesContainerRef}
            className={styles.messages}
          >
            {messages.length === 0 ? (
              <div className={styles.emptyState}>
                <SparklesIcon className={styles.emptyIcon} />
                <p className={styles.emptyText}>
                  Bắt đầu trò chuyện với AI Assistant
                </p>
                <p className={styles.emptySubtext}>
                  Tôi có thể giúp bạn trả lời câu hỏi, tư vấn tour du lịch và nhiều hơn nữa!
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <div 
                  key={message.id}
                  className={`${styles.message} ${message.isOwn ? styles.sent : styles.received}`}
                >
                  <div className={styles.messageContent}>
                    <p className={styles.messageText}>{message.content}</p>
                    <span className={styles.messageTime}>
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                </div>
              ))
            )}
            
            {isTyping && (
              <div className={`${styles.message} ${styles.received}`}>
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
            <button className={styles.emojiBtn} title="Emoji">
              <FaceSmileIcon className="w-5 h-5" />
            </button>
            
            <textarea
              ref={inputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Nhập tin nhắn..."
              className={styles.messageInput}
              rows={1}
            />
            
            <button 
              className={styles.sendBtn}
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              title="Gửi"
            >
              <PaperAirplaneIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AIChatBox;
