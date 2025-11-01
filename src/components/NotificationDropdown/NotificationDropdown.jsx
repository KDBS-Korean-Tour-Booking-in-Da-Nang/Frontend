import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BellIcon,
  CheckIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import styles from './NotificationDropdown.module.css';

const NotificationDropdown = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'booking',
      title: t('notifications.newBooking.title'),
      message: t('notifications.newBooking.message'),
      time: '2 phút trước',
      read: false,
      icon: CheckCircleIcon
    },
    {
      id: 2,
      type: 'payment',
      title: t('notifications.paymentReceived.title'),
      message: t('notifications.paymentReceived.message'),
      time: '1 giờ trước',
      read: false,
      icon: CheckCircleIcon
    },
    {
      id: 3,
      type: 'warning',
      title: t('notifications.tourUpdate.title'),
      message: t('notifications.tourUpdate.message'),
      time: '3 giờ trước',
      read: true,
      icon: ExclamationTriangleIcon
    },
    {
      id: 4,
      type: 'info',
      title: t('notifications.systemUpdate.title'),
      message: t('notifications.systemUpdate.message'),
      time: '1 ngày trước',
      read: true,
      icon: InformationCircleIcon
    }
  ]);

  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        // Check if click is on notification button
        const notificationButton = event.target.closest('[data-notification-button]');
        
        if (!notificationButton) {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const markAsRead = (id) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const deleteNotification = (id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const getNotificationIcon = (type) => {
    switch (type) {
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
    switch (type) {
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

  const unreadCount = notifications.filter(n => !n.read).length;

  if (!isOpen) return null;

  return (
    <div className={`${styles.notificationDropdown} ${isOpen ? styles.show : styles.hide}`} ref={dropdownRef}>
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
              onClick={markAllAsRead}
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
        {notifications.length === 0 ? (
          <div className={styles.emptyState}>
            <BellIcon className={styles.emptyIcon} />
            <p className={styles.emptyText}>{t('notifications.empty')}</p>
          </div>
        ) : (
          notifications.map((notification) => {
            const Icon = notification.icon;
            const color = getNotificationColor(notification.type);
            
            return (
              <div 
                key={notification.id}
                className={`${styles.notificationItem} ${!notification.read ? styles.unread : ''}`}
                onClick={() => markAsRead(notification.id)}
              >
                <div className={`${styles.notificationIcon} ${styles[color]}`}>
                  <Icon className="w-5 h-5" />
                </div>
                
                <div className={styles.notificationContent}>
                  <div className={styles.notificationHeader}>
                    <h4 className={styles.notificationTitle}>{notification.title}</h4>
                    <span className={styles.notificationTime}>{notification.time}</span>
                  </div>
                  <p className={styles.notificationMessage}>{notification.message}</p>
                </div>

                <div className={styles.notificationActions}>
                  <button 
                    className={styles.deleteBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification.id);
                    }}
                    title={t('notifications.delete')}
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className={styles.footer}>
          <button className={styles.viewAllBtn}>
            {t('notifications.viewAll')}
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
