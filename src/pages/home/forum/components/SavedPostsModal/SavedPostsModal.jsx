import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../../contexts/AuthContext';
import { API_ENDPOINTS, createAuthHeaders } from '../../../../../config/api';
import styles from './SavedPostsModal.module.css';

const SavedPostsModal = ({ isOpen, onClose, onPostClick }) => {
  const { t } = useTranslation();
  const { user, getToken } = useAuth();
  const [savedPosts, setSavedPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const postsPerPage = 3;

  useEffect(() => {
    if (isOpen && user) {
      setCurrentPage(1);
      fetchSavedPosts();
    }
  }, [isOpen, user]);

  const fetchSavedPosts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = getToken();
      const email = user?.email || localStorage.getItem('email') || '';
      
      const response = await fetch(API_ENDPOINTS.SAVED_POSTS_MY_SAVED, {
        headers: createAuthHeaders(token, { 'User-Email': email })
      });
      
      if (response.ok) {
        const data = await response.json();
        const allPosts = data.result || [];
        setSavedPosts(allPosts);
        setTotalPages(Math.ceil(allPosts.length / postsPerPage));
      } else {
        throw new Error('Failed to fetch saved posts');
      }
    } catch (error) {
      console.error('Error fetching saved posts:', error);
      setError(t('forum.modals.savedPosts.loadError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnsavePost = async (postId) => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      const email = user?.email || localStorage.getItem('email') || '';
      
      const response = await fetch(API_ENDPOINTS.SAVED_POSTS_UNSAVE(postId), {
        method: 'DELETE',
        headers: {
          'User-Email': email,
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      
      if (response.ok) {
        // Remove from local state
        setSavedPosts(prev => prev.filter(post => post.postId !== postId));
        
        // Notify PostCard components to refresh their save status
        window.dispatchEvent(new CustomEvent('post-unsaved', { 
          detail: { postId: postId } 
        }));
      }
    } catch (error) {
      console.error('Error unsaving post:', error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculate posts for current page
  const getCurrentPagePosts = () => {
    const startIndex = (currentPage - 1) * postsPerPage;
    const endIndex = startIndex + postsPerPage;
    return savedPosts.slice(startIndex, endIndex);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  if (!isOpen) return null;

  return (
    <div className={styles['saved-posts-overlay']}>
      <div className={styles['saved-posts-modal']}>
        <div className={styles['saved-posts-header']}>
          <h2>{t('forum.modals.savedPosts.title')}</h2>
          <button className={styles['close-btn']} onClick={onClose}>&times;</button>
        </div>
        
        <div className={styles['saved-posts-content']}>
          {isLoading ? (
            <div className={styles['loading-container']}>
              <div className={styles['loading-spinner']}></div>
              <p>{t('forum.loading')}</p>
            </div>
          ) : error ? (
            <div className={styles['error-container']}>
              <p>{error}</p>
              <button onClick={fetchSavedPosts} className={styles['retry-btn']}>
                {t('forum.modals.savedPosts.retry')}
              </button>
            </div>
          ) : savedPosts.length === 0 ? (
            <div className={styles['empty-container']}>
              <p>{t('forum.modals.savedPosts.noSavedPosts')}</p>
            </div>
          ) : (
            <div className={styles['saved-posts-list']}>
              {getCurrentPagePosts().map((savedPost) => (
                <div key={savedPost.savedPostId} className={styles['saved-post-item']}>
                  <div 
                    className={`${styles['saved-post-content']} ${styles['clickable']}`}
                    onClick={() => {
                      if (onPostClick) {
                        onPostClick(savedPost.postId);
                        onClose();
                      }
                    }}
                    title={t('forum.modals.savedPosts.clickToView')}
                  >
                    <h3 className={styles['saved-post-title']}>{savedPost.postTitle}</h3>
                    <p className={styles['saved-post-text']}>{savedPost.postContent}</p>
                    <div className={styles['saved-post-meta']}>
                      <span className={styles['saved-post-author']}>👤 {savedPost.postAuthor}</span>
                      <span className={styles['saved-post-date']}>📅 {formatDate(savedPost.postCreatedAt)}</span>
                      <span className={styles['saved-at']}>💾 {t('forum.modals.savedPosts.savedAt')}: {formatDate(savedPost.savedAt)}</span>
                    </div>
                    {savedPost.note && (
                      <div className={styles['saved-post-note']}>
                        <strong>{t('forum.modals.savedPosts.note')}:</strong> {savedPost.note}
                      </div>
                    )}
                  </div>
                  <div className={styles['saved-post-actions']}>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnsavePost(savedPost.postId);
                      }}
                      className={styles['unsave-btn']}
                    >
                      🗑️ {t('forum.modals.savedPosts.unsave')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Pagination */}
          {savedPosts.length > 0 && totalPages > 1 && (
            <div className={styles['pagination-container']}>
              <div className={styles['pagination']}>
                <button 
                  className={styles['pagination-btn']}
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  ← {t('forum.modals.savedPosts.previous')}
                </button>
                
                <div className={styles['pagination-numbers']}>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      className={`pagination-number ${currentPage === page ? 'active' : ''}`}
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                
                <button 
                  className={styles['pagination-btn']}
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  {t('forum.modals.savedPosts.next')} →
                </button>
              </div>
              
              <div className={styles['pagination-info']}>
                {t('forum.modals.savedPosts.pageInfo', { current: currentPage, total: totalPages, count: savedPosts.length })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SavedPostsModal;
