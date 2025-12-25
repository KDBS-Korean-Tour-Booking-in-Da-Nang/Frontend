import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  XMarkIcon,
  FaceSmileIcon,
  UserIcon,
  MinusIcon
} from '@heroicons/react/24/outline';
import { useChat } from '../../contexts/ChatContext';
import { getAvatarUrl } from '../../config/api';
import { CHAT_EVENTS } from '../chatAI/BubbleChatAI';
import styles from './ChatBox.module.css';

const formatDateHeader = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const shouldShowTimestamp = (messages, currentIndex) => {
  if (currentIndex === 0) return true;

  const currentMessage = messages[currentIndex];
  const previousMessage = messages[currentIndex - 1];

  if (!currentMessage.timestamp || !previousMessage.timestamp) return false;

  const currentTime = new Date(currentMessage.timestamp);
  const previousTime = new Date(previousMessage.timestamp);
  const diffInMinutes = Math.floor((currentTime - previousTime) / (1000 * 60));

  return diffInMinutes > 5;
};

const shouldShowDateHeader = (messages, currentIndex) => {
  if (currentIndex === 0) return true;

  const currentMessage = messages[currentIndex];
  const previousMessage = messages[currentIndex - 1];

  if (!currentMessage.timestamp || !previousMessage.timestamp) return false;

  const currentDate = new Date(currentMessage.timestamp).toDateString();
  const previousDate = new Date(previousMessage.timestamp).toDateString();

  return currentDate !== previousDate;
};

const resolveUserAvatar = (user) => {
  const avatar = user?.avatar || user?.userAvatar || user?.avatarUrl;
  if (!avatar) return '/default-avatar.png';
  const avatarUrl = getAvatarUrl(avatar);
  return avatarUrl || '/default-avatar.png';
};

const ChatBox = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { state, actions } = useChat();
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState(null);
  const [tooltip, setTooltip] = useState({ show: false, text: '', x: 0, y: 0, side: 'right' });
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatBoxRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(false);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const scrollTimeoutRef = useRef(null);
  const loadMoreTimeoutRef = useRef(null);
  const previousScrollHeightRef = useRef(0);
  const previousScrollTopRef = useRef(0);
  const initialScrolledRef = useRef({}); // Track initial scroll for each chat
  const anchorRef = useRef({ id: null, top: 0 }); // Anchor element for scroll position
  const loadingOlderRef = useRef(false); // Prevent double-trigger
  const hasRestoredRef = useRef(false); // Track if chat has been restored

  const formatTime = (timestamp) => {
    if (!timestamp) return t('userChat.time.justNow');
    const date = new Date(timestamp);
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return t('userChat.time.justNow');
    const now = new Date();
    const messageTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - messageTime) / (1000 * 60));

    if (diffInMinutes < 1) return t('userChat.time.justNow');
    if (diffInMinutes < 60) return t('userChat.time.minutesAgo', { minutes: diffInMinutes });

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return t('userChat.time.hoursAgo', { hours: diffInHours });

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return t('userChat.time.daysAgo', { days: diffInDays });

    return messageTime.toLocaleDateString('vi-VN');
  };

  const getActiveChatKey = () =>
    state.activeChatUser?.userId ?? state.activeChatUser?.id ?? 'unknown';

  const activeChatAvatar = React.useMemo(() => {
    if (!state.activeChatUser) return '/default-avatar.png';
    return resolveUserAvatar(state.activeChatUser);
  }, [state.activeChatUser?.userId, state.activeChatUser?.id, state.activeChatUser?.avatar, state.activeChatUser?.userAvatar]);

  useEffect(() => {
    if (isOpen && (!state.allUsers || state.allUsers.length === 0)) {
      const timer = setTimeout(() => {
        actions.loadAllUsers?.();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, state.allUsers?.length]);

  const scrollToBottom = (instant = false) => {
    const s = messagesContainerRef.current;
    if (!s) return;

    if (instant) {
      s.scrollTop = s.scrollHeight; // Use scrollTop for instant scroll
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleScroll = React.useCallback((e) => {
    const container = e.target;
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;

    if (scrollTop < 100 && state.hasMoreMessages && !state.isLoadingMoreMessages && !loadingOlderRef.current) {
      loadingOlderRef.current = true;

      const containerEl = messagesContainerRef.current;
      const children = Array.from(containerEl.querySelectorAll('[data-mid]'));
      const firstVisible = children.find(el => el.offsetTop >= containerEl.scrollTop - 2);

      if (firstVisible) {
        anchorRef.current = {
          id: firstVisible.getAttribute('data-mid'),
          top: firstVisible.offsetTop
        };
      } else {
        anchorRef.current = { id: null, top: containerEl.scrollTop };
        previousScrollHeightRef.current = scrollHeight;
        previousScrollTopRef.current = scrollTop;
      }

      if (loadMoreTimeoutRef.current) {
        clearTimeout(loadMoreTimeoutRef.current);
      }

      loadMoreTimeoutRef.current = setTimeout(() => {
        actions.loadMoreMessages();
      }, 500);
    }

    setIsUserScrolling(true);

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      setIsUserScrolling(false);
    }, 1000);
  }, [state.hasMoreMessages, state.isLoadingMoreMessages, actions]);

  const maintainScrollPosition = () => {
    if (messagesContainerRef.current && previousScrollHeightRef.current > 0) {
      const container = messagesContainerRef.current;
      const newScrollHeight = container.scrollHeight;
      const scrollDiff = newScrollHeight - previousScrollHeightRef.current;

      container.scrollTop = previousScrollTopRef.current + scrollDiff;

      previousScrollHeightRef.current = 0;
      previousScrollTopRef.current = 0;
    }
  };

  useEffect(() => {
    const isPrepending = previousScrollHeightRef.current > 0 || state.isLoadingMoreMessages || loadingOlderRef.current;

    if (shouldScrollToBottom && !isPrepending) {
      scrollToBottom(true);
      setShouldScrollToBottom(false);
    }
  }, [state.messages, shouldScrollToBottom, state.isLoadingMoreMessages]);

  useEffect(() => {
    if (state.isLoadingMoreMessages === false && loadingOlderRef.current) {
      const containerEl = messagesContainerRef.current;
      if (containerEl) {
        const { id, top } = anchorRef.current;
        if (id) {
          const anchorEl = containerEl.querySelector(`[data-mid="${id}"]`);
          if (anchorEl) {
            const newTop = anchorEl.offsetTop;
            containerEl.scrollTop += (newTop - top);
          }
        } else {
          if (previousScrollHeightRef.current > 0) {
            const diff = containerEl.scrollHeight - previousScrollHeightRef.current;
            containerEl.scrollTop = previousScrollTopRef.current + diff;
          }
        }
      }

      anchorRef.current = { id: null, top: 0 };
      previousScrollHeightRef.current = 0;
      previousScrollTopRef.current = 0;
      loadingOlderRef.current = false;
    }
  }, [state.isLoadingMoreMessages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleAIChatOpened = () => {
      if (isOpen && !state.isChatBoxMinimized) {
        actions.minimizeChatBox();
      }
    };

    window.addEventListener(CHAT_EVENTS.AI_CHAT_OPENED, handleAIChatOpened);
    return () => {
      window.removeEventListener(CHAT_EVENTS.AI_CHAT_OPENED, handleAIChatOpened);
    };
  }, [isOpen, state.isChatBoxMinimized, actions]);

  // Khôi phục minimized chats khi trang refresh/load
  useEffect(() => {
    if (!state.currentUser) return;
    actions.restoreMinimizedChats();
  }, [state.currentUser]);

  // Khôi phục trạng thái chat từ localStorage khi trang refresh/load
  useEffect(() => {
    if (!state.currentUser || hasRestoredRef.current) return;

    const savedChatState = localStorage.getItem('chatBoxState');

    if (savedChatState) {
      try {
        const { isOpen, activeChatUser, isMinimized } = JSON.parse(savedChatState);

        if (isMinimized) {
          hasRestoredRef.current = true;
          return;
        }

        if (isOpen && activeChatUser) {
          hasRestoredRef.current = true;
          actions.openChatWithUser(activeChatUser);
        }
      } catch (error) {
        localStorage.removeItem('chatBoxState');
      }
    }
  }, [state.currentUser]);

  // Tự động scroll xuống dưới khi chatbox mở hoặc có tin nhắn mới
  useEffect(() => {
    if (!isOpen || state.loadingMessages) return;

    if (state.messages.length > 0) {
      requestAnimationFrame(() => {
        const s = messagesContainerRef.current;
        if (s) {
          s.scrollTop = s.scrollHeight;
        }
      });
    }
  }, [isOpen, state.loadingMessages, state.activeChatUser, state.messages.length]);

  // Reset scroll position khi chuyển đổi giữa các chat
  useEffect(() => {
    const key = getActiveChatKey();
    if (key && !initialScrolledRef.current[key]) {
      previousScrollHeightRef.current = 0;
      previousScrollTopRef.current = 0;
      anchorRef.current = { id: null, top: 0 };
      loadingOlderRef.current = false;
      hasRestoredRef.current = false;
    }
  }, [state.activeChatUser]);

  // Cleanup timeouts khi component unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      if (loadMoreTimeoutRef.current) {
        clearTimeout(loadMoreTimeoutRef.current);
      }
    };
  }, []);

  // Ẩn tooltip khi scroll hoặc resize
  useEffect(() => {
    const hideTooltip = () => setTooltip(t => ({ ...t, show: false }));

    const scroller = document.querySelector(`.${styles.messages}`);
    scroller?.addEventListener('scroll', hideTooltip, { passive: true });
    window.addEventListener('resize', hideTooltip);

    return () => {
      scroller?.removeEventListener('scroll', hideTooltip);
      window.removeEventListener('resize', hideTooltip);
    };
  }, []);

  const handleSendMessage = async () => {
    if (newMessage.trim() && state.activeChatUser) {
      try {
        await actions.sendMessage(newMessage.trim());
        setNewMessage('');
        setShouldScrollToBottom(true);
      } catch (error) {
        // Error handled silently
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleMinimize = () => {
    actions.minimizeChatBox();
  };

  const handleMouseEnter = (messageId, event, timestamp) => {
    setHoveredMessageId(messageId);
    positionGlobalTooltip(event.currentTarget, event, timestamp);
  };

  const handleMouseMove = (event) => {
    if (!hoveredMessageId) return;
    positionGlobalTooltip(event.currentTarget, event);
  };

  const handleMouseLeave = () => {
    setHoveredMessageId(null);
    setTooltip(t => ({ ...t, show: false }));
  };

  // Tính toán vị trí tooltip dựa trên vị trí chuột so với tin nhắn
  const positionGlobalTooltip = (targetEl, event, timestamp) => {
    const rect = targetEl.getBoundingClientRect();
    const centerY = rect.top + rect.height / 2;
    const mouseX = event.clientX;
    const messageCenterX = rect.left + rect.width / 2;
    const side = mouseX < messageCenterX ? 'left' : 'right';
    const x = side === 'right' ? (rect.right + 8) : (rect.left - 8);
    const y = centerY;

    setTooltip({
      show: true,
      text: timestamp ? formatTime(timestamp) : tooltip.text,
      x, y, side
    });
  };

  // Kiểm tra xem tin nhắn có phải là tin nhắn cuối cùng từ người gửi không
  const isLastMessageFromSender = (messages, currentIndex) => {
    const currentMessage = messages[currentIndex];
    if (currentIndex === messages.length - 1) {
      return currentMessage.isOwn;
    }
    return false;
  };

  return (
    <>
      {/* ChatBox - Full */}
      <div
        ref={chatBoxRef}
        className={`${styles.chatBox} ${isOpen && !state.isChatBoxMinimized ? styles.show : styles.hide}`}
      >
        {/* Header */}
        <div className={styles.chatHeader}>
          <div className={styles.chatInfo}>
            <div className={styles.avatar}>
              {state.activeChatUser ? (
                <img
                  src={activeChatAvatar}
                  alt={state.activeChatUser.userName || state.activeChatUser.username || 'user'}
                  onError={(e) => {
                    e.target.src = '/default-avatar.png';
                    e.target.onerror = null; // Prevent infinite loop
                  }}
                />
              ) : (
                <UserIcon className="w-6 h-6" />
              )}
            </div>
            <div className={styles.chatDetails}>
              <h3 className={styles.chatTitle}>
                {state.activeChatUser ? (state.activeChatUser.userName || state.activeChatUser.username) : ''}
              </h3>
              <span className={styles.chatStatus}>
                {state.isConnected ? t('userChat.status.active') : state.isConnecting ? t('userChat.status.connecting') : t('userChat.status.disconnected')}
              </span>
            </div>
          </div>

          <div className={styles.chatActions}>
            <button
              className={styles.actionBtn}
              onClick={handleMinimize}
              title={t('userChat.actions.minimize')}
            >
              <MinusIcon className="w-4 h-4" />
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
          <div
            ref={messagesContainerRef}
            className={styles.messages}
            onScroll={handleScroll}
          >
            {/* Loading indicator for more messages */}
            {state.isLoadingMoreMessages && (
              <div className={styles.loadingMore}>
                <div className={styles.typingIndicator}>
                  <div className={styles.typingDot}></div>
                  <div className={styles.typingDot}></div>
                  <div className={styles.typingDot}></div>
                </div>
                <span>{t('userChat.loading.olderMessages')}</span>
              </div>
            )}

            {/* Loading indicator ở giữa khi đang tải dữ liệu ban đầu */}
            {state.loadingMessages && state.messages.length === 0 ? (
              <div className={styles.loadingCenter}>
                <div className={styles.typingIndicator}>
                  <div className={styles.typingDot}></div>
                  <div className={styles.typingDot}></div>
                  <div className={styles.typingDot}></div>
                </div>
              </div>
            ) : state.messages.length === 0 ? (
              <div className={styles.emptyState}>
                <ChatBubbleLeftRightIcon className={styles.emptyIcon} />
                <p className={styles.emptyText}>
                  {state.activeChatUser
                    ? t('userChat.empty.startConversation', { userName: state.activeChatUser.userName || state.activeChatUser.username })
                    : t('userChat.empty.selectUser')
                  }
                </p>
              </div>
            ) : (
              state.messages.map((message, index) => {
                const showDateHeader = shouldShowDateHeader(state.messages, index);
                const isLastFromSender = isLastMessageFromSender(state.messages, index);
                const prev = index > 0 ? state.messages[index - 1] : null;
                const sameSender = prev && prev.isOwn === message.isOwn;
                const closeInTime = prev && (
                  (!message.timestamp || !prev.timestamp)
                    ? true
                    : Math.abs(new Date(message.timestamp) - new Date(prev.timestamp)) < 2 * 60 * 1000
                );
                const compact = sameSender && closeInTime;

                return (
                  <React.Fragment key={message.id ?? `i-${index}`}>
                    {/* Date Header */}
                    {showDateHeader && (
                      <div className={styles.dateHeader}>
                        {formatDateHeader(message.timestamp)}
                      </div>
                    )}

                    {/* Message */}
                    <div
                      data-mid={message.id}
                      className={`${styles.message} ${compact ? styles.compact : ''} ${message.isOwn ? styles.sent : styles.received}`}
                      onMouseEnter={(e) => handleMouseEnter(message.id, e, message.timestamp)}
                      onMouseMove={handleMouseMove}
                      onMouseLeave={handleMouseLeave}
                    >
                      <div className={styles.messageContent}>
                        <p className={styles.messageText}>{message.content}</p>
                      </div>

                      {/* Show sent status outside the bubble for last sent message */}
                      {isLastFromSender && message.isOwn && (
                        <div className={styles.sentStatusContainer}>
                          <span className={styles.sentStatus}>
                            {t('userChat.message.sent')} {formatRelativeTime(message.timestamp)}
                          </span>
                        </div>
                      )}
                    </div>
                  </React.Fragment>
                );
              })
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
              disabled={!newMessage.trim() || !state.activeChatUser || !(state.activeChatUser?.userId || state.activeChatUser?.id)}
              title={t('chat.send')}
            >
              <PaperAirplaneIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Multiple ChatBubbles - Minimized */}
      {(state.minimizedChats || []).map((minimizedChat, index) => {
        const activeChatUserId = state.activeChatUser?.userId || state.activeChatUser?.id;
        const isCurrentActiveChat = state.activeChatUser &&
          activeChatUserId === minimizedChat.userId;
        const bubbleAvatar = resolveUserAvatar(minimizedChat.user);
        const bubbleBottom = 100 + (index * 80);

        return (
          <div
            key={`${minimizedChat.userId}-${minimizedChat.timestamp}`}
            className={`${styles.chatBubble} ${isCurrentActiveChat && isOpen ? styles.hidden : ''}`}
            style={{
              bottom: `${bubbleBottom}px`,
              zIndex: 999 - index
            }}
            onClick={() => {
              window.dispatchEvent(new CustomEvent(CHAT_EVENTS.REGULAR_CHAT_OPENED));
              actions.restoreChatFromBubble(minimizedChat.userId);
            }}
          >
            <div className={styles.bubbleAvatar}>
              {minimizedChat.user ? (
                <img
                  src={bubbleAvatar || '/default-avatar.png'}
                  alt={minimizedChat.user.userName || minimizedChat.user.username || 'user'}
                  onError={(e) => {
                    e.target.src = '/default-avatar.png';
                    e.target.onerror = null; // Prevent infinite loop
                  }}
                />
              ) : (
                <UserIcon className="w-6 h-6" />
              )}
            </div>
            <div className={styles.bubbleInfo}>
              <span className={styles.bubbleName}>
                {minimizedChat.user.userName || minimizedChat.user.username}
              </span>
              {minimizedChat.messages.length > 0 && (
                <span className={styles.bubblePreview}>
                  {minimizedChat.messages[minimizedChat.messages.length - 1].content}
                </span>
              )}
            </div>
            <button
              className={styles.bubbleClose}
              onClick={(e) => {
                e.stopPropagation();
                actions.closeMinimizedChat(minimizedChat.userId);
              }}
              title={t('userChat.actions.close')}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <XMarkIcon className="w-3 h-3" />
            </button>
          </div>
        );
      })}

      {/* Global Tooltip Portal */}
      {tooltip.show && ReactDOM.createPortal(
        <div
          className={`globalTooltip ${tooltip.side === 'left' ? 'left' : 'right'}`}
          style={{
            position: 'fixed',
            top: `${tooltip.y}px`,
            left: tooltip.side === 'right' ? `${tooltip.x}px` : 'auto',
            right: tooltip.side === 'left' ? `${window.innerWidth - tooltip.x}px` : 'auto'
          }}
        >
          {tooltip.text}
        </div>,
        document.body
      )}
    </>
  );
};

export default ChatBox;
