import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../../contexts/AuthContext';
import './ReactionsModal.css';

const ReactionsModal = ({ isOpen, onClose, onPostClick }) => {
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
    
    if (diffInMinutes < 1) return 'Vừa xong';
    if (diffInMinutes < 60) return `${diffInMinutes} phút trước`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} giờ trước`;
    return `${Math.floor(diffInMinutes / 1440)} ngày trước`;
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
      case 'LIKE': return 'Đã thích';
      case 'DISLIKE': return 'Đã không thích';
      default: return 'Phản ứng';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="reactions-modal-overlay" onClick={onClose}>
      <div className="reactions-modal" onClick={(e) => e.stopPropagation()}>
        <div className="reactions-modal-header">
          <h3>Bài viết đã tương tác</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="reactions-tabs">
          <button 
            className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            Tất cả
          </button>
          <button 
            className={`tab-btn ${activeTab === 'likes' ? 'active' : ''}`}
            onClick={() => setActiveTab('likes')}
          >
            👍 Đã thích
          </button>
          <button 
            className={`tab-btn ${activeTab === 'dislikes' ? 'active' : ''}`}
            onClick={() => setActiveTab('dislikes')}
          >
            👎 Đã không thích
          </button>
        </div>

        <div className="reactions-content">
          {loading ? (
            <div className="loading">Đang tải...</div>
          ) : reactions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">😴</div>
              <p>Chưa có bài viết nào được tương tác</p>
            </div>
          ) : (
            <div className="reactions-list">
              {reactions.map((reaction) => (
                <div key={reaction.reactionId} className="reaction-item">
                  <div 
                    className="reaction-info clickable"
                    onClick={() => {
                      if (onPostClick && reaction.targetType === 'POST') {
                        onPostClick(reaction.targetId);
                        onClose();
                      }
                    }}
                    title={reaction.targetType === 'POST' ? "Click để xem bài viết" : ""}
                  >
                    <div className="reaction-type">
                      <span className="reaction-icon">{getReactionIcon(reaction.reactionType)}</span>
                      <span className="reaction-text">{getReactionText(reaction.reactionType)}</span>
                    </div>
                    <div className="reaction-time">{formatTime(reaction.createdAt)}</div>
                  </div>
                  
                  <div className="reaction-target">
                    <div className="target-type">
                      {reaction.targetType === 'POST' ? '📝 Bài viết' : '💬 Bình luận'} #{reaction.targetId}
                    </div>
                  </div>

                  <div className="reaction-actions">
                    <button 
                      className="remove-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveReaction(reaction.reactionId, reaction.targetId, reaction.targetType);
                      }}
                      title="Bỏ tương tác"
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
