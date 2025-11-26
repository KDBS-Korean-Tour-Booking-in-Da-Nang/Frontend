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
  return res.json();
};

export const NotificationAPI = {
  async getNotifications({ isRead, page = 0, size = 20, sort = 'createdAt,desc' } = {}, userEmail) {
    const params = new URLSearchParams();
    if (typeof isRead === 'boolean') params.set('isRead', String(isRead));
    params.set('page', String(page));
    params.set('size', String(size));
    params.set('sort', sort);
    const url = `${API_BASE_URL}/api/notifications?${params.toString()}`;
    const res = await fetch(url, { headers: withUserEmail(getAuthHeaders(), userEmail) });
    return parseJson(res);
  },

  async markAsRead(notificationId, userEmail) {
    const url = `${API_BASE_URL}/api/notifications/${notificationId}/read`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: withUserEmail(getAuthHeaders(), userEmail)
    });
    return parseJson(res);
  },

  async markAllAsRead(userEmail) {
    const url = `${API_BASE_URL}/api/notifications/read-all`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: withUserEmail(getAuthHeaders(), userEmail)
    });
    return parseJson(res);
  },

  async deleteNotification(notificationId, userEmail) {
    const url = `${API_BASE_URL}/api/notifications/${notificationId}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: withUserEmail(getAuthHeaders(), userEmail)
    });
    return parseJson(res);
  }
};

export default NotificationAPI;
