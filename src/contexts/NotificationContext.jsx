import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import websocketService from '../services/websocketService';
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
  const pageRef = useRef({ page: 0, size: 20, sort: 'createdAt,desc', isRead: undefined });
  const subscribedUserKeyRef = useRef(null);
  const wsDebounceRef = useRef(null);
  const seenIdsRef = useRef(new Set());
  const bcRef = useRef(null);
  // Track local optimistic updates for isRead status (for markAsUnread)
  const optimisticReadStatusRef = useRef(new Map()); // Map<notificationId, isRead>

  const userEmail = user?.email || user?.userEmail || '';
  const username = user?.username || user?.userName || user?.name || '';

  // Helper functions to persist optimistic updates to localStorage
  const getOptimisticStorageKey = () => `notification-optimistic-${userEmail}`;
  
  const loadOptimisticUpdates = () => {
    if (!userEmail) return;
    try {
      const stored = localStorage.getItem(getOptimisticStorageKey());
      if (stored) {
        const parsed = JSON.parse(stored);
        optimisticReadStatusRef.current = new Map(Object.entries(parsed).map(([k, v]) => [Number(k), v]));
      }
    } catch (e) {
      // Ignore errors
    }
  };

  const saveOptimisticUpdates = () => {
    if (!userEmail) return;
    try {
      const mapObj = Object.fromEntries(optimisticReadStatusRef.current);
      localStorage.setItem(getOptimisticStorageKey(), JSON.stringify(mapObj));
    } catch (e) {
      // Ignore errors
    }
  };

  const mapPageToList = (pageObj) => {
    // Backend returns ApiResponse.result.notifications as a Page
    const pageContent = pageObj?.content || [];
    return pageContent.map((n) => ({
      id: n.notificationId,
      type: n.notificationType,
      title: n.title,
      message: n.message,
      targetId: n.targetId,
      targetType: n.targetType,
      isRead: n.isRead,
      createdAt: n.createdAt,
      actor: n.actor
    }));
  };

  const mapIncomingNotification = (n) => {
    if (!n) return null;
    return {
      id: n.notificationId || n.id,
      type: n.notificationType || n.type,
      title: n.title,
      message: n.message,
      targetId: n.targetId,
      targetType: n.targetType,
      isRead: Boolean(n.isRead === true ? true : false),
      createdAt: n.createdAt,
      actor: n.actor
    };
  };

  const fetchList = useCallback(async (opts = {}) => {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    if (!userEmail || !token) return;
    const params = { ...pageRef.current, ...opts };
    pageRef.current = params;
    try {
      setLoading(true);
      setError(null);
      const res = await NotificationAPI.getNotifications(params, userEmail);
      const result = res?.result || {};
      const list = mapPageToList(result.notifications || {});
      
      // Merge with existing notifications to preserve optimistic updates
      // Use a Set to track IDs from server response
      const serverIds = new Set(list.map(n => n.id));
      
      setNotifications((prev) => {
        // Keep optimistic updates (notifications not yet in server response)
        const optimisticUpdates = prev.filter(n => !serverIds.has(n.id));
        
        // Merge server list with optimistic read status updates
        const mergedList = list.map((serverNotif) => {
          // Check if we have an optimistic update for this notification's read status
          const optimisticReadStatus = optimisticReadStatusRef.current.get(serverNotif.id);
          if (optimisticReadStatus !== undefined) {
            // Use optimistic read status instead of server status
            return { ...serverNotif, isRead: optimisticReadStatus };
          }
          return serverNotif;
        });
        
        // Merge and sort by createdAt (newest first)
        const merged = [...mergedList, ...optimisticUpdates];
        const sorted = merged.sort((a, b) => {
          const timeA = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeB - timeA; // newest first
        });
        
        // Calculate unread count from merged list (includes optimistic updates)
        // This ensures optimistic markAsUnread updates are reflected
        const calculatedUnreadCount = sorted.filter(n => !n.isRead).length;
        
        // Update unread count to reflect optimistic updates
        setUnreadCount(calculatedUnreadCount);
        bcRef.current?.postMessage({ type: 'set', payload: { value: calculatedUnreadCount } });
        
        return sorted;
      });
    } catch (e) {
      setError(e.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [userEmail]);

  const markAsRead = async (id) => {
    try {
      await NotificationAPI.markAsRead(id, userEmail);
      
      // Remove optimistic update (server is now source of truth)
      optimisticReadStatusRef.current.delete(id);
      saveOptimisticUpdates(); // Persist to localStorage
      
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
      bcRef.current?.postMessage({ type: 'markRead' });
    } catch (e) {
      // no-op
    }
  };

  const markAsUnread = async (id) => {
    try {
      // TODO: Update backend endpoint when available
      // For now, only update local state
      // await NotificationAPI.markAsUnread(id, userEmail);
      
      // Track optimistic update
      optimisticReadStatusRef.current.set(id, false);
      saveOptimisticUpdates(); // Persist to localStorage
      
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: false } : n)));
      setUnreadCount((c) => c + 1);
      bcRef.current?.postMessage({ type: 'markUnread' });
    } catch (e) {
      // no-op
    }
  };

  const markAllAsRead = async () => {
    try {
      await NotificationAPI.markAllAsRead(userEmail);
      // Clear all optimistic updates since all are marked as read
      optimisticReadStatusRef.current.clear();
      saveOptimisticUpdates(); // Persist to localStorage
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      bcRef.current?.postMessage({ type: 'markAllRead' });
    } catch (e) {
      // no-op
    }
  };

  const deleteNotification = async (id) => {
    try {
      await NotificationAPI.deleteNotification(id, userEmail);
      // Clear optimistic update for deleted notification
      optimisticReadStatusRef.current.delete(id);
      saveOptimisticUpdates(); // Persist to localStorage
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (e) {
      // no-op
    }
  };

  // Shared handler for incoming notifications: de-dup, optimistic inc, sync tabs
  const pushIncoming = (payload) => {
    const item = mapIncomingNotification(payload);
    if (!item) return;
    // de-dup nếu BE bắn nhiều kênh
    if (item.id && seenIdsRef.current.has(item.id)) return;
    if (item.id) seenIdsRef.current.add(item.id);

    // Update unread count immediately if notification is unread
    if (!item.isRead) {
      setUnreadCount((c) => c + 1);
      bcRef.current?.postMessage({ type: 'inc', payload: { delta: 1 } });
    }
    
    // Add notification to list immediately if not already present
    // This ensures real-time display when dropdown is open
    setNotifications((prev) => {
      // Check if notification already exists
      if (prev.some((x) => x.id === item.id)) {
        return prev;
      }
      // Add new notification at the beginning (newest first)
      return [item, ...prev];
    });

    // Sync with server after a delay to update unread count from server
    // but preserve the optimistic notification in the list (handled by fetchList merge logic)
    if (wsDebounceRef.current) clearTimeout(wsDebounceRef.current);
    wsDebounceRef.current = setTimeout(() => {
      fetchList();
    }, 1500);
  };

  // Load optimistic updates from localStorage on mount/userEmail change
  useEffect(() => {
    if (userEmail) {
      loadOptimisticUpdates();
    }
  }, [userEmail]);

  // Initialize and subscribe to WS once user is logged in
  // Connect immediately when token is available, don't wait for user object
  useEffect(() => {
    let unsubscribes = [];
    let pollTimer = null;
    let removeConnHandler = null;
    let removeDisconnHandler = null;

    const token = sessionStorage.getItem('token') || localStorage.getItem('token') || localStorage.getItem('accessToken');
    // Enable realtime whenever we have an auth token; user notifications use '/user/queue/notifications'
    const canRealtime = !!token;

    // Get username from user object if available, otherwise try to get from storage
    let effectiveUsername = username;
    if (!effectiveUsername && token) {
      try {
        const savedUser = sessionStorage.getItem('user') || localStorage.getItem('user');
        if (savedUser) {
          const parsedUser = JSON.parse(savedUser);
          effectiveUsername = parsedUser.username || parsedUser.userName || parsedUser.name;
        }
      } catch (e) {
        // Ignore parse errors
      }
    }

    if (canRealtime && effectiveUsername) {
      // Ensure websocket connection is established for notifications use-case
      // Only connect if not already connected (ChatContext might have already connected)
      const isAlreadyConnected = websocketService.getConnectionStatus();
      
      if (!isAlreadyConnected) {
        try {
          // Connect immediately with username from storage if needed
          websocketService.connect(effectiveUsername).catch(() => {});
        } catch {}
      }

      const subscribeNow = () => {
        const subKey = effectiveUsername ? `user:${effectiveUsername}` : `auth:token`;
        if (subscribedUserKeyRef.current === subKey) return; // prevent duplicate subs
        
        // Subscribe to both global and user-specific notifications
        const s1 = websocketService.subscribeToGlobalNotifications(pushIncoming);
        const s2 = websocketService.subscribeToUserNotifications(effectiveUsername, pushIncoming);
        if (s1) unsubscribes.push(() => s1.unsubscribe());
        if (s2) unsubscribes.push(() => s2.unsubscribe());
        subscribedUserKeyRef.current = subKey;
        // When connected, disable polling
        if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
      };

      // Subscribe immediately if already connected, otherwise wait for connection
      if (isAlreadyConnected) {
        // WebSocket already connected (possibly by ChatContext), subscribe immediately
        subscribeNow();
      } else {
        // If not yet connected, subscribe when connection opens
        removeConnHandler = websocketService.onConnection(() => {
          subscribeNow();
        });
        // While disconnected, enable light polling to fetch notifications
        pollTimer = setInterval(() => { fetchList(); }, 30000);
      }

      // If connection drops later, allow re-subscription and re-enable polling
      removeDisconnHandler = websocketService.onDisconnection(() => {
        subscribedUserKeyRef.current = null;
        // Clear existing subscriptions (they're already invalid when disconnected)
        // Note: unsubscribes will be cleared in cleanup, but we reset the key to allow re-subscription
        // Re-enable polling when disconnected
        if (!pollTimer) pollTimer = setInterval(() => { fetchList(); }, 30000);
      });

    } else if (canRealtime && !effectiveUsername) {
      // If we have token but no username yet, wait a bit and retry
      const retryTimer = setTimeout(() => {
        // This will trigger a re-run of the effect when username becomes available
      }, 500);
      return () => clearTimeout(retryTimer);
    }

    // Initial fetch
    fetchList();

    return () => {
      unsubscribes.forEach((fn) => {
        try { fn(); } catch {}
      });
      if (pollTimer) clearInterval(pollTimer);
      if (removeConnHandler) {
        try { removeConnHandler(); } catch {}
      }
      if (removeDisconnHandler) {
        try { removeDisconnHandler(); } catch {}
      }
      if (wsDebounceRef.current) {
        clearTimeout(wsDebounceRef.current);
        wsDebounceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail, username, fetchList]);

  // Multi-tab sync via BroadcastChannel
  useEffect(() => {
    // sync multi-tab
    bcRef.current = new BroadcastChannel('kdbs-notifications');
    bcRef.current.onmessage = (e) => {
      const { type, payload } = e.data || {};
      if (type === 'inc') setUnreadCount((c) => c + (payload?.delta || 0));
      if (type === 'set') setUnreadCount(payload?.value ?? 0);
      if (type === 'markAllRead') setUnreadCount(0);
      if (type === 'markRead') setUnreadCount((c) => Math.max(0, c - 1));
      if (type === 'markUnread') setUnreadCount((c) => c + 1);
      if (type === 'refresh') fetchList();
    };
    return () => bcRef.current?.close();
  }, [fetchList]);

  const value = useMemo(() => ({
    notifications,
    unreadCount,
    loading,
    error,
    fetchList,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    deleteNotification
  }), [notifications, unreadCount, loading, error]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
