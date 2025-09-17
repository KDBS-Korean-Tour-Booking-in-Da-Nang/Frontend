import React from 'react';
import './ConfirmLeaveModal.css';

const ConfirmLeaveModal = ({ open, onCancel, onConfirm }) => {
  if (!open) return null;

  return (
    <div className="clm-overlay" role="dialog" aria-modal="true">
      <div className="clm-modal">
        <h3 className="clm-title">Rời khỏi trình tạo tour?</h3>
        <p className="clm-message">Nếu bạn thoát ra bây giờ, dữ liệu đang nhập sẽ không được lưu.</p>
        <div className="clm-actions">
          <button type="button" className="clm-btn clm-btn-cancel" onClick={onCancel}>Ở lại</button>
          <button type="button" className="clm-btn clm-btn-danger" onClick={onConfirm}>Thoát</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmLeaveModal;


