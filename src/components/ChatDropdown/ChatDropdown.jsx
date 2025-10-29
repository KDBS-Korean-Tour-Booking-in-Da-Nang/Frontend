import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChatBubbleLeftRightIcon,
  UserIcon,
  XMarkIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { useChat } from '../../contexts/ChatContext';
import styles from './ChatDropdown.module.css';

const ChatDropdown = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { state, actions } = useChat();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab] = useState('users');

  const dropdownRef = useRef(null);

  useEffect(() => {
    // Load conversations and users when dropdown opens
    if (isOpen) {
      actions.loadConversations();
      // Load real users from database
      actions.loadAllUsers();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        const chatButton = event.target.closest('[data-chat-button]');
        if (!chatButton) {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleUserSelect = (user) => {
    actions.openChatWithUser(user);
    onClose();
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - date) / (1000 * 60));
      return `${diffInMinutes} phút`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} giờ`;
    } else {
      return date.toLocaleDateString('vi-VN');
    }
  };

  const filteredConversations = (state.conversations || [])
    .filter(conv => {
      const userName = conv.user?.username || conv.user?.userName || '';
      const preview = conv.lastMessage?.content || '';
      return userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
             preview.toLowerCase().includes(searchTerm.toLowerCase());
    })
    .sort((a, b) => new Date(b.lastMessage?.timestamp || 0) - new Date(a.lastMessage?.timestamp || 0));

  const filteredUsers = (state.allUsers || [])
    // Exclude ADMIN, STAFF, and COMPANY with COMPANY_PENDING status
    .filter(user => {
      const role = (user.role || user.userRole || '').toUpperCase();
      const status = (user.status || user.userStatus || '').toUpperCase();
      if (role === 'ADMIN' || role === 'STAFF') return false;
      if (role === 'COMPANY' && status === 'COMPANY_PENDING') return false;
      return true;
    })
    // Apply search filtering
    .filter(user => {
      const userName = user.username || user.userName || '';
      const userEmail = user.email || user.userEmail || '';
      return userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
             userEmail.toLowerCase().includes(searchTerm.toLowerCase());
    });

  const getTabContent = () => {
    // Conversations view with latest preview replacing email
    if ((filteredConversations || []).length > 0) {
      return (
        <div className={styles.conversationsList}>
          {filteredConversations.map((conv) => (
            <div 
              key={conv.user?.userName || conv.user?.username}
              className={styles.conversationItem}
              onClick={() => handleUserSelect(conv.user)}
            >
              <div className={styles.userAvatar}>
                {conv.user?.avatar ? (
                  <img src={conv.user.avatar} alt={conv.user.username || conv.user.userName} />
                ) : (
                  <UserIcon className="w-6 h-6" />
                )}
              </div>
              <div className={styles.conversationContent}>
                <div className={styles.conversationHeader}>
                  <h4 className={styles.userName}>{conv.user?.username || conv.user?.userName}</h4>
                  {conv.lastMessage?.timestamp && (
                    <span className={styles.timestamp}>{formatTime(conv.lastMessage.timestamp)}</span>
                  )}
                </div>
                <div className={styles.conversationFooter}>
                  <p className={styles.lastMessage}>{conv.lastMessage?.content || ''}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    // Fallback to all users list if no conversations yet
    return (
      <div className={styles.usersList}>
        {filteredUsers.length === 0 ? (
          <div className={styles.emptyState}>
            <UserIcon className={styles.emptyIcon} />
            <p className={styles.emptyText}>
              {searchTerm ? 'Không tìm thấy người dùng' : 'Danh sách người dùng chưa có'}
            </p>
          </div>
        ) : (
          filteredUsers.map((user) => (
            <div 
              key={user.userId}
              className={styles.userItem}
              onClick={() => handleUserSelect(user)}
            >
              <div className={styles.userAvatar}>
                {user.avatar ? (
                  <img src={user.avatar} alt={user.username || user.userName} />
                ) : (
                  <UserIcon className="w-6 h-6" />
                )}
              </div>
              <div className={styles.userContent}>
                <h4 className={styles.userName}>{user.username || user.userName}</h4>
                <p className={styles.userEmail}>{user.email || user.userEmail}</p>
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className={`${styles.chatDropdown} ${isOpen ? styles.show : styles.hide}`} ref={dropdownRef}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <h3 className={styles.title}>Đoạn chat</h3>
        </div>
        <div className={styles.headerActions}>
          <button 
            className={styles.closeBtn}
            onClick={onClose}
            title="Đóng"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className={styles.searchBar}>
        <MagnifyingGlassIcon className={styles.searchIcon} />
        <input
          type="text"
          placeholder="Tìm kiếm trên Messenger"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {/* Content */}
      <div className={styles.content}>
        {getTabContent()}
      </div>
    </div>
  );
};

export default ChatDropdown;
