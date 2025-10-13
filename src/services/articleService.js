const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

class ArticleService {
  async crawlArticles() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/article/crawl`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error crawling articles:', error);
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
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching articles:', error);
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
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching article by ID:', error);
      throw error;
    }
  }

  async updateArticleStatus(articleId, status) {
    try {
      // Backend expects status as query parameter, not JSON body
      const response = await fetch(`${API_BASE_URL}/api/article/${articleId}/status?status=${status}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating article status:', error);
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
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching articles by status:', error);
      throw error;
    }
  }
}

export default new ArticleService();
