import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
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
import { useAuth } from '../../contexts/AuthContext';
import { getAvatarUrl } from '../../config/api';

const NotificationDropdown = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
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
    } catch {
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
      // Success statuses - green checkmark
      if (type.includes('SUCCESS') || type.includes('CONFIRMED')) return CheckCircle2;
      // Rejected or update request - warning
      if (type.includes('REJECTED') || type.includes('UPDATE_REQUEST')) return AlertTriangle;
      // Cancelled - X icon
      if (type.includes('CANCELLED')) return X;
      // Default booking notification
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
      // Success statuses - green
      if (type.includes('SUCCESS') || type.includes('CONFIRMED')) return 'green';
      // Rejected or update request - yellow/warning
      if (type.includes('REJECTED') || type.includes('UPDATE_REQUEST')) return 'yellow';
      // Cancelled - red/gray
      if (type.includes('CANCELLED')) return 'gray';
      // Default booking notification - blue
      return 'blue';
    }
    if (type.includes('TOUR_APPROVED')) return 'green';
    if (type.includes('RATING')) return 'blue';
    
    return 'gray';
  };

  // Map NotificationType to localized title/message
  // Order matches backend enum: Forum notifications first, then Tour & Booking notifications
  const getLocalizedTitle = (notification) => {
    const type = String(notification?.notificationType || '').toUpperCase();
    switch (type) {
      // Forum notifications
      case 'LIKE_POST':
        return t('notifications.types.LIKE_POST.title');
      case 'LIKE_COMMENT':
        return t('notifications.types.LIKE_COMMENT.title');
      case 'COMMENT_POST':
        return t('notifications.types.COMMENT_POST.title');
      case 'REPLY_COMMENT':
        return t('notifications.types.REPLY_COMMENT.title');
      
      // Tour & Booking notifications
      case 'NEW_BOOKING':
        return t('notifications.types.NEW_BOOKING.title');
      case 'BOOKING_CONFIRMED':
        return t('notifications.types.BOOKING_CONFIRMED.title');
      case 'BOOKING_UPDATE_REQUEST':
        return t('notifications.types.BOOKING_UPDATE_REQUEST.title');
      case 'TOUR_APPROVED':
        return t('notifications.types.TOUR_APPROVED.title');
      case 'NEW_RATING':
        return t('notifications.types.NEW_RATING.title');
      case 'BOOKING_REJECTED':
        return t('notifications.types.BOOKING_REJECTED.title');
      case 'BOOKING_UPDATED_BY_USER':
        return t('notifications.types.BOOKING_UPDATED_BY_USER.title');
      
      // Booking success statuses (new)
      case 'BOOKING_SUCCESS':
        return t('notifications.types.BOOKING_SUCCESS.title', 'Booking thành công');
      case 'BOOKING_BALANCE_SUCCESS':
        return t('notifications.types.BOOKING_BALANCE_SUCCESS.title', 'Thanh toán thành công');
      case 'PENDING_BALANCE_PAYMENT':
        return t('notifications.types.PENDING_BALANCE_PAYMENT.title', 'Chờ thanh toán số dư');
      case 'BOOKING_SUCCESS_PENDING':
        return t('notifications.types.BOOKING_SUCCESS_PENDING.title', 'Booking đang chờ xác nhận');
      case 'BOOKING_SUCCESS_WAIT_FOR_CONFIRMED':
        return t('notifications.types.BOOKING_SUCCESS_WAIT_FOR_CONFIRMED.title', 'Chờ xác nhận hoàn thành');
      case 'BOOKING_CANCELLED':
        return t('notifications.types.BOOKING_CANCELLED.title', 'Booking đã bị hủy');
      
      default:
        return null;
    }
  };

  const getLocalizedMessage = (notification) => {
    const type = String(notification?.notificationType || '').toUpperCase();
    switch (type) {
      // Forum notifications
      case 'LIKE_POST':
        return t('notifications.types.LIKE_POST.message');
      case 'LIKE_COMMENT':
        return t('notifications.types.LIKE_COMMENT.message');
      case 'COMMENT_POST':
        return t('notifications.types.COMMENT_POST.message');
      case 'REPLY_COMMENT':
        return t('notifications.types.REPLY_COMMENT.message');
      
      // Tour & Booking notifications
      case 'NEW_BOOKING':
        return t('notifications.types.NEW_BOOKING.message');
      case 'BOOKING_CONFIRMED':
        return t('notifications.types.BOOKING_CONFIRMED.message');
      case 'BOOKING_UPDATE_REQUEST':
        return t('notifications.types.BOOKING_UPDATE_REQUEST.message');
      case 'TOUR_APPROVED':
        return t('notifications.types.TOUR_APPROVED.message');
      case 'NEW_RATING':
        return t('notifications.types.NEW_RATING.message');
      case 'BOOKING_REJECTED':
        return t('notifications.types.BOOKING_REJECTED.message');
      case 'BOOKING_UPDATED_BY_USER':
        return t('notifications.types.BOOKING_UPDATED_BY_USER.message');
      
      // Booking success statuses (new)
      case 'BOOKING_SUCCESS':
        return t('notifications.types.BOOKING_SUCCESS.message', 'Booking của bạn đã hoàn thành thành công.');
      case 'BOOKING_BALANCE_SUCCESS':
        return t('notifications.types.BOOKING_BALANCE_SUCCESS.message', 'Thanh toán số dư đã hoàn tất. Booking của bạn đã được xác nhận.');
      case 'PENDING_BALANCE_PAYMENT':
        return t('notifications.types.PENDING_BALANCE_PAYMENT.message', 'Vui lòng thanh toán số dư còn lại cho booking.');
      case 'BOOKING_SUCCESS_PENDING':
        return t('notifications.types.BOOKING_SUCCESS_PENDING.message', 'Booking của bạn đang chờ xác nhận hoàn thành.');
      case 'BOOKING_SUCCESS_WAIT_FOR_CONFIRMED':
        return t('notifications.types.BOOKING_SUCCESS_WAIT_FOR_CONFIRMED.message', 'Vui lòng chờ xác nhận hoàn thành tour.');
      case 'BOOKING_CANCELLED':
        return t('notifications.types.BOOKING_CANCELLED.message', 'Booking của bạn đã bị hủy.');
      
      default:
        return null;
    }
  };

  // Handle notification click and redirect based on notification type
  const handleNotificationClick = (notification) => {
    if (!notification) return;

    const type = String(notification.notificationType || '').toUpperCase();
    const targetId = notification.targetId;
    const userRole = user?.role;

    // Mark as read when clicked
    if (!notification.isRead && notification.notificationId) {
      markAsRead(notification.notificationId);
    }

    // Close dropdown
    onClose();

    // Only redirect if user has a valid role
    if (!userRole) {
      // No role - don't redirect, just close dropdown
      return;
    }

    // Handle redirect based on notification type and role
    switch (type) {
      // Company-only notifications - redirect to management pages
      case 'NEW_BOOKING':
      case 'BOOKING_UPDATED_BY_USER':
        // Only redirect if user is COMPANY
        if (userRole === 'COMPANY') {
          navigate('/company/bookings');
        }
        // Other roles: do nothing (just close dropdown)
        break;

      case 'TOUR_APPROVED':
        // Only redirect if user is COMPANY
        if (userRole === 'COMPANY') {
          navigate('/company/tours');
        }
        // Other roles: do nothing
        break;

      case 'NEW_RATING':
        // Only redirect if user is COMPANY
        if (userRole === 'COMPANY') {
          navigate('/company/tours');
        }
        // Other roles: do nothing
        break;

      // User-only notifications - redirect to booking detail
      case 'BOOKING_CONFIRMED':
      case 'BOOKING_REJECTED':
      case 'BOOKING_UPDATE_REQUEST':
        // Only redirect if user is USER and has targetId
        if (userRole === 'USER' && targetId) {
          navigate(`/user/booking?id=${targetId}`);
        }
        // Other roles or no targetId: do nothing
        break;

      // Booking balance success - redirect to booking detail for payment
      case 'BOOKING_BALANCE_SUCCESS':
        // User: redirect to booking detail to make balance payment
        if (userRole === 'USER' && targetId) {
          navigate(`/user/booking?id=${targetId}`);
        }
        // Company: redirect to booking management
        else if (userRole === 'COMPANY') {
          navigate('/company/bookings');
        }
        // Other roles or no targetId: do nothing
        break;

      // Pending balance payment - redirect to booking detail for payment
      case 'PENDING_BALANCE_PAYMENT':
        // User: redirect to booking detail to make balance payment
        if (userRole === 'USER' && targetId) {
          navigate(`/user/booking?id=${targetId}`);
        }
        // Company: redirect to booking management
        else if (userRole === 'COMPANY') {
          navigate('/company/bookings');
        }
        // Other roles or no targetId: do nothing
        break;

      // Booking success wait for confirmed - redirect to booking detail
      case 'BOOKING_SUCCESS_WAIT_FOR_CONFIRMED':
        // User: redirect to booking detail to confirm completion
        if (userRole === 'USER' && targetId) {
          navigate(`/user/booking?id=${targetId}`);
        }
        // Company: redirect to booking management
        else if (userRole === 'COMPANY') {
          navigate('/company/bookings');
        }
        // Other roles or no targetId: do nothing
        break;

      // Booking success statuses - redirect based on role
      case 'BOOKING_SUCCESS':
      case 'BOOKING_SUCCESS_PENDING':
      case 'BOOKING_CANCELLED':
        // User: redirect to booking history
        if (userRole === 'USER') {
          navigate('/user/booking-history');
        } 
        // Company: redirect to booking management
        else if (userRole === 'COMPANY') {
          navigate('/company/bookings');
        }
        // Other roles (ADMIN, STAFF, etc.): do nothing
        break;

      // Forum notifications - could redirect to forum post/comment
      // For now, just close dropdown (can be extended later)
      case 'LIKE_POST':
      case 'LIKE_COMMENT':
      case 'COMMENT_POST':
      case 'REPLY_COMMENT':
        // Could navigate to forum post/comment detail
        // For now, just close dropdown
        break;

      default:
        // Unknown notification type - just close dropdown, no redirect
        break;
    }
  };

  // Use state to control mounting/unmounting with animation
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      // Use requestAnimationFrame to ensure initial state is applied before showing
      // Double RAF ensures the browser has rendered the hidden state first
      // This prevents the "jump" by giving the browser time to apply initial styles
      const rafId = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
      return () => cancelAnimationFrame(rafId);
    } else {
      setIsAnimating(false);
      // Delay unmounting to allow close animation to complete
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 250); // Match CSS transition duration
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!shouldRender) return null;

  return (
    <div className={`${styles.notificationDropdown} ${isAnimating ? styles.show : styles.hide} ${isExpanded ? styles.expanded : ''}`} ref={dropdownRef}>
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
            const localizedTitle = getLocalizedTitle(n);
            const localizedMessage = getLocalizedMessage(n);

            return (
              <div 
                key={n.notificationId}
                className={`${styles.notificationItem} ${!n.isRead ? styles.unread : ''}`}
                onClick={() => handleNotificationClick(n)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleNotificationClick(n);
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                {/* Icon */}
                <div className={`${styles.notificationIcon} ${styles[color]}`}>
                  <Icon size={20} strokeWidth={1.5} />
                </div>

                {/* Content */}
                <div className={styles.notificationContent}>
                  <div className={styles.notificationHeader}>
                    <h4 className={styles.notificationTitle}>
                      {localizedTitle || n.title || t('notifications.noTitle', 'Không có tiêu đề')}
                    </h4>
                    <span className={styles.notificationTime}>{timeText}</span>
                  </div>
                  
                  {(localizedMessage || n.message) && (
                    <p className={styles.notificationMessage}>
                      {localizedMessage || n.message}
                    </p>
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
                <div 
                  className={styles.notificationActions}
                  onClick={(e) => e.stopPropagation()}
                >
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
