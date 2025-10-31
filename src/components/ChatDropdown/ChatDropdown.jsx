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

  // Merge all users with conversation previews; show all users and sort by latest message
  const mergedUserList = (() => {
    const convMap = new Map();
    (state.conversations || []).forEach(conv => {
      const key = (conv.user?.username || conv.user?.userName || '').toLowerCase();
      if (!key) return;
      const existing = convMap.get(key);
      const currentTs = new Date(conv.lastMessage?.timestamp || 0).getTime();
      const existingTs = existing ? new Date(existing.lastMessage?.timestamp || 0).getTime() : -1;
      if (!existing || currentTs > existingTs) {
        convMap.set(key, conv);
      }
    });

    // Start with all filtered users from the system
    const list = filteredUsers.map(user => {
      const key = (user.username || user.userName || '').toLowerCase();
      const conv = convMap.get(key) || null;
      return { user, lastMessage: conv?.lastMessage || null };
    });

    // Include any conversation users that are not in allUsers (fallback)
    (state.conversations || []).forEach(conv => {
      const key = (conv.user?.username || conv.user?.userName || '').toLowerCase();
      if (!key) return;
      const exists = list.some(item => (item.user.username || item.user.userName || '').toLowerCase() === key);
      if (!exists) {
        list.push({ user: conv.user, lastMessage: conv.lastMessage || null });
      }
    });

    // Apply searchTerm against username/email and last message content
    const searched = list.filter(item => {
      const userName = item.user?.username || item.user?.userName || '';
      const userEmail = item.user?.email || item.user?.userEmail || '';
      const preview = item.lastMessage?.content || '';
      const q = searchTerm.toLowerCase();
      return userName.toLowerCase().includes(q) || userEmail.toLowerCase().includes(q) || preview.toLowerCase().includes(q);
    });

    // Sort: users with lastMessage first (desc by timestamp), then those without (alphabetical)
    searched.sort((a, b) => {
      const aHas = !!a.lastMessage?.timestamp;
      const bHas = !!b.lastMessage?.timestamp;
      if (aHas && bHas) {
        return new Date(b.lastMessage.timestamp) - new Date(a.lastMessage.timestamp);
      }
      if (aHas) return -1;
      if (bHas) return 1;
      const an = (a.user?.username || a.user?.userName || '').toLowerCase();
      const bn = (b.user?.username || b.user?.userName || '').toLowerCase();
      return an.localeCompare(bn);
    });

    return searched;
  })();

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
