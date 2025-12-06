import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import {
  UserIcon,
  XMarkIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { useChat } from '../../contexts/ChatContext';
import { getAvatarUrl } from '../../config/api';
import styles from './ChatDropdown.module.css';

const ChatDropdown = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { state, actions } = useChat();
  const { user: authUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  // Resolve current user's login name to filter out self from lists
  const currentLoginName = (() => {
    const n = state.currentUser?.userName || state.currentUser?.username || state.currentUser?.name || authUser?.username || authUser?.userName || authUser?.name || '';
    return (n || '').toLowerCase();
  })();

  const dropdownRef = useRef(null);

  const resolveUsername = (user) =>
    (user?.userName || user?.username || user?.name || '').toLowerCase();

  const resolveAvatar = (user, senderFallback) => {
    const directAvatar = user?.avatar || user?.userAvatar || user?.avatarUrl;
    const senderAvatar = senderFallback?.avatar || senderFallback?.userAvatar || senderFallback?.avatarUrl;
    const username = resolveUsername(user);
    const match = (state.allUsers || []).find(
      (u) => resolveUsername(u) === username
    );
    const matchedAvatar = match?.avatar || match?.userAvatar || match?.avatarUrl;
    const rawAvatar = directAvatar || senderAvatar || matchedAvatar;
    return rawAvatar ? getAvatarUrl(rawAvatar) : '/default-avatar.png';
  };

  useEffect(() => {
    // Load conversations when dropdown opens (only users with conversations will show)
    if (isOpen) {
      actions.loadConversations();
      if (!state.allUsers || state.allUsers.length === 0) {
        actions.loadAllUsers?.();
      }
    }
  }, [isOpen, state.allUsers?.length]);

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
    const normalizedUser = {
      ...user,
      avatar: resolveAvatar(user)
    };
    actions.openChatWithUser(normalizedUser);
    onClose();
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now - date;
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));

    if (diffInMinutes < 1) {
      return t('chatDropdown.time.justNow', 'Vừa xong');
    }
    if (diffInMinutes < 60) {
      return t('chatDropdown.time.minutesAgo', {
        count: diffInMinutes,
        defaultValue: '{{count}} phút'
      });
    }
    if (diffInHours < 24) {
      return t('chatDropdown.time.hoursAgo', {
        count: diffInHours,
        defaultValue: '{{count}} giờ'
      });
    }

    return date.toLocaleDateString('vi-VN');
  };

  const filteredConversations = (state.conversations || [])
    // Exclude current user from conversations list (using userId)
    .filter(conv => {
      const currentUserId = state.currentUser?.userId || state.currentUser?.id;
      const otherUserId = conv.user?.userId || conv.user?.id;
      return otherUserId && otherUserId !== currentUserId;
    })
    .filter(conv => {
      const userName = conv.user?.username || conv.user?.userName || '';
      const preview = conv.lastMessage?.content || '';
      return userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
             preview.toLowerCase().includes(searchTerm.toLowerCase());
    })
    .sort((a, b) => new Date(b.lastMessage?.timestamp || 0) - new Date(a.lastMessage?.timestamp || 0));

  // Transform conversations to user list format - only show users with conversations
  const mergedUserList = filteredConversations.map(conv => {
    const enrichedUser = {
      ...conv.user,
      avatar: resolveAvatar(conv.user, conv.lastMessage?.sender)
    };
    return {
      user: enrichedUser,
      lastMessage: conv.lastMessage
    };
  });

  const getTabContent = () => {
    return (
      <div className={styles.conversationsList}>
        {mergedUserList.length === 0 ? (
          <div className={styles.emptyState}>
            <UserIcon className={styles.emptyIcon} />
            <p className={styles.emptyText}>
              {searchTerm
                ? t('chatDropdown.empty.search', 'Không tìm thấy người dùng')
                : t('chatDropdown.empty.noUsers', 'Danh sách người dùng chưa có')}
            </p>
          </div>
        ) : (
          mergedUserList.map((item) => {
            const userId = item.user?.userId || item.user?.id;
            const userName = item.user?.username || item.user?.userName || '';
            return (
            <div 
              key={userId || userName}
              className={styles.conversationItem}
              onClick={() => handleUserSelect(item.user)}
            >
              <div className={styles.userAvatar}>
                <img 
                  src={resolveAvatar(item.user, item.lastMessage?.sender) || '/default-avatar.png'} 
                  alt={userName}
                  onError={(e) => {
                    e.target.src = '/default-avatar.png';
                    e.target.onerror = null; // Prevent infinite loop
                  }}
                />
              </div>
              <div className={styles.conversationContent}>
                <div className={styles.conversationHeader}>
                  <h4 className={styles.userName}>{userName}</h4>
                  {item.lastMessage?.timestamp && (
                    <span className={styles.timestamp}>{formatTime(item.lastMessage.timestamp)}</span>
                  )}
                </div>
                <div className={styles.conversationFooter}>
                  <p className={styles.lastMessage}>{item.lastMessage?.content || ''}</p>
                </div>
              </div>
            </div>
            );
          })
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
          <h3 className={styles.title}>{t('chatDropdown.title', 'Đoạn chat')}</h3>
        </div>
        <div className={styles.headerActions}>
          <button 
            className={styles.closeBtn}
            onClick={onClose}
            title={t('common.close')}
            aria-label={t('common.close')}
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
          placeholder={t('chatDropdown.searchPlaceholder', 'Tìm kiếm trên Messenger')}
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
