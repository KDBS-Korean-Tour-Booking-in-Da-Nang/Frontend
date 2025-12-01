import { checkAndHandleApiError } from '../utils/apiErrorHandler';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

class ArticleService {
  /**
   * Get authentication headers with Bearer token
   * Checks role-specific keys (token_ADMIN, token_STAFF) first, then legacy keys
   * @returns {Object} - Headers object with Authorization
   */
  getAuthHeaders() {
    // Check for role-specific storage first (ADMIN, STAFF), then fallback to legacy keys
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
  async crawlArticles() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/article/crawl`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // Handle 401, 403, 404, 500 with global error handler (auto redirect)
        const wasHandled = await checkAndHandleApiError(response, true);
        if (wasHandled) {
          return; // Đã redirect, không cần xử lý tiếp
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  async getAllArticles() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/article`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // Handle 401, 403, 404, 500 with global error handler (auto redirect)
        const wasHandled = await checkAndHandleApiError(response, true);
        if (wasHandled) {
          return; // Đã redirect, không cần xử lý tiếp
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  async getArticleById(articleId) {
    try {
      // Get user email from storage (check role-specific keys first)
      let userEmail = '';
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
          userEmail = user?.email || '';
        }
      } catch (e) {
        // Ignore parse errors
      }

      const headers = {
        'Content-Type': 'application/json',
      };
      
      if (userEmail) {
        headers['User-Email'] = userEmail;
      }

      const response = await fetch(`${API_BASE_URL}/api/article/${articleId}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        // Handle 401, 403, 404, 500 with global error handler (auto redirect)
        const wasHandled = await checkAndHandleApiError(response, true);
        if (wasHandled) {
          return; // Đã redirect, không cần xử lý tiếp
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  async updateArticleStatus(articleId, status) {
    try {
      // Backend expects status as query parameter, not JSON body
      const response = await fetch(`${API_BASE_URL}/api/article/${articleId}/status?status=${status}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        // Handle 401, 403, 404, 500 with global error handler (auto redirect)
        const wasHandled = await checkAndHandleApiError(response, true);
        if (wasHandled) {
          return; // Đã redirect, không cần xử lý tiếp
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  async getArticlesByStatus(status) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/article/status/${status}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // Handle 401, 403, 404, 500 with global error handler (auto redirect)
        const wasHandled = await checkAndHandleApiError(response, true);
        if (wasHandled) {
          return; // Đã redirect, không cần xử lý tiếp
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }
}

export default new ArticleService();
