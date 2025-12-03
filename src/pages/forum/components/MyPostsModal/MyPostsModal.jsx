import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../contexts/AuthContext';
import { BaseURL, API_ENDPOINTS, createAuthHeaders } from '../../../../config/api';
import { DeleteConfirmModal } from '../../../../components';
import styles from './MyPostsModal.module.css';

const MyPostsModal = ({ isOpen, onClose, onPostClick }) => {
  const { t } = useTranslation();
  const { user, getToken } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [postToDelete, setPostToDelete] = useState(null);

  const postsPerPage = 5;

  useEffect(() => {
    if (isOpen && user) {
      fetchMyPosts();
    }
  }, [isOpen, user, currentPage]);

  const fetchMyPosts = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      const response = await fetch(
        `${API_ENDPOINTS.MY_POSTS}?page=${currentPage}&size=${postsPerPage}`,
        {
          headers: {
            'User-Email': user.email,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPosts(data.content || []);
        setTotalPages(data.totalPages || 0);
      } else {
        console.error('Failed to fetch my posts');
      }
    } catch (error) {
      console.error('Error fetching my posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePostClick = (post) => {
    console.log('MyPostsModal handlePostClick - post object:', post);
    console.log('MyPostsModal handlePostClick - post.forumPostId:', post.forumPostId);
    if (onPostClick) {
      onPostClick(post.forumPostId);
    }
    onClose();
  };

  const handleDeleteClick = (post) => {
    setPostToDelete(post);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!postToDelete || !user) return;

    try {
      const token = getToken();
      const response = await fetch(
        `${API_ENDPOINTS.POST_BY_ID(postToDelete.forumPostId)}?userEmail=${encodeURIComponent(user.email)}`,
        {
          method: 'DELETE',
          headers: createAuthHeaders(token),
        }
      );

      if (response.ok) {
        // Remove deleted post from list
        setPosts(posts.filter(p => p.forumPostId !== postToDelete.forumPostId));
        setShowDeleteModal(false);
        setPostToDelete(null);
      } else {
        console.error('Failed to delete post');
        alert(t('forum.post.deleteError'));
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      alert(t('forum.post.deleteError'));
    }
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
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

  if (!isOpen) return null;

  return (
    <>
      <div className={styles['my-posts-modal-overlay']} onClick={onClose}>
        <div className={styles['my-posts-modal']} onClick={(e) => e.stopPropagation()}>
          <div className={styles['my-posts-modal-header']}>
            <h3 className={styles['my-posts-modal-title']}>
              {t('forum.myPosts.title')}
            </h3>
            <button 
              className={styles['my-posts-modal-close']} 
              onClick={onClose}
              aria-label={t('common.close')}
            >
              ✕
            </button>
          </div>

          <div className={styles['my-posts-modal-body']}>
            {loading ? (
              <div className={styles['my-posts-loading']}>
                <div className={styles['loading-spinner']}></div>
                <p>{t('common.loading')}</p>
              </div>
            ) : posts.length === 0 ? (
              <div className={styles['my-posts-empty']}>
                <div className={styles['empty-icon']}>📝</div>
                <p>{t('forum.myPosts.empty')}</p>
              </div>
            ) : (
              <div className={styles['my-posts-list']}>
                {posts.map((post) => (
                  <div key={post.forumPostId} className={styles['my-post-item']}>
                    <div 
                      className={styles['my-post-content']}
                      onClick={() => handlePostClick(post)}
                    >
                      <h4 className={styles['my-post-title']}>{post.title}</h4>
                      <p className={styles['my-post-preview']}>
                        {post.content.length > 100 
                          ? `${post.content.substring(0, 100)}...` 
                          : post.content}
                      </p>
                      <div className={styles['my-post-meta']}>
                        <span className={styles['my-post-date']}>{formatDate(post.createdAt)}</span>
                        <div className={styles['my-post-stats']}>
                          <span className={styles['stat-item']}>
                            👍 {post.reactions?.likeCount || 0}
                          </span>
                          <span className={styles['stat-item']}>
                            👎 {post.reactions?.dislikeCount || 0}
                          </span>
                          <span className={styles['stat-item']}>
                            💾 {post.saveCount || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button 
                      className={styles['my-post-delete-btn']}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(post);
                      }}
                      title={t('common.delete')}
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className={styles['my-posts-modal-footer']}>
              <div className={styles['pagination']}>
                <button 
                  className={styles['pagination-btn']}
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 0}
                >
                  {t('common.previous')}
                </button>
                <span className={styles['pagination-info']}>
                  {currentPage + 1} / {totalPages}
                </span>
                <button 
                  className={styles['pagination-btn']}
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages - 1}
                >
                  {t('common.next')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setPostToDelete(null);
        }}
        onConfirm={confirmDelete}
        itemName={t('forum.post.post')}
      />
    </>
  );
};

export default MyPostsModal;
