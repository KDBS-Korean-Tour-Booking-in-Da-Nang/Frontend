import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  UserIcon,
  XMarkIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { useChat } from '../../contexts/ChatContext';
import styles from './ChatDropdown.module.css';

const ChatDropdown = ({ isOpen, onClose }) => {
  const { state, actions } = useChat();
  const { user: authUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  // Resolve current user's login name to filter out self from lists
  const currentLoginName = (() => {
    const n = state.currentUser?.userName || state.currentUser?.username || state.currentUser?.name || authUser?.username || authUser?.userName || authUser?.name || '';
    return (n || '').toLowerCase();
  })();

  const dropdownRef = useRef(null);

  useEffect(() => {
    // Load conversations when dropdown opens (only users with conversations will show)
    if (isOpen) {
      actions.loadConversations();
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
    // Exclude current user from conversations list (can happen after rename)
    .filter(conv => {
      const other = (conv.user?.username || conv.user?.userName || '').toLowerCase();
      return other && other !== currentLoginName;
    })
    .filter(conv => {
      const userName = conv.user?.username || conv.user?.userName || '';
      const preview = conv.lastMessage?.content || '';
      return userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
             preview.toLowerCase().includes(searchTerm.toLowerCase());
    })
    .sort((a, b) => new Date(b.lastMessage?.timestamp || 0) - new Date(a.lastMessage?.timestamp || 0));

  // Transform conversations to user list format - only show users with conversations
  const mergedUserList = filteredConversations.map(conv => ({
    user: conv.user,
    lastMessage: conv.lastMessage
  }));

  const getTabContent = () => {
    return (
      <div className={styles.conversationsList}>
        {mergedUserList.length === 0 ? (
          <div className={styles.emptyState}>
            <UserIcon className={styles.emptyIcon} />
            <p className={styles.emptyText}>
              {searchTerm ? 'Không tìm thấy người dùng' : 'Danh sách người dùng chưa có'}
            </p>
          </div>
        ) : (
          mergedUserList.map((item) => (
            <div 
              key={(item.user?.userId) || (item.user?.username || item.user?.userName)}
              className={styles.conversationItem}
              onClick={() => handleUserSelect(item.user)}
            >
              <div className={styles.userAvatar}>
                {item.user?.avatar ? (
                  <img src={item.user.avatar} alt={item.user.username || item.user.userName} />
                ) : (
                  <UserIcon className="w-6 h-6" />
                )}
              </div>
              <div className={styles.conversationContent}>
                <div className={styles.conversationHeader}>
                  <h4 className={styles.userName}>{item.user?.username || item.user?.userName}</h4>
                  {item.lastMessage?.timestamp && (
                    <span className={styles.timestamp}>{formatTime(item.lastMessage.timestamp)}</span>
                  )}
                </div>
                <div className={styles.conversationFooter}>
                  <p className={styles.lastMessage}>{item.lastMessage?.content || ''}</p>
                </div>
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
