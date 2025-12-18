import { createContext, useContext, useRef, useState } from 'react';
import { Toast } from '../components';
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
  const isBatchingRef = useRef(false);
  const batchTimerRef = useRef(null);
  const activeKeysRef = useRef(new Set()); // prevent duplicate same-type+message toasts
  const idToKeyRef = useRef(new Map());

  const removeToast = (id) => {
    const key = idToKeyRef.current.get(id);
    if (key) {
      activeKeysRef.current.delete(key);
      idToKeyRef.current.delete(id);
    }
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Resolve message: nếu input là object với i18nKey thì dùng i18n.t với values, nếu là string và i18n.exists thì translate, fallback về String(input), ignore errors
  const resolveMessage = (input) => {
    try {
      if (typeof input === 'object' && input !== null) {
        const { i18nKey, values } = input;
        if (i18nKey) return i18n.t(i18nKey, values);
      }
      if (typeof input === 'string' && i18n?.exists?.(input)) {
        return i18n.t(input);
      }
    } catch {
      // Silently handle error
    }
    return String(input ?? '');
  };

  // Thêm toast: resolve message, tạo unique ID, de-dup bằng key (type:message) để tránh duplicate cùng lúc, auto remove sau duration, trả về toast ID
  const addToast = (message, type = 'error', duration = 5000) => {
    const id = Date.now() + Math.random();
    const resolved = resolveMessage(message);
    const key = `${type}:${resolved}`;
    if (activeKeysRef.current.has(key)) {
      return null;
    }
    activeKeysRef.current.add(key);
    const newToast = {
      id,
      message: resolved,
      type,
      duration
    };

    setToasts(prev => [...prev, newToast]);
    idToKeyRef.current.set(id, key);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  };

  // Hiển thị batch toasts: chỉ hiển thị ngay nếu không có batch nào đang active, ignore khi đang active (không queue), normalize messages, clear active flag sau duration và cleanup
  const showBatch = (messages, type = 'error', duration = 5000) => {
    const normalized = (messages || []).filter(Boolean).map(m => resolveMessage(m));
    if (normalized.length === 0) return;
    if (isBatchingRef.current) return;

    isBatchingRef.current = true;

    const ids = normalized.map(msg => addToast(msg, type, duration));
    const ms = Math.max(duration, 0);
    if (batchTimerRef.current) clearTimeout(batchTimerRef.current);
    batchTimerRef.current = setTimeout(() => {
      ids.forEach(id => removeToast(id));
      isBatchingRef.current = false;
      batchTimerRef.current = null;
    }, ms);
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
    clearAllToasts,
    showBatch
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
