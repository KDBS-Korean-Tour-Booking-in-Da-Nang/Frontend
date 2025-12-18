import { checkAndHandleApiError } from '../utils/apiErrorHandler';
import { BaseURL } from '../config/api';

// Lấy headers xác thực với Bearer token từ storage
// Ưu tiên sessionStorage, sau đó localStorage
const getAuthHeaders = () => {
  const token =
    sessionStorage.getItem('token') ||
    localStorage.getItem('token') ||
    localStorage.getItem('accessToken');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

// Thêm User-Email vào headers để xác định người dùng
const withUserEmail = (headers, userEmail) => ({
  ...headers,
  'User-Email': userEmail || ''
});

// Parse response JSON, xử lý lỗi và trường hợp 204 No Content
const parseJson = async (res) => {
  if (!res.ok) {
    // Xử lý lỗi 401, 403, 404, 500 bằng global error handler (tự động redirect)
    const wasHandled = await checkAndHandleApiError(res, true);
    if (wasHandled) {
      throw new Error('Session expired. Please login again.');
    }
    const text = await res.text().catch(() => '');
    const err = new Error(`HTTP ${res.status} ${res.statusText}`);
    err.body = text;
    throw err;
  }
  // Xử lý response 204 No Content (không có body)
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
    const url = `${BaseURL}/api/notifications?${params.toString()}`;
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
    const url = `${BaseURL}/api/notifications/${notificationId}/read`;
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
    const url = `${BaseURL}/api/notifications/unread-count`;
    const res = await fetch(url, { headers: withUserEmail(getAuthHeaders(), userEmail) });
    return parseJson(res);
  }
};

export default NotificationAPI;
