import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../../contexts/AuthContext';
import './SavedPostsModal.css';

const SavedPostsModal = ({ isOpen, onClose, onPostClick }) => {
  const { user } = useAuth();
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
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      const email = user?.email || localStorage.getItem('email') || '';
      
      const response = await fetch('http://localhost:8080/api/saved-posts/my-saved', {
        headers: {
          'User-Email': email,
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
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
      setError('Không thể tải danh sách bài viết đã lưu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnsavePost = async (postId) => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      const email = user?.email || localStorage.getItem('email') || '';
      
      const response = await fetch(`http://localhost:8080/api/saved-posts/unsave/${postId}`, {
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
    <div className="saved-posts-overlay">
      <div className="saved-posts-modal">
        <div className="saved-posts-header">
          <h2>📚 Bài viết đã lưu</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        
        <div className="saved-posts-content">
          {isLoading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Đang tải...</p>
            </div>
          ) : error ? (
            <div className="error-container">
              <p>{error}</p>
              <button onClick={fetchSavedPosts} className="retry-btn">
                Thử lại
              </button>
            </div>
          ) : savedPosts.length === 0 ? (
            <div className="empty-container">
              <p>Bạn chưa lưu bài viết nào</p>
            </div>
          ) : (
            <div className="saved-posts-list">
              {getCurrentPagePosts().map((savedPost) => (
                <div key={savedPost.savedPostId} className="saved-post-item">
                  <div 
                    className="saved-post-content clickable"
                    onClick={() => {
                      if (onPostClick) {
                        onPostClick(savedPost.postId);
                        onClose();
                      }
                    }}
                    title="Click để xem bài viết"
                  >
                    <h3 className="saved-post-title">{savedPost.postTitle}</h3>
                    <p className="saved-post-text">{savedPost.postContent}</p>
                    <div className="saved-post-meta">
                      <span className="saved-post-author">👤 {savedPost.postAuthor}</span>
                      <span className="saved-post-date">📅 {formatDate(savedPost.postCreatedAt)}</span>
                      <span className="saved-at">💾 Lưu lúc: {formatDate(savedPost.savedAt)}</span>
                    </div>
                    {savedPost.note && (
                      <div className="saved-post-note">
                        <strong>Ghi chú:</strong> {savedPost.note}
                      </div>
                    )}
                  </div>
                  <div className="saved-post-actions">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnsavePost(savedPost.postId);
                      }}
                      className="unsave-btn"
                    >
                      🗑️ Bỏ lưu
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Pagination */}
          {savedPosts.length > 0 && totalPages > 1 && (
            <div className="pagination-container">
              <div className="pagination">
                <button 
                  className="pagination-btn"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  ← Trước
                </button>
                
                <div className="pagination-numbers">
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
                  className="pagination-btn"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Sau →
                </button>
              </div>
              
              <div className="pagination-info">
                Trang {currentPage} / {totalPages} ({savedPosts.length} bài viết)
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SavedPostsModal;
