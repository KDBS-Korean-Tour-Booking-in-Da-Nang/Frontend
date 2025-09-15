import './DeleteConfirmModal.css';

const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, title, message, itemName }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="delete-confirm-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-header">
          <div className="warning-icon">⚠️</div>
          <h2>{title || 'Xác nhận xóa'}</h2>
        </div>

        <div className="modal-content">
          <p className="confirm-message">
            {message || `Bạn có chắc chắn muốn xóa ${itemName || 'mục này'}?`}
          </p>
          <p className="warning-text">
            Hành động này không thể hoàn tác.
          </p>
        </div>

        <div className="modal-actions">
          <button 
            type="button" 
            onClick={onClose} 
            className="btn-cancel"
          >
            Hủy
          </button>
          <button 
            type="button" 
            onClick={onConfirm} 
            className="btn-delete"
          >
            Xóa
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;