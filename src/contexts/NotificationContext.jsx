import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import NotificationAPI from '../services/notificationService';

const NotificationContext = createContext(null);

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const userEmail = user?.email;

  // Fetch notifications từ API: được gọi khi dropdown mở, backend trả về Page object với content array, set notifications và unreadCount vào state
  const fetchList = useCallback(async () => {
    if (!userEmail) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await NotificationAPI.getNotifications(
        { page: 0, size: 100, sort: 'createdAt,desc' },
        userEmail
      );

      if (response && response.notifications) {
        const notificationList = response.notifications.content || [];
        setNotifications(notificationList);
        setUnreadCount(response.unreadCount || 0);
      } else {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch notifications');
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [userEmail]);

  // Fetch unread count only cho badge display: gọi API getUnreadCount, set vào state, ignore errors
  const fetchUnreadCount = useCallback(async () => {
    if (!userEmail) {
      setUnreadCount(0);
      return;
    }

    try {
      const count = await NotificationAPI.getUnreadCount(userEmail);
      setUnreadCount(count || 0);
    } catch (err) {
      // Silently handle error
    }
  }, [userEmail]);

  // Đánh dấu notification là đã đọc: gọi API markAsRead, update local state optimistically (set isRead = true), giảm unreadCount, nếu fail thì re-fetch để sync với server
  const markAsRead = useCallback(async (notificationId) => {
    if (!userEmail) return;

    try {
      await NotificationAPI.markAsRead(notificationId, userEmail);
      
      setNotifications(prev => 
        prev.map(n => 
          n.notificationId === notificationId 
            ? { ...n, isRead: true }
            : n
        )
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      setError(err.message || 'Failed to mark notification as read');
      await fetchList();
    }
  }, [userEmail, fetchList]);

  // Đánh dấu notification là chưa đọc (chỉ client-side, backend không support): update local state (set isRead = false), tăng unreadCount
  const markAsUnread = useCallback((notificationId) => {
    setNotifications(prev => 
      prev.map(n => 
        n.notificationId === notificationId 
          ? { ...n, isRead: false }
          : n
      )
    );
    setUnreadCount(prev => prev + 1);
  }, []);

  // Đánh dấu tất cả notifications là đã đọc: vì backend không có endpoint này nên mark từng unread notification bằng Promise.all, update local state (set tất cả isRead = true), set unreadCount = 0, nếu fail thì re-fetch để sync
  const markAllAsRead = useCallback(async () => {
    if (!userEmail) return;

    const unreadNotifications = notifications.filter(n => !n.isRead);
    if (unreadNotifications.length === 0) return;

    try {
      await Promise.all(
        unreadNotifications.map(n => 
          NotificationAPI.markAsRead(n.notificationId, userEmail)
        )
      );

      setNotifications(prev => 
        prev.map(n => ({ ...n, isRead: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      setError(err.message || 'Failed to mark all as read');
      await fetchList();
    }
  }, [userEmail, notifications, fetchList]);

  // Xóa notification (chỉ client-side, backend không support): remove khỏi local state, update unreadCount nếu deleted notification là unread
  const deleteNotification = useCallback((notificationId) => {
    const notification = notifications.find(n => n.notificationId === notificationId);
    setNotifications(prev => prev.filter(n => n.notificationId !== notificationId));
    
    // Update unread count if deleted notification was unread
    if (notification && !notification.isRead) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  }, [notifications]);

  const value = useMemo(() => ({
    notifications,
    unreadCount,
    loading,
    error,
    fetchList,
    fetchUnreadCount,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    deleteNotification
  }), [notifications, unreadCount, loading, error, fetchList, fetchUnreadCount, markAsRead, markAsUnread, markAllAsRead, deleteNotification]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
