import { createContext, useContext, useState } from 'react';
import Toast from '../components/toast/Toast';
import i18n from '../i18n';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const resolveMessage = (input) => {
    try {
      if (typeof input === 'object' && input !== null) {
        const { i18nKey, values } = input;
        if (i18nKey) return i18n.t(i18nKey, values);
      }
      if (typeof input === 'string' && i18n?.exists?.(input)) {
        return i18n.t(input);
      }
    } catch (_) {}
    return String(input ?? '');
  };

  const addToast = (message, type = 'error', duration = 5000) => {
    const id = Date.now() + Math.random();
    const newToast = {
      id,
      message: resolveMessage(message),
      type,
      duration
    };

    setToasts(prev => [...prev, newToast]);

    // Auto remove toast after duration
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  };

  const showError = (message, duration = 5000) => {
    return addToast(message, 'error', duration);
  };

  const showSuccess = (message, duration = 3000) => {
    return addToast(message, 'success', duration);
  };

  const showWarning = (message, duration = 4000) => {
    return addToast(message, 'warning', duration);
  };

  const showInfo = (message, duration = 4000) => {
    return addToast(message, 'info', duration);
  };

  const clearAllToasts = () => {
    setToasts([]);
  };

  const value = {
    toasts,
    addToast,
    removeToast,
    showError,
    showSuccess,
    showWarning,
    showInfo,
    clearAllToasts
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-portal">
        {toasts.map((toast, index) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            index={index}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};
