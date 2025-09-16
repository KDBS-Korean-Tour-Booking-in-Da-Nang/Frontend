import { useEffect, useState } from 'react';
import './Toast.css';

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
      style={{
        position: 'fixed',
        top: `${topPosition}px`,
        right: '20px',
        zIndex: 999999,
        backgroundColor: 'white',
        border: `3px solid ${getBackgroundColor()}`,
        borderRadius: '12px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
        minWidth: '320px',
        maxWidth: '400px',
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '16px',
        fontWeight: 'bold'
      }}
    >
      <div 
        style={{
          width: '24px',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          fontWeight: 'bold',
          color: getBackgroundColor()
        }}
      >
        {getIcon()}
      </div>
      <div 
        style={{
          flex: 1,
          fontSize: '14px',
          fontWeight: '500',
          color: '#374151',
          lineHeight: '1.5'
        }}
      >
        {message}
      </div>
      <button 
        onClick={handleClose}
        style={{
          background: 'none',
          border: 'none',
          padding: '4px',
          cursor: 'pointer',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          color: '#6b7280'
        }}
      >
        ×
      </button>
      <div 
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          height: '3px',
          width: '100%',
          background: `linear-gradient(90deg, ${getBackgroundColor()}, ${getBackgroundColor()}88)`,
          animation: `toast-progress ${duration}ms linear forwards`
        }}
      />
    </div>
  );
};

export default Toast;
