import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import './LoginRequiredModal.css';

const LoginRequiredModal = ({ isOpen, onClose, title, message, redirectTo = '/login', returnTo = null }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [isI18nReady, setIsI18nReady] = useState(false);

  useEffect(() => {
    // Wait for i18n to be ready
    if (i18n.isInitialized) {
      setIsI18nReady(true);
    } else {
      i18n.on('initialized', () => {
        setIsI18nReady(true);
      });
    }
  }, [i18n]);

  if (!isOpen) return null;

  // Helper function to get translation with fallback
  const getTranslation = (key, fallback) => {
    // If i18n is not ready, use fallback
    if (!isI18nReady) {
      return fallback;
    }
    
    const translation = t(key);
    // If translation returns the key itself, use fallback
    if (translation === key) {
      return fallback;
    }
    return translation || fallback;
  };

  const handleLogin = () => {
    onClose();
    // If returnTo is specified, store it in localStorage for redirect after login
    if (returnTo) {
      localStorage.setItem('returnAfterLogin', returnTo);
    }
    navigate(redirectTo);
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <div className="login-required-modal-overlay" onClick={handleClose}>
      <div className="login-required-modal" onClick={(e) => e.stopPropagation()}>
        <div className="login-required-modal-header">
          <h3 className="login-required-modal-title">
            {title || getTranslation('auth.loginRequired.title', 'Please login to perform')}
          </h3>
          <button 
            className="login-required-modal-close" 
            onClick={handleClose}
            aria-label={getTranslation('common.close', 'Close')}
          >
            ✕
          </button>
        </div>
        
        <div className="login-required-modal-body">
          <div className="login-required-modal-icon">
            🔐
          </div>
          <p className="login-required-modal-message">
            {message || getTranslation('auth.loginRequired.message', 'Please login to perform this action.')}
          </p>
        </div>
        
        <div className="login-required-modal-footer">
          <button 
            className="login-required-modal-cancel" 
            onClick={handleClose}
          >
            {getTranslation('common.cancel', 'Cancel')}
          </button>
          <button 
            className="login-required-modal-login" 
            onClick={handleLogin}
          >
            {getTranslation('auth.common.login', 'Login')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginRequiredModal;
