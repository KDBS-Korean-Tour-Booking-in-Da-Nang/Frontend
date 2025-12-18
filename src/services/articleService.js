import { checkAndHandleApiError } from '../utils/apiErrorHandler';
import { BaseURL } from '../config/api';

class ArticleService {
  /**
   * Get authentication headers with Bearer token
   * Checks role-specific keys (token_ADMIN, token_STAFF) first, then legacy keys
   * @returns {Object} - Headers object with Authorization
   */
  // Lấy headers xác thực với Bearer token
  // Ưu tiên token theo role (ADMIN, STAFF), sau đó mới đến token chung
  // Kiểm tra sessionStorage trước, sau đó localStorage
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
  async crawlArticles() {
    try {
      const response = await fetch(`${BaseURL}/api/article/crawl`, {
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

  async getAllArticles(autoRedirect = false) {
    try {
      const response = await fetch(`${BaseURL}/api/article`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const wasHandled = await checkAndHandleApiError(response, autoRedirect);
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

  // Lấy thông tin article theo ID
  // Tự động lấy userEmail từ storage để gửi kèm request (để backend tracking)
  async getArticleById(articleId) {
    try {
      let userEmail = '';
      try {
        // Lấy user từ storage, ưu tiên theo role (ADMIN, STAFF), sau đó user chung
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
      }

      const headers = {
        'Content-Type': 'application/json',
      };
      
      // Thêm User-Email vào headers nếu có để backend tracking
      if (userEmail) {
        headers['User-Email'] = userEmail;
      }

      const response = await fetch(`${BaseURL}/api/article/${articleId}`, {
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

  // Cập nhật trạng thái article (status được truyền qua query parameter, không phải JSON body)
  async updateArticleStatus(articleId, status) {
    try {
      const response = await fetch(`${BaseURL}/api/article/${articleId}/status?status=${status}`, {
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
      const response = await fetch(`${BaseURL}/api/article/status/${status}`, {
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
