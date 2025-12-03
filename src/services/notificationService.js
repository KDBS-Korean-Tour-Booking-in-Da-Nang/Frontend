import { checkAndHandleApiError } from '../utils/apiErrorHandler';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const getAuthHeaders = () => {
  const token =
    sessionStorage.getItem('token') ||
    localStorage.getItem('token') ||
    localStorage.getItem('accessToken');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

const withUserEmail = (headers, userEmail) => ({
  ...headers,
  'User-Email': userEmail || ''
});

const parseJson = async (res) => {
  if (!res.ok) {
    // Handle 401, 403, 404, 500 with global error handler (auto redirect)
    const wasHandled = await checkAndHandleApiError(res, true);
    if (wasHandled) {
      // Đã redirect, throw error để dừng xử lý tiếp
      throw new Error('Session expired. Please login again.');
    }
    const text = await res.text().catch(() => '');
    const err = new Error(`HTTP ${res.status} ${res.statusText}`);
    err.body = text;
    throw err;
  }
  // Handle 204 No Content response
  if (res.status === 204) {
    return null;
  }
  return res.json();
};

export const NotificationAPI = {
  /**
   * Get notifications with pagination
   * @param {Object} params - { page, size, sort }
   * @param {string} userEmail - User email for authentication
   * @returns {Promise<{notifications: {content: Array, totalElements: number, ...}, unreadCount: number}>}
   */
  async getNotifications({ page = 0, size = 10, sort = 'createdAt,desc' } = {}, userEmail) {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('size', String(size));
    params.set('sort', sort);
    const url = `${API_BASE_URL}/api/notifications?${params.toString()}`;
    const res = await fetch(url, { headers: withUserEmail(getAuthHeaders(), userEmail) });
    return parseJson(res);
  },

  /**
   * Mark a notification as read
   * @param {number} notificationId - Notification ID
   * @param {string} userEmail - User email for authentication
   * @returns {Promise<void>}
   */
  async markAsRead(notificationId, userEmail) {
    const url = `${API_BASE_URL}/api/notifications/${notificationId}/read`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: withUserEmail(getAuthHeaders(), userEmail)
    });
    return parseJson(res);
  },

  /**
   * Get unread notification count
   * @param {string} userEmail - User email for authentication
   * @returns {Promise<number>}
   */
  async getUnreadCount(userEmail) {
    const url = `${API_BASE_URL}/api/notifications/unread-count`;
    const res = await fetch(url, { headers: withUserEmail(getAuthHeaders(), userEmail) });
    return parseJson(res);
  }
};

export default NotificationAPI;
