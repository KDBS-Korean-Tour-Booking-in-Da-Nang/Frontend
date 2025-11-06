import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BellIcon,
  CheckIcon,
  EllipsisVerticalIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import styles from './NotificationDropdown.module.css';
import { useNotifications } from '../../contexts/NotificationContext';

const NotificationDropdown = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { notifications, unreadCount, markAsRead, markAsUnread, markAllAsRead, deleteNotification, fetchList } = useNotifications();
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
      // Refresh when opened to ensure latest
      if (fetchListRef.current) fetchListRef.current();
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Ensure newest notifications are shown on top
  const sortedNotifications = useMemo(() => {
    const list = Array.isArray(notifications) ? notifications : [];
    return [...list].sort((a, b) => {
      const ta = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });
  }, [notifications]);

  // Only show top 4 by default; show all when expanded
  const visibleNotifications = isExpanded ? sortedNotifications : sortedNotifications.slice(0, 4);

  const getNotificationIcon = (type) => {
    switch (String(type || '').toLowerCase()) {
      case 'booking':
        return CheckCircleIcon;
      case 'payment':
        return CheckCircleIcon;
      case 'warning':
        return ExclamationTriangleIcon;
      case 'info':
        return InformationCircleIcon;
      default:
        return BellIcon;
    }
  };

  const getNotificationColor = (type) => {
    switch (String(type || '').toLowerCase()) {
      case 'booking':
        return 'green';
      case 'payment':
        return 'blue';
      case 'warning':
        return 'yellow';
      case 'info':
        return 'gray';
      default:
        return 'gray';
    }
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
              <CheckIcon className="w-4 h-4" />
            </button>
          )}
          <button 
            className={styles.closeBtn}
            onClick={onClose}
            title={t('notifications.close')}
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className={styles.notificationsList}>
        {visibleNotifications.length === 0 ? (
          <div className={styles.emptyState}>
            <BellIcon className={styles.emptyIcon} />
            <p className={styles.emptyText}>{t('notifications.empty')}</p>
          </div>
        ) : (
          visibleNotifications.map((n) => {
            const Icon = getNotificationIcon(n.type);
            const color = getNotificationColor(n.type);
            const created = n.createdAt ? new Date(n.createdAt) : null;
            const timeText = created ? created.toLocaleString() : '';

            return (
              <div 
                key={n.id}
                className={`${styles.notificationItem} ${!n.isRead ? styles.unread : ''}`}
              >
                <div className={`${styles.notificationIcon} ${styles[color]}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className={styles.notificationContent}>
                  <div className={styles.notificationHeader}>
                    <h4 className={styles.notificationTitle}>{n.title}</h4>
                    <span className={styles.notificationTime}>{timeText}</span>
                  </div>
                  <p className={styles.notificationMessage}>{n.message}</p>
                </div>

                <div className={styles.notificationActions}>
                  <button 
                    className={styles.moreBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpenId((prev) => (prev === n.id ? null : n.id));
                    }}
                    title={t('notifications.more')}
                  >
                    <EllipsisVerticalIcon className="w-4 h-4" />
                  </button>
                  {menuOpenId === n.id && (
                    <div className={styles.actionMenu} onClick={(e) => e.stopPropagation()}>
                      <button
                        className={styles.actionMenuItem}
                        onClick={() => {
                          if (n.isRead) {
                            markAsUnread(n.id);
                          } else {
                            markAsRead(n.id);
                          }
                          setMenuOpenId(null);
                        }}
                      >
                        {n.isRead ? t('notifications.markUnread', 'Đánh dấu chưa đọc') : t('notifications.markRead', 'Đánh dấu đã đọc')}
                      </button>
                      <button
                        className={styles.actionMenuItem}
                        onClick={() => {
                          deleteNotification(n.id);
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
