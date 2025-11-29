import { checkAndHandleApiError } from '../utils/apiErrorHandler';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

class ArticleService {
  /**
   * Get authentication headers with Bearer token
   * @returns {Object} - Headers object with Authorization
   */
  getAuthHeaders() {
    const token =
      localStorage.getItem('token') ||
      sessionStorage.getItem('token') ||
      localStorage.getItem('accessToken') ||
      sessionStorage.getItem('accessToken');
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
      const response = await fetch(`${API_BASE_URL}/api/article/${articleId}`, {
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
