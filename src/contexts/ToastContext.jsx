import { createContext, useContext, useRef, useState } from 'react';
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
      // Silently handle error resolving message
    }
    return String(input ?? '');
  };

  const addToast = (message, type = 'error', duration = 5000) => {
    const id = Date.now() + Math.random();
    const resolved = resolveMessage(message);
    const key = `${type}:${resolved}`;
    // de-dup by same message+type while visible
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

    // Auto remove toast after duration
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  };

  // Show a batch immediately only if none is active; ignore while active (no queue)
  const showBatch = (messages, type = 'error', duration = 5000) => {
    const normalized = (messages || []).filter(Boolean).map(m => resolveMessage(m));
    if (normalized.length === 0) return;
    if (isBatchingRef.current) return; // ignore new batches while one is active

    isBatchingRef.current = true;

    const ids = normalized.map(msg => addToast(msg, type, duration));
    // Clear active flag after duration; also ensure cleanup
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
