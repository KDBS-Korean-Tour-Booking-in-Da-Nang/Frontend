import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../contexts/AuthContext';
import { useChat } from '../../../../contexts/ChatContext';
import { getAvatarUrl } from '../../../../config/api';
import styles from './UserHoverCard.module.css';
import { MessageCircle } from 'lucide-react';

const UserHoverCard = ({ user, triggerRef, position = 'bottom' }) => {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const { actions } = useChat();
  const [isVisible, setIsVisible] = useState(false);
  const [cardPosition, setCardPosition] = useState({ top: 0, left: 0 });
  const cardRef = useRef(null);
  const timeoutRef = useRef(null);

  // Don't show hover card for current user
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

    const handleMouseLeave = (e) => {
      // Check if mouse is moving to the card
      if (cardRef.current && cardRef.current.contains(e.relatedTarget)) {
        return; // Don't hide if moving to card
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

      // If card hasn't been rendered yet, wait a bit
      if (cardRect.width === 0 || cardRect.height === 0) {
        // Card not ready yet, retry after a short delay
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
        
        // Adjust if card goes off screen
        if (top + cardRect.height > viewportHeight) {
          // Show above trigger instead
          top = triggerRect.top - cardRect.height - 8;
        }
      } else {
        top = triggerRect.top - cardRect.height - 8;
        left = triggerRect.left + triggerRect.width / 2 - cardRect.width / 2;
        
        // Adjust if card goes off screen
        if (top < 0) {
          // Show below trigger instead
          top = triggerRect.bottom + 8;
        }
      }

      // Adjust horizontal position if goes off screen
      if (left < 8) {
        left = 8;
      } else if (left + cardRect.width > viewportWidth - 8) {
        left = viewportWidth - cardRect.width - 8;
      }

      setCardPosition({ top, left });
    };

    trigger.addEventListener('mouseenter', handleMouseEnter);
    trigger.addEventListener('mouseleave', handleMouseLeave);

    // Also listen to window resize to reposition
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

      // If card hasn't been rendered yet, wait a bit
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
      // Check if mouse is moving to the trigger
      if (trigger.contains(e.relatedTarget)) {
        return;
      }
      
      timeoutRef.current = setTimeout(() => {
        setIsVisible(false);
      }, 100);
    };

    card.addEventListener('mouseenter', handleMouseEnter);
    card.addEventListener('mouseleave', handleMouseLeave);
    
    // Update position on scroll/resize when card is visible
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

    // Prepare user object for chat
    const chatUser = {
      userName: user.username || user.userName,
      username: user.username || user.userName,
      avatar: user.userAvatar || user.avatar,
      userId: user.userId || user.id,
      userEmail: user.userEmail || user.email
    };

    // Open chat with user (this doesn't create a conversation yet)
    // Conversation will only be created when a message is actually sent
    await actions.openChatWithUser(chatUser);
    
    // Close the hover card
    setIsVisible(false);
  };

  if (!isVisible || isOwnUser || !user) return null;

  const displayName = user.username || user.userName || user.name || 'Unknown User';
  const avatarUrl = getAvatarUrl(user.userAvatar || user.avatar) || '/default-avatar.png';

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
          src={avatarUrl} 
          alt={displayName}
          className={styles['card-avatar']}
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

