import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  Check,
  MoreVertical,
  AlertTriangle,
  Info,
  CheckCircle2,
  X
} from 'lucide-react';
import styles from './NotificationDropdown.module.css';
import { useNotifications } from '../../contexts/NotificationContext';
import { getAvatarUrl } from '../../config/api';

const NotificationDropdown = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { 
    notifications, 
    unreadCount, 
    loading,
    error,
    markAsRead, 
    markAsUnread, 
    markAllAsRead, 
    deleteNotification, 
    fetchList 
  } = useNotifications();
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const dropdownRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const fetchListRef = useRef(fetchList);

  // Keep refs updated with latest callbacks without changing the effect deps
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => { fetchListRef.current = fetchList; }, [fetchList]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        const notificationButton = event.target.closest('[data-notification-button]');
        if (!notificationButton) {
          if (onCloseRef.current) onCloseRef.current();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Load notifications when dropdown is opened
      if (fetchListRef.current) fetchListRef.current();
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Parse date from backend (LocalDateTime format: "2024-01-01T12:00:00")
  const parseDate = (dateString) => {
    if (!dateString) return null;
    // Handle both ISO string and LocalDateTime format
    return new Date(dateString);
  };

  // Format date for display
  const formatDate = (date) => {
    if (!date) return '';
    try {
      const d = date instanceof Date ? date : parseDate(date);
      if (!d || isNaN(d.getTime())) return '';
      
      const now = new Date();
      const diffMs = now - d;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return t('notifications.justNow', 'Vừa xong');
      if (diffMins < 60) {
        const minutes = t('notifications.minutesAgo', { count: diffMins });
        return minutes !== 'notifications.minutesAgo' ? minutes : `${diffMins} phút trước`;
      }
      if (diffHours < 24) {
        const hours = t('notifications.hoursAgo', { count: diffHours });
        return hours !== 'notifications.hoursAgo' ? hours : `${diffHours} giờ trước`;
      }
      if (diffDays < 7) {
        const days = t('notifications.daysAgo', { count: diffDays });
        return days !== 'notifications.daysAgo' ? days : `${diffDays} ngày trước`;
      }
      
      return d.toLocaleDateString('vi-VN', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return '';
    }
  };

  // Ensure newest notifications are shown on top (already sorted by backend, but ensure)
  const sortedNotifications = useMemo(() => {
    const list = Array.isArray(notifications) ? notifications : [];
    return [...list].sort((a, b) => {
      const ta = a?.createdAt ? parseDate(a.createdAt)?.getTime() : 0;
      const tb = b?.createdAt ? parseDate(b.createdAt)?.getTime() : 0;
      return (tb || 0) - (ta || 0);
    });
  }, [notifications]);

  // Only show top 4 by default; show all when expanded
  const visibleNotifications = isExpanded ? sortedNotifications : sortedNotifications.slice(0, 4);

  // Map backend NotificationType enum to icon
  const getNotificationIcon = (notificationType) => {
    if (!notificationType) return Bell;
    
    const type = String(notificationType).toUpperCase();
    
    // Forum notifications
    if (type.includes('LIKE')) return CheckCircle2;
    if (type.includes('COMMENT') || type.includes('REPLY')) return Info;
    
    // Tour & Booking notifications
    if (type.includes('BOOKING')) {
      if (type.includes('CONFIRMED')) return CheckCircle2;
      if (type.includes('REJECTED') || type.includes('UPDATE_REQUEST')) return AlertTriangle;
      return Info;
    }
    if (type.includes('TOUR_APPROVED')) return CheckCircle2;
    if (type.includes('RATING')) return Info;
    
    return Bell;
  };

  // Map backend NotificationType enum to color
  const getNotificationColor = (notificationType) => {
    if (!notificationType) return 'gray';
    
    const type = String(notificationType).toUpperCase();
    
    // Forum notifications
    if (type.includes('LIKE')) return 'blue';
    if (type.includes('COMMENT') || type.includes('REPLY')) return 'gray';
    
    // Tour & Booking notifications
    if (type.includes('BOOKING')) {
      if (type.includes('CONFIRMED')) return 'green';
      if (type.includes('REJECTED') || type.includes('UPDATE_REQUEST')) return 'yellow';
        return 'blue';
    }
    if (type.includes('TOUR_APPROVED')) return 'green';
    if (type.includes('RATING')) return 'blue';
    
        return 'gray';
  };

  if (!isOpen) return null;

  return (
    <div className={`${styles.notificationDropdown} ${isOpen ? styles.show : styles.hide} ${isExpanded ? styles.expanded : ''}`} ref={dropdownRef}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <h3 className={styles.title}>{t('notifications.title')}</h3>
          {unreadCount > 0 && (
            <span className={styles.unreadBadge}>{unreadCount}</span>
          )}
        </div>
        <div className={styles.headerActions}>
          {unreadCount > 0 && (
            <button 
              className={styles.markAllReadBtn}
              onClick={() => {
                markAllAsRead();
                setMenuOpenId(null);
              }}
              title={t('notifications.markAllRead')}
            >
              <Check size={16} strokeWidth={2} />
            </button>
          )}
          <button 
            className={styles.closeBtn}
            onClick={onClose}
            title={t('notifications.close')}
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className={styles.notificationsList}>
        {loading ? (
          <div className={styles.emptyState}>
            <Bell size={32} strokeWidth={1.5} className={styles.emptyIcon} />
            <p className={styles.emptyText}>{t('notifications.loading', 'Đang tải...')}</p>
          </div>
        ) : error ? (
          <div className={styles.emptyState}>
            <AlertTriangle size={32} strokeWidth={1.5} className={styles.emptyIcon} />
            <p className={styles.emptyText}>{t('notifications.error', 'Có lỗi xảy ra')}</p>
            <button 
              className={styles.retryBtn}
              onClick={() => fetchList()}
            >
              {t('notifications.retry', 'Thử lại')}
            </button>
          </div>
        ) : visibleNotifications.length === 0 ? (
          <div className={styles.emptyState}>
            <Bell size={32} strokeWidth={1.5} className={styles.emptyIcon} />
            <p className={styles.emptyText}>{t('notifications.empty', 'Không có thông báo')}</p>
          </div>
        ) : (
          visibleNotifications.map((n) => {
            const Icon = getNotificationIcon(n.notificationType);
            const color = getNotificationColor(n.notificationType);
            const timeText = formatDate(n.createdAt);

            return (
              <div 
                key={n.notificationId}
                className={`${styles.notificationItem} ${!n.isRead ? styles.unread : ''}`}
              >
                {/* Icon */}
                <div className={`${styles.notificationIcon} ${styles[color]}`}>
                  <Icon size={20} strokeWidth={1.5} />
                </div>

                {/* Content */}
                <div className={styles.notificationContent}>
                  <div className={styles.notificationHeader}>
                    <h4 className={styles.notificationTitle}>
                      {n.title || t('notifications.noTitle', 'Không có tiêu đề')}
                    </h4>
                    <span className={styles.notificationTime}>{timeText}</span>
                  </div>
                  
                  {n.message && (
                    <p className={styles.notificationMessage}>{n.message}</p>
                  )}
                  
                  {n.actor && (n.actor.avatar || n.actor.username) && (
                    <div className={styles.actorInfo}>
                      {n.actor.avatar && (
                        <img 
                          src={getAvatarUrl(n.actor.avatar)} 
                          alt={n.actor.username || ''} 
                          className={styles.actorAvatar}
                          onError={(e) => {
                            e.target.src = getAvatarUrl(null);
                          }}
                        />
                      )}
                      {n.actor.username && (
                        <span className={styles.actorName}>{n.actor.username}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className={styles.notificationActions}>
                  {!n.isRead && (
                    <div className={styles.unreadDot} />
                  )}
                  <button 
                    className={styles.moreBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpenId((prev) => (prev === n.notificationId ? null : n.notificationId));
                    }}
                    title={t('notifications.more', 'Thêm')}
                  >
                    <MoreVertical size={16} strokeWidth={2} />
                  </button>
                  {menuOpenId === n.notificationId && (
                    <div className={styles.actionMenu} onClick={(e) => e.stopPropagation()}>
                      <button
                        className={styles.actionMenuItem}
                        onClick={() => {
                          if (n.isRead) {
                            markAsUnread(n.notificationId);
                          } else {
                            markAsRead(n.notificationId);
                          }
                          setMenuOpenId(null);
                        }}
                      >
                        {n.isRead 
                          ? t('notifications.markUnread', 'Đánh dấu chưa đọc') 
                          : t('notifications.markRead', 'Đánh dấu đã đọc')
                        }
                      </button>
                      <button
                        className={styles.actionMenuItem}
                        onClick={() => {
                          deleteNotification(n.notificationId);
                          setMenuOpenId(null);
                        }}
                      >
                        {t('notifications.delete', 'Xoá')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {sortedNotifications.length > 4 && (
        <div className={styles.footer}>
          <button
            className={styles.viewAllBtn}
            onClick={() => setIsExpanded((v) => !v)}
          >
            {isExpanded ? t('notifications.collapse', 'Thu gọn') : t('notifications.viewAll', 'Xem tất cả thông báo')}
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
