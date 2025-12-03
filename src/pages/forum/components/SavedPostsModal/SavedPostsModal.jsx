import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../contexts/AuthContext';
import { API_ENDPOINTS, createAuthHeaders } from '../../../../config/api';
import { checkAndHandle401 } from '../../../../utils/apiErrorHandler';
import { X, User, Calendar, Bookmark, Trash2, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
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
  const savedPostsCacheRef = useRef(null);

  useEffect(() => {
    if (isOpen && user) {
      setCurrentPage(1);
      // If we have cached data, show it immediately without loading
      if (savedPostsCacheRef.current) {
        setSavedPosts(savedPostsCacheRef.current);
        setTotalPages(Math.ceil(savedPostsCacheRef.current.length / postsPerPage));
        // Fetch in background to update cache
        fetchSavedPosts(false);
      } else {
        // Only show loading on first load when no cache exists
        fetchSavedPosts(true);
      }
    }
  }, [isOpen, user]);

  const fetchSavedPosts = async (showLoading = false) => {
    if (showLoading) {
      setIsLoading(true);
      setError(null);
    }
    try {
      const token = getToken();
      const email = user?.email || localStorage.getItem('email') || '';
      
      const response = await fetch(API_ENDPOINTS.SAVED_POSTS_MY_SAVED, {
        headers: createAuthHeaders(token, { 'User-Email': email })
      });
      
      // Handle 401 if token expired
      if (!response.ok && response.status === 401) {
        await checkAndHandle401(response);
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        const allPosts = data.result || [];
        setSavedPosts(allPosts);
        setTotalPages(Math.ceil(allPosts.length / postsPerPage));
        // Cache the data for next time
        savedPostsCacheRef.current = allPosts;
        // Clear error if fetch was successful
        setError(null);
      } else {
        throw new Error('Failed to fetch saved posts');
      }
    } catch (error) {
      // Only show error if we're showing loading (user-initiated fetch)
      if (showLoading) {
        setError(t('forum.modals.savedPosts.loadError'));
      }
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
      
      // Handle 401 if token expired
      if (!response.ok && response.status === 401) {
        await checkAndHandle401(response);
        return;
      }
      
      if (response.ok) {
        // Remove from local state
        const updatedPosts = savedPosts.filter(post => post.postId !== postId);
        const newTotalPages = Math.ceil(updatedPosts.length / postsPerPage);
        
        setSavedPosts(updatedPosts);
        setTotalPages(newTotalPages);
        
        // If current page is greater than new total pages, go to last page (or page 1 if no posts)
        if (currentPage > newTotalPages && newTotalPages > 0) {
          setCurrentPage(newTotalPages);
        } else if (newTotalPages === 0) {
          setCurrentPage(1);
        }
        
        // Update cache
        savedPostsCacheRef.current = updatedPosts;
        
        // Notify PostCard components to refresh their save status
        window.dispatchEvent(new CustomEvent('post-unsaved', { 
          detail: { postId: postId } 
        }));
      }
    } catch (error) {
      // Silently handle error unsaving post
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
          <button className={styles['close-btn']} onClick={onClose}>
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>
        
        <div className={styles['saved-posts-content']}>
          {isLoading ? (
            <div className={styles['loading-container']}>
              <Loader2 size={32} strokeWidth={1.5} className={styles['loading-icon']} />
              <p>{t('forum.loading')}</p>
            </div>
          ) : error ? (
            <div className={styles['error-container']}>
              <p>{error}</p>
              <button onClick={() => fetchSavedPosts(true)} className={styles['retry-btn']}>
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
                      <span className={styles['saved-post-author']}>
                        <User size={12} strokeWidth={1.5} />
                        {savedPost.postAuthor}
                      </span>
                      <span className={styles['saved-post-date']}>
                        <Calendar size={12} strokeWidth={1.5} />
                        {formatDate(savedPost.postCreatedAt)}
                      </span>
                      <span className={styles['saved-at']}>
                        <Bookmark size={12} strokeWidth={1.5} />
                        {t('forum.modals.savedPosts.savedAt')}: {formatDate(savedPost.savedAt)}
                      </span>
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
                      <Trash2 size={14} strokeWidth={1.5} />
                      <span>{t('forum.modals.savedPosts.unsave')}</span>
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
                  <ChevronLeft size={16} strokeWidth={1.5} />
                  <span>{t('forum.modals.savedPosts.previous')}</span>
                </button>
                
                <div className={styles['pagination-numbers']}>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      className={`${styles['pagination-number']} ${currentPage === page ? styles['active'] : ''}`}
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
                  <span>{t('forum.modals.savedPosts.next')}</span>
                  <ChevronRight size={16} strokeWidth={1.5} />
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
