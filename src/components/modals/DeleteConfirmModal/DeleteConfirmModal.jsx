import React from 'react';
import { useTranslation } from 'react-i18next';
import './DeleteConfirmModal.css';

const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, title, message, itemName }) => {
  const { i18n } = useTranslation();

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <div className="delete-confirm-modal-overlay" onClick={handleClose}>
      <div className="delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="delete-confirm-modal-header">
          <h3 className="delete-confirm-modal-title">
            {title || (i18n.language === 'vi' ? 'Xác nhận xóa' : 
              i18n.language === 'ko' ? '삭제 확인' : 'Confirm Delete')}
          </h3>
          <button 
            className="delete-confirm-modal-close" 
            onClick={handleClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        
        <div className="delete-confirm-modal-body">
          <div className="delete-confirm-modal-icon">
            ⚠️
          </div>
          <p className="delete-confirm-modal-message">
            {message || (i18n.language === 'vi' ? 'Bạn có xác nhận rằng là xóa hay không?' :
              i18n.language === 'ko' ? '삭제하시겠습니까?' :
              'Are you sure you want to delete this?')}
          </p>
        </div>
        
        <div className="delete-confirm-modal-footer">
          <button 
            className="delete-confirm-modal-cancel" 
            onClick={handleClose}
          >
            {i18n.language === 'vi' ? 'Hủy' : i18n.language === 'ko' ? '취소' : 'Cancel'}
          </button>
          <button 
            className="delete-confirm-modal-confirm" 
            onClick={handleConfirm}
          >
            {i18n.language === 'vi' ? 'Xóa' : i18n.language === 'ko' ? '삭제' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;
