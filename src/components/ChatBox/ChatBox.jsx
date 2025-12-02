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
import styles from './ChatBox.module.css';

// Utility functions for time handling
const formatTime = (timestamp) => {
  if (!timestamp) return 'Vừa xong';
  const date = new Date(timestamp);
  return date.toLocaleTimeString('vi-VN', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

const formatRelativeTime = (timestamp) => {
  if (!timestamp) return 'Vừa xong';
  const now = new Date();
  const messageTime = new Date(timestamp);
  const diffInMinutes = Math.floor((now - messageTime) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Vừa xong';
  if (diffInMinutes < 60) return `${diffInMinutes} phút trước`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} giờ trước`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays} ngày trước`;
  
  return messageTime.toLocaleDateString('vi-VN');
};

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
  
  // While streaming/live, timestamps might be missing; avoid inserting gaps
  if (!currentMessage.timestamp || !previousMessage.timestamp) return false;
  
  const currentTime = new Date(currentMessage.timestamp);
  const previousTime = new Date(previousMessage.timestamp);
  const diffInMinutes = Math.floor((currentTime - previousTime) / (1000 * 60));
  
  // Show timestamp if more than 5 minutes apart
  return diffInMinutes > 5;
};

const shouldShowDateHeader = (messages, currentIndex) => {
  if (currentIndex === 0) return true;
  
  const currentMessage = messages[currentIndex];
  const previousMessage = messages[currentIndex - 1];
  
  // While streaming/live, timestamps might be missing; do not add date headers
  if (!currentMessage.timestamp || !previousMessage.timestamp) return false;
  
  const currentDate = new Date(currentMessage.timestamp).toDateString();
  const previousDate = new Date(previousMessage.timestamp).toDateString();
  
  return currentDate !== previousDate;
};

const resolveUserAvatar = (user) =>
  getAvatarUrl(user?.avatar || user?.userAvatar || user?.avatarUrl || '');

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

  // Helper to get active chat key
  const getActiveChatKey = () =>
    state.activeChatUser?.userId ?? state.activeChatUser?.username ?? 'unknown';
  const activeChatAvatar = state.activeChatUser ? resolveUserAvatar(state.activeChatUser) : '/default-avatar.png';
  useEffect(() => {
    if (isOpen && (!state.allUsers || state.allUsers.length === 0)) {
      actions.loadAllUsers?.();
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

  // Handle scroll events for infinite scroll
  const handleScroll = (e) => {
    const container = e.target;
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;
    
    // Check if user is near the top (within 100px)
    if (scrollTop < 100 && state.hasMoreMessages && !state.isLoadingMoreMessages && !loadingOlderRef.current) {
      loadingOlderRef.current = true;

      const containerEl = messagesContainerRef.current;
      // Find the first visible element in viewport
      const children = Array.from(containerEl.querySelectorAll('[data-mid]'));
      const firstVisible = children.find(el => el.offsetTop >= containerEl.scrollTop - 2);
      
      if (firstVisible) {
        anchorRef.current = {
          id: firstVisible.getAttribute('data-mid'),
          top: firstVisible.offsetTop
        };
      } else {
        // Fallback if no element found
        anchorRef.current = { id: null, top: containerEl.scrollTop };
        previousScrollHeightRef.current = scrollHeight;
        previousScrollTopRef.current = scrollTop;
      }
      
      // Clear existing timeout
      if (loadMoreTimeoutRef.current) {
        clearTimeout(loadMoreTimeoutRef.current);
      }
      
      // Set timeout to load more messages after 500ms of being near top
      loadMoreTimeoutRef.current = setTimeout(() => {
        actions.loadMoreMessages();
      }, 500);
    }
    
    // Detect if user is manually scrolling
    setIsUserScrolling(true);
    
    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // Reset user scrolling flag after 1 second of no scrolling
    scrollTimeoutRef.current = setTimeout(() => {
      setIsUserScrolling(false);
    }, 1000);
  };

  // Handle scroll position when new messages are prepended
  const maintainScrollPosition = () => {
    if (messagesContainerRef.current && previousScrollHeightRef.current > 0) {
      const container = messagesContainerRef.current;
      const newScrollHeight = container.scrollHeight;
      const scrollDiff = newScrollHeight - previousScrollHeightRef.current;
      
      // Restore scroll position by adding the height difference
      container.scrollTop = previousScrollTopRef.current + scrollDiff;
      
      // Reset refs
      previousScrollHeightRef.current = 0;
      previousScrollTopRef.current = 0;
    }
  };

  // Effect for handling new messages
  useEffect(() => {
    // Check if we're currently prepending older messages
    const isPrepending = previousScrollHeightRef.current > 0 || state.isLoadingMoreMessages || loadingOlderRef.current;
    
    if (shouldScrollToBottom && !isPrepending) {
      scrollToBottom(true); // Instant scroll for new messages
      setShouldScrollToBottom(false);
    }
  }, [state.messages, shouldScrollToBottom, state.isLoadingMoreMessages]);

  // Effect to maintain scroll position when loading more messages
  useEffect(() => {
    // When state.isLoadingMoreMessages changes to false => prepend is done
    if (state.isLoadingMoreMessages === false && loadingOlderRef.current) {
      const containerEl = messagesContainerRef.current;
      if (containerEl) {
        const { id, top } = anchorRef.current;
        if (id) {
          const anchorEl = containerEl.querySelector(`[data-mid="${id}"]`);
          if (anchorEl) {
            const newTop = anchorEl.offsetTop;
            // Adjust scrollTop to keep anchor in the same position
            containerEl.scrollTop += (newTop - top);
          }
        } else {
          // Fallback using scrollHeight difference (when no id available)
          if (previousScrollHeightRef.current > 0) {
            const diff = containerEl.scrollHeight - previousScrollHeightRef.current;
            containerEl.scrollTop = previousScrollTopRef.current + diff;
          }
        }
      }

      // Reset everything
      anchorRef.current = { id: null, top: 0 };
      previousScrollHeightRef.current = 0;
      previousScrollTopRef.current = 0;
      loadingOlderRef.current = false;
    }
  }, [state.isLoadingMoreMessages]);

  // Effect for initial load - scroll to bottom after messages are loaded
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Effect to restore minimized chats on page refresh/load
  // This runs independently to ensure bubble chats are always restored
  useEffect(() => {
    // Only restore if currentUser is available
    if (!state.currentUser) return;
    
    // Restore minimized chats - this should always run when currentUser is available
    // This ensures bubble chats are restored even after page refresh
    actions.restoreMinimizedChats();
  }, [state.currentUser]); // Depend on currentUser

  // Effect to restore chat state on page refresh/load
  useEffect(() => {
    // Only restore if currentUser is available and hasn't been restored yet
    if (!state.currentUser || hasRestoredRef.current) return;
    
    // Check if chat should be restored from localStorage
    const savedChatState = localStorage.getItem('chatBoxState');
    
    if (savedChatState) {
      try {
        const { isOpen, activeChatUser, isMinimized } = JSON.parse(savedChatState);
        
        // If chat was minimized, don't restore it as open
        // The bubble chat should already be restored by the previous useEffect
        if (isMinimized) {
          // Mark as restored to prevent multiple restores
          hasRestoredRef.current = true;
          return;
        }
        
        if (isOpen && activeChatUser) {
          // Mark as restored to prevent multiple restores
          hasRestoredRef.current = true;
          
          // Restore chat state
          actions.openChatWithUser(activeChatUser);
        }
      } catch (error) {
        console.error('Error parsing saved chat state:', error);
        localStorage.removeItem('chatBoxState');
      }
    }
  }, [state.currentUser]); // Depend on currentUser

  // Effect: whenever chatbox opens or messages arrive while open, ensure we are at the bottom
  useEffect(() => {
    if (!isOpen || state.loadingMessages) return;

    if (state.messages.length > 0) {
      const s = messagesContainerRef.current;
      if (s) {
        s.scrollTop = s.scrollHeight; // instant scroll to bottom on open/reopen
      }
    }
  }, [isOpen, state.loadingMessages, state.activeChatUser, state.messages.length]);

  // Reset scroll position tracking when switching chats
  useEffect(() => {
    const key = getActiveChatKey();
    if (key && !initialScrolledRef.current[key]) {
      // Reset scroll position refs when switching to a new chat
      previousScrollHeightRef.current = 0;
      previousScrollTopRef.current = 0;
      anchorRef.current = { id: null, top: 0 };
      loadingOlderRef.current = false;
      hasRestoredRef.current = false; // Reset restore flag
    }
  }, [state.activeChatUser]);

  // Cleanup timeouts
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

  // Handle scroll and resize events to hide tooltip
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
        // Scroll to bottom when sending a message
        setShouldScrollToBottom(true);
      } catch (error) {
        console.error('Error sending message:', error);
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

  // Tính toán vị trí theo vị trí chuột tương đối với tin nhắn
  const positionGlobalTooltip = (targetEl, event, timestamp) => {
    const rect = targetEl.getBoundingClientRect();
    const centerY = rect.top + rect.height / 2;

    // Tính vị trí chuột tương đối với tin nhắn
    const mouseX = event.clientX;
    const messageCenterX = rect.left + rect.width / 2;
    
    // Xác định hướng dựa trên vị trí chuột so với trung tâm tin nhắn
    const side = mouseX < messageCenterX ? 'left' : 'right';
    
    // Tính vị trí tooltip
    const x = side === 'right' ? (rect.right + 8) : (rect.left - 8);
    const y = centerY;

    setTooltip({
      show: true,
      text: timestamp ? formatTime(timestamp) : tooltip.text,
      x, y, side
    });
  };

  const isLastMessageFromSender = (messages, currentIndex) => {
    const currentMessage = messages[currentIndex];
    
    // Only show "Đã gửi" for the very last message in the conversation
    if (currentIndex === messages.length - 1) {
      return currentMessage.isOwn;
    }
    
    // Don't show "Đã gửi" for messages that are not the last one
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
                <img src={activeChatAvatar} alt={state.activeChatUser.userName || state.activeChatUser.username || 'user'} />
              ) : (
                <UserIcon className="w-6 h-6" />
              )}
            </div>
            <div className={styles.chatDetails}>
              <h3 className={styles.chatTitle}>
                {state.activeChatUser ? (state.activeChatUser.userName || state.activeChatUser.username) : ''}
              </h3>
              <span className={styles.chatStatus}>
                {state.isConnected ? 'Đang hoạt động' : state.isConnecting ? 'Đang kết nối...' : 'Mất kết nối'}
              </span>
            </div>
          </div>
          
          <div className={styles.chatActions}>
            <button 
              className={styles.actionBtn}
              onClick={handleMinimize}
              title="Thu nhỏ"
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
                <span>Đang tải tin nhắn cũ...</span>
              </div>
            )}
            
            {state.messages.length === 0 ? (
              <div className={styles.emptyState}>
                <ChatBubbleLeftRightIcon className={styles.emptyIcon} />
                <p className={styles.emptyText}>
                  {state.activeChatUser 
                    ? `Bắt đầu cuộc trò chuyện với ${state.activeChatUser.userName || state.activeChatUser.username}`
                    : 'Chọn một người dùng để bắt đầu chat'
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
                  // If timestamps are missing during live updates, consider them close to compact spacing
                  (!message.timestamp || !prev.timestamp)
                    ? true
                    : Math.abs(new Date(message.timestamp) - new Date(prev.timestamp)) < 2 * 60 * 1000
                ); // 2 minutes
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
                      
                      {/* Show "Đã gửi" status outside the bubble for last sent message */}
                      {isLastFromSender && message.isOwn && (
                        <div className={styles.sentStatusContainer}>
                          <span className={styles.sentStatus}>
                            Đã gửi {formatRelativeTime(message.timestamp)}
                          </span>
                        </div>
                      )}
                    </div>
                  </React.Fragment>
                );
              })
            )}
            
            {state.loadingMessages && (
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
              disabled={!newMessage.trim() || !state.activeChatUser}
              title={t('chat.send')}
            >
              <PaperAirplaneIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Multiple ChatBubbles - Minimized */}
      {(state.minimizedChats || []).map((minimizedChat, index) => {
        // Only hide the bubble if it's the currently active chat user
        const isCurrentActiveChat = state.activeChatUser && 
          (state.activeChatUser.userName === minimizedChat.userId || 
           state.activeChatUser.username === minimizedChat.userId);
        const bubbleAvatar = resolveUserAvatar(minimizedChat.user);
        
        // Tính toán vị trí bottom: bubble đầu tiên ở 100px (tránh Coze), các bubble tiếp theo cách nhau 80px
        // Coze bubble thường ở ~76px (56px height + 20px bottom), nên để 100px là an toàn
        const bubbleBottom = 100 + (index * 80);
        
        return (
          <div 
            key={`${minimizedChat.userId}-${minimizedChat.timestamp}`}
            className={`${styles.chatBubble} ${isCurrentActiveChat && isOpen ? styles.hidden : ''}`}
            style={{
              bottom: `${bubbleBottom}px`, // Stack bubbles vertically, bắt đầu từ 100px để tránh Coze
              zIndex: 999 - index
            }}
            onClick={() => actions.restoreChatFromBubble(minimizedChat.userId)}
          >
          <div className={styles.bubbleAvatar}>
            {minimizedChat.user ? (
              <img src={bubbleAvatar} alt={minimizedChat.user.userName || minimizedChat.user.username || 'user'} />
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
            title="Đóng"
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
