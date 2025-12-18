import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { API_ENDPOINTS, createAuthHeaders } from '../../config/api';
import { checkAndHandle401 } from '../../utils/apiErrorHandler';
import LoginRequiredModal from '../modals/LoginRequiredModal/LoginRequiredModal';
import { Tooltip } from '../';
import { Calendar, CreditCard, User, FileText, MessageCircle, X, Check } from 'lucide-react';
import styles from './SupportTicketBubble.module.css';

const SupportTicketBubble = () => {
  const { t, i18n } = useTranslation();
  const { user, getToken } = useAuth();
  const { showSuccess } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState(null);
  const [otherMessage, setOtherMessage] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [messageError, setMessageError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Support ticket categories - 3 common + Other
  // Use useMemo to update when language changes
  const supportCategories = useMemo(() => [
    { 
      value: 'REASON_A', 
      label: t('supportTicket.categories.booking'),
      icon: Calendar
    },
    { 
      value: 'REASON_B', 
      label: t('supportTicket.categories.payment'),
      icon: CreditCard
    },
    { 
      value: 'REASON_C', 
      label: t('supportTicket.categories.account'),
      icon: User
    },
    { 
      value: 'OTHER', 
      label: t('supportTicket.categories.other'),
      icon: FileText
    }
  ], [t, i18n.language]);

  const handleBubbleClick = () => {
    // If user is not logged in (GUEST), show login modal
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    // If user is not USER role, don't show
    if (user && user.role !== 'USER') {
      return;
    }

    setIsOpen(!isOpen);
  };

  const handleCategorySelect = (category) => {
    setSelectedReason(category);
    if (categoryError) setCategoryError('');
    if (category !== 'OTHER') {
      setOtherMessage('');
      if (messageError) setMessageError('');
    }
  };

  const handleSubmit = async () => {
    setCategoryError('');
    setMessageError('');

    if (!selectedReason) {
      setCategoryError(t('supportTicket.errors.selectCategory'));
      return;
    }

    if (selectedReason === 'OTHER' && !otherMessage.trim()) {
      setMessageError(t('supportTicket.errors.enterMessage'));
      return;
    }

    if (!user || user.role !== 'USER') {
      return;
    }

    setIsSubmitting(true);
    try {
      const token = getToken();
      const message = selectedReason === 'OTHER' 
        ? otherMessage.trim() 
        : supportCategories.find(cat => cat.value === selectedReason)?.label || '';

      const requestBody = {
        userId: user.userId || user.id,
        message: message,
        reasons: selectedReason === 'OTHER' ? ['REASON_A'] : [selectedReason] // Backend expects array
      };

      const response = await fetch(API_ENDPOINTS.TICKET_CREATE, {
        method: 'POST',
        headers: createAuthHeaders(token),
        body: JSON.stringify(requestBody)
      });

      if (!response.ok && response.status === 401) {
        await checkAndHandle401(response);
        return;
      }

      if (response.ok) {
        showSuccess(t('supportTicket.success'));
        // Reset form
        setSelectedReason(null);
        setOtherMessage('');
        setIsOpen(false);
      } else {
        const errorText = await response.text();
        setMessageError(t('supportTicket.errors.submitError'));
      }
    } catch (error) {
      setMessageError(t('supportTicket.errors.submitError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedReason(null);
      setOtherMessage('');
      setIsOpen(false);
    }
  };

  // Don't show for non-USER roles (except GUEST)
  if (user && user.role !== 'USER') {
    return null;
  }

  return (
    <>
      <div className={styles['support-bubble-container']}>
        {/* Support Box - appears above bubble when open */}
        {isOpen && (
          <div className={styles['support-box']}>
            <div className={styles['support-box-header']}>
              <h3 className={styles['support-box-title']}>
                {t('supportTicket.title')}
              </h3>
            </div>
            
            <div className={styles['support-box-content']}>
              <p className={styles['support-box-description']}>
                {t('supportTicket.description')}
              </p>
              
              <div className={styles['categories-list']}>
                {supportCategories.map((category) => (
                  <div
                    key={category.value}
                    className={`${styles['category-item']} ${selectedReason === category.value ? styles['selected'] : ''} ${categoryError ? styles['category-item-error'] : ''}`}
                    onClick={() => handleCategorySelect(category.value)}
                  >
                    <span className={styles['category-icon']}>
                      {React.createElement(category.icon, { size: 20, strokeWidth: 1.5 })}
                    </span>
                    <span className={styles['category-label']}>{category.label}</span>
                    {selectedReason === category.value && (
                      <span className={styles['check-icon']}>
                        <Check size={18} strokeWidth={2.5} />
                      </span>
                    )}
                  </div>
                ))}
              </div>
              {categoryError && (
                <span className={styles['error-message']}>{categoryError}</span>
              )}

              {/* Other input field - shown when OTHER is selected */}
              {selectedReason === 'OTHER' && (
                <div className={styles['other-input-container']}>
                  <textarea
                    className={`${styles['other-input']} ${messageError ? styles['input-error'] : ''}`}
                    value={otherMessage}
                    onChange={(e) => {
                      setOtherMessage(e.target.value);
                      if (messageError) setMessageError('');
                    }}
                    placeholder={t('supportTicket.otherPlaceholder')}
                    rows={4}
                    maxLength={500}
                  />
                  <div className={styles['char-count']}>
                    {otherMessage.length}/500
                  </div>
                  {messageError && (
                    <span className={styles['error-message']}>{messageError}</span>
                  )}
                </div>
              )}

              <div className={styles['support-box-footer']}>
                <button
                  className={styles['submit-button']}
                  onClick={handleSubmit}
                  disabled={isSubmitting || !selectedReason || (selectedReason === 'OTHER' && !otherMessage.trim())}
                >
                  {isSubmitting 
                    ? t('supportTicket.submitting') 
                    : t('supportTicket.submit')
                  }
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bubble button - changes to X when open */}
        <Tooltip 
          text={isOpen ? t('supportTicket.tooltip.close') : t('supportTicket.tooltip.open')}
          position="right"
          delay={300}
        >
          <button
            className={`${styles['support-bubble']} ${isOpen ? styles['open'] : ''}`}
            onClick={handleBubbleClick}
            aria-label={isOpen ? t('supportTicket.close') : t('supportTicket.open')}
          >
            {isOpen ? (
              <X className={styles['close-icon']} size={24} strokeWidth={2} />
            ) : (
              <MessageCircle className={styles['bubble-icon']} size={24} strokeWidth={1.5} />
            )}
          </button>
        </Tooltip>
      </div>

      {/* Login Required Modal */}
      <LoginRequiredModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        title={t('supportTicket.loginRequired.title')}
        message={t('supportTicket.loginRequired.message')}
      />
    </>
  );
};

export default SupportTicketBubble;

