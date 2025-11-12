import { createContext, useContext, useMemo } from 'react';

const NotificationContext = createContext(null);

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};

export const NotificationProvider = ({ children }) => {
  // Empty context - notification feature is under research/development
  // All functions are no-op to prevent errors
  const value = useMemo(() => ({
    notifications: [],
    unreadCount: 0,
    loading: false,
    error: null,
    fetchList: () => {},
    markAsRead: () => {},
    markAsUnread: () => {},
    markAllAsRead: () => {},
    deleteNotification: () => {}
  }), []);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
