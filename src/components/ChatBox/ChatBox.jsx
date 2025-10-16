import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  XMarkIcon,
  EllipsisVerticalIcon,
  PhoneIcon,
  VideoCameraIcon,
  FaceSmileIcon
} from '@heroicons/react/24/outline';
import styles from './ChatBox.module.css';

const ChatBox = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'received',
      content: 'Xin chào! Tôi có thể giúp gì cho bạn?',
      time: '10:30',
      sender: 'Hỗ trợ khách hàng'
    },
    {
      id: 2,
      type: 'sent',
      content: 'Tôi muốn hỏi về tour Đà Nẵng',
      time: '10:31',
      sender: 'Bạn'
    },
    {
      id: 3,
      type: 'received',
      content: 'Chúng tôi có nhiều tour Đà Nẵng hấp dẫn. Bạn quan tâm đến loại tour nào?',
      time: '10:32',
      sender: 'Hỗ trợ khách hàng'
    }
  ]);

  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatBoxRef = useRef(null);

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

  // Remove click outside handler for chatbox
  // Chatbox will only close when clicking X button or chat icon (handled by parent)

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const message = {
        id: messages.length + 1,
        type: 'sent',
        content: newMessage.trim(),
        time: new Date().toLocaleTimeString('vi-VN', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        sender: 'Bạn'
      };

      setMessages(prev => [...prev, message]);
      setNewMessage('');
      
      // Simulate typing indicator
      setIsTyping(true);
      setTimeout(() => {
        const reply = {
          id: messages.length + 2,
          type: 'received',
          content: 'Cảm ơn bạn đã liên hệ! Chúng tôi sẽ phản hồi trong thời gian sớm nhất.',
          time: new Date().toLocaleTimeString('vi-VN', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          sender: 'Hỗ trợ khách hàng'
        };
        setMessages(prev => [...prev, reply]);
        setIsTyping(false);
      }, 2000);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div 
      ref={chatBoxRef}
      className={`${styles.chatBox} ${isOpen ? styles.show : styles.hide}`}
    >
      {/* Header */}
      <div className={styles.chatHeader}>
        <div className={styles.chatInfo}>
          <div className={styles.avatar}>
            <ChatBubbleLeftRightIcon className="w-6 h-6" />
          </div>
          <div className={styles.chatDetails}>
            <h3 className={styles.chatTitle}>{t('chat.title')}</h3>
            <span className={styles.chatStatus}>{t('chat.status')}</span>
          </div>
        </div>
        
        <div className={styles.chatActions}>
          <button className={styles.actionBtn} title={t('chat.call')}>
            <PhoneIcon className="w-4 h-4" />
          </button>
          <button className={styles.actionBtn} title={t('chat.video')}>
            <VideoCameraIcon className="w-4 h-4" />
          </button>
          <button className={styles.actionBtn} title={t('chat.more')}>
            <EllipsisVerticalIcon className="w-4 h-4" />
          </button>
          <button 
            className={styles.closeBtn}
            onClick={onClose}
            title={t('chat.close')}
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className={styles.messagesContainer}>
        <div className={styles.messages}>
          {messages.map((message) => (
            <div 
              key={message.id}
              className={`${styles.message} ${styles[message.type]}`}
            >
              <div className={styles.messageContent}>
                <p className={styles.messageText}>{message.content}</p>
                <span className={styles.messageTime}>{message.time}</span>
              </div>
            </div>
          ))}
          
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
          <button className={styles.emojiBtn} title={t('chat.emoji')}>
            <FaceSmileIcon className="w-5 h-5" />
          </button>
          
          <textarea
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={t('chat.placeholder')}
            className={styles.messageInput}
            rows={1}
          />
          
          <button 
            className={styles.sendBtn}
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            title={t('chat.send')}
          >
            <PaperAirplaneIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatBox;
