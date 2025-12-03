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

  /**
   * Fetch notifications from API
   * Called when dropdown is opened
   */
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
        // Backend returns Page object with content array
        const notificationList = response.notifications.content || [];
        setNotifications(notificationList);
        setUnreadCount(response.unreadCount || 0);
      } else {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (err) {
      // Silently handle error fetching notifications
      setError(err.message || 'Failed to fetch notifications');
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [userEmail]);

  /**
   * Fetch unread count only (for badge display)
   */
  const fetchUnreadCount = useCallback(async () => {
    if (!userEmail) {
      setUnreadCount(0);
      return;
    }

    try {
      const count = await NotificationAPI.getUnreadCount(userEmail);
      setUnreadCount(count || 0);
    } catch (err) {
      // Silently handle error fetching unread count
    }
  }, [userEmail]);

  /**
   * Mark a notification as read
   */
  const markAsRead = useCallback(async (notificationId) => {
    if (!userEmail) return;

    try {
      await NotificationAPI.markAsRead(notificationId, userEmail);
      
      // Update local state optimistically
      setNotifications(prev => 
        prev.map(n => 
          n.notificationId === notificationId 
            ? { ...n, isRead: true }
            : n
        )
      );
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      // Silently handle error marking notification as read
      setError(err.message || 'Failed to mark notification as read');
      // Re-fetch to sync with server
      await fetchList();
    }
  }, [userEmail, fetchList]);

  /**
   * Mark a notification as unread (client-side only, backend doesn't support this)
   */
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

  /**
   * Mark all notifications as read
   * Since backend doesn't have this endpoint, we'll mark each unread one
   */
  const markAllAsRead = useCallback(async () => {
    if (!userEmail) return;

    const unreadNotifications = notifications.filter(n => !n.isRead);
    if (unreadNotifications.length === 0) return;

    try {
      // Mark all unread notifications as read
      await Promise.all(
        unreadNotifications.map(n => 
          NotificationAPI.markAsRead(n.notificationId, userEmail)
        )
      );

      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, isRead: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      // Silently handle error marking all as read
      setError(err.message || 'Failed to mark all as read');
      // Re-fetch to sync with server
      await fetchList();
    }
  }, [userEmail, notifications, fetchList]);

  /**
   * Delete notification (client-side only, backend doesn't support this)
   * Just remove from local state
   */
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
