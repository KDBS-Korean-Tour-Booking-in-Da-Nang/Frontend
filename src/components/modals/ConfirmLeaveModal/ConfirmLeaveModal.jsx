import React from 'react';
import { useTranslation } from 'react-i18next';
import './ConfirmLeaveModal.css';

const ConfirmLeaveModal = ({ open, onCancel, onConfirm }) => {
  const { t } = useTranslation();
  if (!open) return null;

  return (
    <div className="clm-overlay" role="dialog" aria-modal="true">
      <div className="clm-modal">
        <h3 className="clm-title">{t('common.modal.confirmLeave.title')}</h3>
        <p className="clm-message">{t('common.modal.confirmLeave.message')}</p>
        <div className="clm-actions">
          <button type="button" className="clm-btn clm-btn-cancel" onClick={onCancel}>{t('common.modal.confirmLeave.stay')}</button>
          <button type="button" className="clm-btn clm-btn-danger" onClick={onConfirm}>{t('common.modal.confirmLeave.leave')}</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmLeaveModal;


