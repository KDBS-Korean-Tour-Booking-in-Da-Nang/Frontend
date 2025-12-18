import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../contexts/AuthContext';
import { useChat } from '../../../../contexts/ChatContext';
import { getAvatarUrl } from '../../../../config/api';
import chatApiService from '../../../../services/chatApiService';
import styles from './UserHoverCard.module.css';
import { MessageCircle } from 'lucide-react';

const UserHoverCard = ({ user, triggerRef, position = 'bottom' }) => {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const { state, actions } = useChat();
  const [isVisible, setIsVisible] = useState(false);
  const [cardPosition, setCardPosition] = useState({ top: 0, left: 0 });
  const cardRef = useRef(null);
  const timeoutRef = useRef(null);

  // Không hiển thị hover card cho current user: check userEmail hoặc username match với currentUser
  const isOwnUser = currentUser && user && (
    (user.userEmail && currentUser.email && user.userEmail.toLowerCase() === currentUser.email.toLowerCase()) ||
    (user.username && currentUser.username && user.username.toLowerCase() === currentUser.username.toLowerCase())
  );

  useEffect(() => {
    if (!triggerRef?.current) return;

    const trigger = triggerRef.current;

    const handleMouseEnter = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setIsVisible(true);
      // Use requestAnimationFrame to ensure card is rendered before calculating position
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          updateCardPosition();
        });
      });
    };

    // Xử lý mouse leave: check nếu mouse đang di chuyển đến card thì không hide, nếu không thì hide sau 100ms
    const handleMouseLeave = (e) => {
      if (cardRef.current && cardRef.current.contains(e.relatedTarget)) {
        return;
      }
      
      timeoutRef.current = setTimeout(() => {
        setIsVisible(false);
      }, 100);
    };

    const updateCardPosition = () => {
      if (!trigger || !cardRef.current) return;

      const triggerRect = trigger.getBoundingClientRect();
      const cardRect = cardRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (cardRect.width === 0 || cardRect.height === 0) {
        setTimeout(() => {
          if (cardRef.current) {
            updateCardPosition();
          }
        }, 10);
        return;
      }

      let top = 0;
      let left = 0;

      if (position === 'bottom') {
        top = triggerRect.bottom + 8;
        left = triggerRect.left + triggerRect.width / 2 - cardRect.width / 2;
        
        if (top + cardRect.height > viewportHeight) {
          top = triggerRect.top - cardRect.height - 8;
        }
      } else {
        top = triggerRect.top - cardRect.height - 8;
        left = triggerRect.left + triggerRect.width / 2 - cardRect.width / 2;
        
        if (top < 0) {
          top = triggerRect.bottom + 8;
        }
      }

      if (left < 8) {
        left = 8;
      } else if (left + cardRect.width > viewportWidth - 8) {
        left = viewportWidth - cardRect.width - 8;
      }

      setCardPosition({ top, left });
    };

    trigger.addEventListener('mouseenter', handleMouseEnter);
    trigger.addEventListener('mouseleave', handleMouseLeave);

    window.addEventListener('resize', updateCardPosition);
    window.addEventListener('scroll', updateCardPosition, true);

    return () => {
      trigger.removeEventListener('mouseenter', handleMouseEnter);
      trigger.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', updateCardPosition);
      window.removeEventListener('scroll', updateCardPosition, true);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [triggerRef, position]);

  // Handle mouse events on the card itself and update position
  useEffect(() => {
    if (!isVisible || !cardRef.current || !triggerRef?.current) return;

    const card = cardRef.current;
    const trigger = triggerRef.current;

    const updatePosition = () => {
      if (!trigger || !cardRef.current) return;

      const triggerRect = trigger.getBoundingClientRect();
      const cardRect = cardRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (cardRect.width === 0 || cardRect.height === 0) {
        return;
      }

      let top = 0;
      let left = 0;

      if (position === 'bottom') {
        top = triggerRect.bottom + 8;
        left = triggerRect.left + triggerRect.width / 2 - cardRect.width / 2;
        
        if (top + cardRect.height > viewportHeight) {
          top = triggerRect.top - cardRect.height - 8;
        }
      } else {
        top = triggerRect.top - cardRect.height - 8;
        left = triggerRect.left + triggerRect.width / 2 - cardRect.width / 2;
        
        if (top < 0) {
          top = triggerRect.bottom + 8;
        }
      }

      if (left < 8) {
        left = 8;
      } else if (left + cardRect.width > viewportWidth - 8) {
        left = viewportWidth - cardRect.width - 8;
      }

      setCardPosition({ top, left });
    };

    const handleMouseEnter = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setIsVisible(true);
      // Use requestAnimationFrame to ensure card is rendered before calculating position
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          updatePosition();
        });
      });
    };

    const handleMouseLeave = (e) => {
      if (trigger.contains(e.relatedTarget)) {
        return;
      }
      
      timeoutRef.current = setTimeout(() => {
        setIsVisible(false);
      }, 100);
    };

    card.addEventListener('mouseenter', handleMouseEnter);
    card.addEventListener('mouseleave', handleMouseLeave);
    
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      card.removeEventListener('mouseenter', handleMouseEnter);
      card.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isVisible, triggerRef, position]);

  const handleSendMessage = async () => {
    if (!currentUser || !user) return;

    const normalize = (val) => (val || '').toString().trim().toLowerCase();

    let userId = user.userId || user.id || user.userID || user._id;
    
    if (!userId) {
      const username = user.username || user.userName || user.name;
      const email = user.userEmail || user.email;
      const normUsername = normalize(username);
      const normEmail = normalize(email);
      
      if (state?.allUsers && state.allUsers.length > 0) {
        const foundUser = state.allUsers.find(u => 
          (normUsername && (
            normalize(u.username) === normUsername ||
            normalize(u.userName) === normUsername ||
            normalize(u.name) === normUsername
          )) ||
          (normEmail && (
            normalize(u.email) === normEmail ||
            normalize(u.userEmail) === normEmail
          ))
        );
        if (foundUser) {
          userId = foundUser.userId || foundUser.id || foundUser.userID || foundUser._id;
        }
      }
      
      if (!userId && actions?.loadAllUsers) {
        await actions.loadAllUsers();
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const refreshedUsers = state?.allUsers || [];
        const foundUser = refreshedUsers.find(u => 
          (normUsername && (
            normalize(u.username) === normUsername ||
            normalize(u.userName) === normUsername ||
            normalize(u.name) === normUsername
          )) ||
          (normEmail && (
            normalize(u.email) === normEmail ||
            normalize(u.userEmail) === normEmail
          ))
        );
        if (foundUser) {
          userId = foundUser.userId || foundUser.id || foundUser.userID || foundUser._id;
        }
      }
    }

    if (!userId && state?.conversations && state.conversations.length > 0) {
      const username = user.username || user.userName || user.name;
      const email = user.userEmail || user.email;
      const normUsername = normalize(username);
      const normEmail = normalize(email);
      
      const foundConv = state.conversations.find(conv => {
        const convUser = conv.user;
        return (normUsername && (
          normalize(convUser?.username) === normUsername ||
          normalize(convUser?.userName) === normUsername ||
          normalize(convUser?.name) === normUsername
        )) ||
        (normEmail && (
          normalize(convUser?.userEmail) === normEmail ||
          normalize(convUser?.email) === normEmail
        ));
      });
      
      if (foundConv?.user) {
        userId = foundConv.user.userId || foundConv.user.id || foundConv.user.userID || foundConv.user._id;
      }
    }

    if (!userId) {
      try {
        const usersFromApi = await chatApiService.getAllUsers();
        if (Array.isArray(usersFromApi) && usersFromApi.length > 0) {
          const foundUser = usersFromApi.find(u =>
            (normEmail && (
              normalize(u.email) === normEmail ||
              normalize(u.userEmail) === normEmail
            )) ||
            (normUsername && (
              normalize(u.username) === normUsername ||
              normalize(u.userName) === normUsername ||
              normalize(u.name) === normUsername
            ))
          );
          if (foundUser) {
            userId = foundUser.userId || foundUser.id || foundUser.userID || foundUser._id;
          }
        }
      } catch (error) {
        // Silently handle error
      }
    }

    if (!userId) {
      const email = user.userEmail || user.email;
      if (email) {
        try {
          const userInfo = await chatApiService.getUserByEmail(email);
          if (userInfo && (userInfo.userId || userInfo.id)) {
            userId = userInfo.userId || userInfo.id || userInfo.userID || userInfo._id;
          }
        } catch (error) {
          // Silently handle error
        }
      }
    }

    if (!userId) {
      return;
    }

    const chatUser = {
      userId: userId,
      id: userId,
      userName: user.username || user.userName || user.name || '',
      username: user.username || user.userName || user.name || '',
      avatar: user.userAvatar || user.avatar || null,
      userAvatar: user.userAvatar || user.avatar || null,
      userEmail: user.userEmail || user.email || null,
      email: user.email || user.userEmail || null
    };

    await actions.openChatWithUser(chatUser);
    
    setIsVisible(false);
  };

  if (!isVisible || isOwnUser || !user) return null;

  const displayName = user.username || user.userName || user.name || 'Unknown User';
  const avatarUrl = getAvatarUrl(user.userAvatar || user.avatar) || '/default-avatar.png';
  const hasResolvableIdentity = Boolean(
    user.userId ||
    user.id ||
    user.userID ||
    user._id ||
    user.userEmail ||
    user.email ||
    user.username ||
    user.userName ||
    user.name
  );

  const cardContent = (
    <div
      ref={cardRef}
      className={styles['user-hover-card']}
      style={{
        position: 'fixed',
        top: `${cardPosition.top}px`,
        left: `${cardPosition.left}px`,
        zIndex: 10000
      }}
    >
      <div className={styles['card-header']}>
        <img 
          src={avatarUrl || '/default-avatar.png'} 
          alt={displayName}
          className={styles['card-avatar']}
          onError={(e) => {
            e.target.src = '/default-avatar.png';
            e.target.onerror = null; // Prevent infinite loop
          }}
        />
        <div className={styles['card-user-info']}>
          <div className={styles['card-username']}>{displayName}</div>
          {user.userEmail && (
            <div className={styles['card-email']}>{user.userEmail}</div>
          )}
        </div>
      </div>
      
      {currentUser && (
        <div className={styles['card-actions']}>
          <button 
            className={styles['send-message-btn']}
            onClick={handleSendMessage}
            disabled={!hasResolvableIdentity}
          >
            <MessageCircle strokeWidth={1.6} />
            {t('common.sendMessage')}
          </button>
        </div>
      )}
    </div>
  );

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(cardContent, document.body);
};

export default UserHoverCard;

