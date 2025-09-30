import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../../contexts/AuthContext';
import styles from './ReactionsModal.module.css';

const ReactionsModal = ({ isOpen, onClose, onPostClick }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [reactions, setReactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // all, likes, dislikes

  useEffect(() => {
    if (isOpen && user) {
      fetchReactions();
    }
  }, [isOpen, user, activeTab]);

  const fetchReactions = async () => {
    if (!user?.email) return;

    setLoading(true);
    try {
      let targetType = '';
      if (activeTab === 'likes') {
        targetType = 'LIKE';
      } else if (activeTab === 'dislikes') {
        targetType = 'DISLIKE';
      }

      const url = targetType
        ? `http://localhost:8080/api/reactions/user/${encodeURIComponent(user.email)}?reactionType=${targetType}`
        : `http://localhost:8080/api/reactions/user/${encodeURIComponent(user.email)}`;

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setReactions(data);
      } else {
        console.error('Failed to fetch reactions');
        setReactions([]);
      }
    } catch (error) {
      console.error('Error fetching reactions:', error);
      setReactions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveReaction = async (reactionId, targetId, targetType) => {
    try {
      const response = await fetch(`http://localhost:8080/api/reactions/${targetType}/${targetId}`, {
        method: 'POST',
        headers: {
          'User-Email': user.email,
        }
      });

      if (response.ok) {
        // Remove from local state
        setReactions(prev => prev.filter(r => r.reactionId !== reactionId));
      }
    } catch (error) {
      console.error('Error removing reaction:', error);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffInMinutes < 1) return t('forum.post.justNow');
    if (diffInMinutes < 60) return `${diffInMinutes} ${t('forum.post.minutes')} ${t('forum.post.ago')}`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} ${t('forum.post.hours')} ${t('forum.post.ago')}`;
    return `${Math.floor(diffInMinutes / 1440)} ${t('forum.post.days')} ${t('forum.post.ago')}`;
  };

  const getReactionIcon = (reactionType) => {
    switch (reactionType) {
      case 'LIKE': return '👍';
      case 'DISLIKE': return '👎';
      default: return '❓';
    }
  };

  const getReactionText = (reactionType) => {
    switch (reactionType) {
      case 'LIKE': return t('forum.modals.reactions.liked');
      case 'DISLIKE': return t('forum.modals.reactions.disliked');
      default: return t('forum.modals.reactions.reacted');
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles['reactions-modal-overlay']} onClick={onClose}>
      <div className={styles['reactions-modal']} onClick={(e) => e.stopPropagation()}>
        <div className={styles['reactions-modal-header']}>
          <h3>{t('forum.modals.reactions.title')}</h3>
          <button className={styles['close-btn']} onClick={onClose}>×</button>
        </div>

        <div className={styles['reactions-tabs']}>
          <button
            className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            {t('forum.modals.reactions.all')}
          </button>
          <button
            className={`tab-btn ${activeTab === 'likes' ? 'active' : ''}`}
            onClick={() => setActiveTab('likes')}
          >
            👍 {t('forum.modals.reactions.liked')}
          </button>
          <button
            className={`tab-btn ${activeTab === 'dislikes' ? 'active' : ''}`}
            onClick={() => setActiveTab('dislikes')}
          >
            👎 {t('forum.modals.reactions.disliked')}
          </button>
        </div>

        <div className={styles['reactions-content']}>
          {loading ? (
            <div className={styles['loading']}>{t('forum.loading')}</div>
          ) : reactions.length === 0 ? (
            <div className={styles['empty-state']}>
              <div className={styles['empty-icon']}>😴</div>
              <p>{t('forum.modals.reactions.noReactions')}</p>
            </div>
          ) : (
            <div className={styles['reactions-list']}>
              {reactions.map((reaction) => (
                <div key={reaction.reactionId} className={styles['reaction-item']}>
                  <div
                    className={`${styles['reaction-info']} ${styles['clickable']}`}
                    onClick={() => {
                      if (onPostClick && reaction.targetType === 'POST') {
                        onPostClick(reaction.targetId);
                        onClose();
                      }
                    }}
                    title={reaction.targetType === 'POST' ? t('forum.modals.reactions.clickToView') : ""}
                  >
                    <div className={styles['reaction-type']}>
                      <span className={styles['reaction-icon']}>{getReactionIcon(reaction.reactionType)}</span>
                      <span className={styles['reaction-text']}>{getReactionText(reaction.reactionType)}</span>
                    </div>
                    <div className={styles['reaction-time']}>{formatTime(reaction.createdAt)}</div>
                  </div>

                  <div className={styles['reaction-target']}>
                    <div className={styles['target-type']}>
                      {reaction.targetType === 'POST' ? `📝 ${t('forum.modals.reactions.post')}` : `💬 ${t('forum.modals.reactions.comment')}`} #{reaction.targetId}
                    </div>
                  </div>

                  <div className={styles['reaction-actions']}>
                    <button
                      className={styles['remove-btn']}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveReaction(reaction.reactionId, reaction.targetId, reaction.targetType);
                      }}
                      title={t('forum.modals.reactions.removeReaction')}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReactionsModal;
