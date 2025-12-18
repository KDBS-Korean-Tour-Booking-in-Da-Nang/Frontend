import { checkAndHandleApiError } from '../utils/apiErrorHandler';
import { API_ENDPOINTS } from '../config/api';

class ArticleCommentService {
  /**
   * Get authentication headers with Bearer token
   * Checks role-specific keys (token_ADMIN, token_STAFF) first, then legacy keys
   * @returns {Object} - Headers object with Authorization
   */
  getAuthHeaders() {
    const sessionToken = sessionStorage.getItem('token_ADMIN') || 
                         sessionStorage.getItem('token_STAFF') || 
                         sessionStorage.getItem('token');
    const localToken = localStorage.getItem('token_ADMIN') || 
                      localStorage.getItem('token_STAFF') || 
                      localStorage.getItem('token') ||
                      localStorage.getItem('accessToken');
    
    const token = sessionToken || localToken;
    
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  /**
   * Get user email from storage
   * @returns {string} - User email or empty string
   */
  // Lấy email người dùng từ storage
  // Ưu tiên theo role (ADMIN, STAFF), sau đó user chung
  // Kiểm tra sessionStorage trước, sau đó localStorage
  getUserEmail() {
    try {
      const sessionUser = sessionStorage.getItem('user_ADMIN') || 
                         sessionStorage.getItem('user_STAFF') || 
                         sessionStorage.getItem('user');
      const localUser = localStorage.getItem('user_ADMIN') || 
                       localStorage.getItem('user_STAFF') || 
                       localStorage.getItem('user');
      const savedUser = sessionUser || localUser;
      if (savedUser) {
        const user = JSON.parse(savedUser);
        return user?.email || '';
      }
    } catch (e) {
    }
    return '';
  }

  /**
   * Get all comments for an article
   * @param {number} articleId - Article ID
   * @returns {Promise<Array>} - Array of comment objects
   */
  async getCommentsByArticleId(articleId) {
    try {
      const response = await fetch(API_ENDPOINTS.ARTICLE_COMMENTS_BY_ARTICLE(articleId), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const wasHandled = await checkAndHandleApiError(response, false);
        if (wasHandled) {
          return [];
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a new comment for an article
   * @param {Object} commentData - Comment data
   * @param {number} commentData.articleId - Article ID
   * @param {string} commentData.content - Comment content
   * @param {string} [commentData.imgPath] - Optional image path
   * @returns {Promise<Object>} - Created comment object
   */
  async createComment(commentData) {
    try {
      const userEmail = this.getUserEmail();
      if (!userEmail) {
        throw new Error('User email not found. Please login first.');
      }

      const requestBody = {
        userEmail,
        articleId: commentData.articleId,
        content: commentData.content,
        imgPath: commentData.imgPath || null,
        parentCommentId: null, // Chỉ hỗ trợ comment cha, không có reply
      };

      const response = await fetch(API_ENDPOINTS.ARTICLE_COMMENTS, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const wasHandled = await checkAndHandleApiError(response, true);
        if (wasHandled) {
          return null;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update a comment
   * @param {number} commentId - Comment ID
   * @param {Object} commentData - Updated comment data
   * @param {string} commentData.content - Updated content
   * @param {string} [commentData.imgPath] - Optional updated image path
   * @returns {Promise<Object>} - Updated comment object
   */
  async updateComment(commentId, commentData) {
    try {
      const userEmail = this.getUserEmail();
      if (!userEmail) {
        throw new Error('User email not found. Please login first.');
      }

      const requestBody = {
        userEmail,
        articleId: commentData.articleId,
        content: commentData.content,
        imgPath: commentData.imgPath || null,
        parentCommentId: null,
      };

      const response = await fetch(API_ENDPOINTS.ARTICLE_COMMENT_BY_ID(commentId), {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const wasHandled = await checkAndHandleApiError(response, true);
        if (wasHandled) {
          return null;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete a comment
   * @param {number} commentId - Comment ID
   * @returns {Promise<void>}
   */
  async deleteComment(commentId) {
    try {
      const userEmail = this.getUserEmail();
      if (!userEmail) {
        throw new Error('User email not found. Please login first.');
      }

      const response = await fetch(`${API_ENDPOINTS.ARTICLE_COMMENT_BY_ID(commentId)}?userEmail=${encodeURIComponent(userEmail)}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const wasHandled = await checkAndHandleApiError(response, true);
        if (wasHandled) {
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      throw error;
    }
  }
}

export default new ArticleCommentService();

