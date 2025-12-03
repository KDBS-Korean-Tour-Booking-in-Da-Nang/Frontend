import { useEffect, useState, useRef } from 'react';
import { X } from 'lucide-react';
import styles from './Toast.module.css';

const Toast = ({ message, type = 'error', duration = 5000, onClose, index = 0 }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(0); // Start from 0% (left), progress to 100% (right)
  const timerRef = useRef(null);
  const animationFrameIdRef = useRef(null);

  useEffect(() => {
    if (duration > 0) {
      const startTime = Date.now();
      
      const updateProgress = () => {
        const elapsed = Date.now() - startTime;
        const progressPercent = Math.min(100, (elapsed / duration) * 100);
        setProgress(progressPercent);
        
        if (progressPercent < 100) {
          animationFrameIdRef.current = requestAnimationFrame(updateProgress);
        }
      };
      
      // Start the animation
      animationFrameIdRef.current = requestAnimationFrame(updateProgress);

      timerRef.current = setTimeout(() => {
        if (animationFrameIdRef.current) {
          cancelAnimationFrame(animationFrameIdRef.current);
        }
        setIsVisible(false);
        onClose?.();
      }, duration);

      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
        if (animationFrameIdRef.current) {
          cancelAnimationFrame(animationFrameIdRef.current);
        }
      };
    } else {
      // If duration is 0, keep progress at 0% (no auto-dismiss)
      setProgress(0);
    }
  }, [duration, onClose]);

  const handleClose = () => {
    // Clear timeout and animation frame when user manually closes
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    setIsVisible(false);
    onClose?.();
  };

  if (!isVisible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✓';
      case 'warning':
        return '!';
      case 'info':
        return 'i';
      default:
        return '✕';
    }
  };

  const getColors = () => {
    switch (type) {
      case 'success':
        return {
          background: '#0d7a5a', // lighter dark green
          iconBg: '#10b981', // vibrant green
          text: '#d1fae5', // light green/white
          progress: '#34d399' // light green for progress
        };
      case 'warning':
        return {
          background: '#b45309', // lighter dark orange
          iconBg: '#f59e0b', // vibrant orange
          text: '#fef3c7', // light orange/white
          progress: '#fbbf24' // light orange for progress
        };
      case 'info':
        return {
          background: '#2563eb', // lighter dark blue
          iconBg: '#3b82f6', // vibrant blue
          text: '#dbeafe', // light blue/white
          progress: '#60a5fa' // light blue for progress
        };
      default: // error
        return {
          background: '#991b1b', // lighter dark red
          iconBg: '#ef4444', // vibrant red
          text: '#fee2e2', // light red/white
          progress: '#f87171' // light red for progress
        };
    }
  };

  const colors = getColors();
  // Calculate position based on index to stack toasts vertically
  const topPosition = 20 + (index * 100); // 100px spacing between toasts

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
          backgroundColor: colors.background,
          opacity: 0.85
        }}
      >
        <div className={styles['toast-content']}>
          <div className={styles['toast-icon-container']}>
            <div 
              className={styles['toast-icon']}
              style={{
                backgroundColor: colors.iconBg,
                color: '#ffffff'
              }}
            >
              {getIcon()}
            </div>
          </div>
          <div 
            className={styles['toast-message']}
            style={{
              color: colors.text
            }}
          >
            {message}
          </div>
          <button
            onClick={handleClose}
            className={styles['toast-close-button']}
            aria-label="Đóng"
            style={{
              color: colors.text
            }}
          >
            <X className={styles['toast-close-icon']} strokeWidth={1.5} />
          </button>
        </div>
        <div className={styles['toast-progress-container']}>
          <div 
            className={styles['toast-progress-bar']}
            style={{
              background: `linear-gradient(to right, transparent 0%, ${colors.progress}88 20%, ${colors.progress} 40%, ${colors.progress} 100%)`,
              width: `${progress}%`
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Toast;
