import { useEffect, useState } from 'react';
import styles from './Toast.module.css';

const Toast = ({ message, type = 'error', duration = 5000, onClose, index = 0 }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  if (!isVisible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✓';
      case 'warning':
        return '⚠';
      case 'info':
        return 'ℹ';
      default:
        return '✕';
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return '#10B981';
      case 'warning':
        return '#F59E0B';
      case 'info':
        return '#3B82F6';
      default:
        return '#EF4444';
    }
  };

  // Calculate position based on index to stack toasts vertically
  const topPosition = 20 + (index * 80); // 80px spacing between toasts

  return (
    <div 
      className={styles['toast-container']}
      style={{
        top: `${topPosition}px`,
        zIndex: 999999
      }}
    >
      <div 
        className={`${styles['toast']} ${styles[`toast-${type}`]}`}
        style={{
          border: `3px solid ${getBackgroundColor()}`
        }}
      >
        <div className={styles['toast-content']}>
          <div className={styles['toast-icon-container']}>
            <div 
              className={`${styles['toast-icon']} ${styles[type]}`}
              style={{
                color: getBackgroundColor()
              }}
            >
              {getIcon()}
            </div>
          </div>
          <div className={styles['toast-message']}>
            {message}
          </div>
          <button 
            onClick={handleClose}
            className={styles['toast-close-button']}
          >
            <span className={styles['toast-close-icon']}>×</span>
          </button>
        </div>
        <div 
          className={`${styles['toast-progress-bar']} ${styles['toast-progress-animation']}`}
          style={{
            background: `linear-gradient(90deg, ${getBackgroundColor()}, ${getBackgroundColor()}88)`,
            animationDuration: `${duration}ms`
          }}
        />
      </div>
    </div>
  );
};

export default Toast;
