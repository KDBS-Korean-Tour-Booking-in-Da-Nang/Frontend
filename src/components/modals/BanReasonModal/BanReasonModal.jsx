import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { NoSymbolIcon } from '@heroicons/react/24/solid';

const BanReasonModal = ({ isOpen, onClose, customer, onConfirm }) => {
  const { t } = useTranslation();
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const modalContainerRef = useRef(null);
  const bodyOverflowRef = useRef('');

  // Xác định portal container khi component mount
  useEffect(() => {
    if (!modalContainerRef.current) {
      const root = typeof document !== 'undefined' ? document.getElementById('modal-root') : null;
      modalContainerRef.current = root || (typeof document !== 'undefined' ? document.body : null);
    }
  }, []);

  // Khóa scroll của body khi modal mở
  useEffect(() => {
    if (!modalContainerRef.current || typeof document === 'undefined') return;
    if (isOpen) {
      bodyOverflowRef.current = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = bodyOverflowRef.current || '';
      };
    }
  }, [isOpen]);

  if (!isOpen || !customer) return null;

  const presetReasons = [
    { value: 'SPAM', label: t('admin.banReasonModal.reasons.spam') },
    { value: 'HARASSMENT', label: t('admin.banReasonModal.reasons.harassment') },
    { value: 'FRAUD', label: t('admin.banReasonModal.reasons.fraud') },
    { value: 'VIOLATION', label: t('admin.banReasonModal.reasons.violation') },
    { value: 'INAPPROPRIATE', label: t('admin.banReasonModal.reasons.inappropriate') },
    { value: 'OTHER', label: t('admin.banReasonModal.reasons.other') }
  ];

  const handleReasonChange = (value) => {
    setSelectedReason(value);
    if (value !== 'OTHER') {
      setCustomReason('');
    }
  };

  const handleSubmit = async () => {
    if (!selectedReason) {
      alert(t('admin.banReasonModal.errors.selectReason'));
      return;
    }

    if (selectedReason === 'OTHER' && !customReason.trim()) {
      alert(t('admin.banReasonModal.errors.enterReason'));
      return;
    }

    setIsSubmitting(true);
    const reason = selectedReason === 'OTHER' ? customReason.trim() : presetReasons.find(r => r.value === selectedReason)?.label || selectedReason;
    
    try {
      await onConfirm(reason);
      setSelectedReason('');
      setCustomReason('');
      onClose();
    } catch (error) {
      // Silently handle error
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-red-50/30">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-[20px] bg-red-100 flex items-center justify-center">
              <NoSymbolIcon className="w-5 h-5 text-red-600" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{t('admin.banReasonModal.title')}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{customer.name || customer.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-[20px] hover:bg-gray-50 transition-colors text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
          <p className="text-sm text-gray-600 mb-4">
            {t('admin.banReasonModal.description')}
          </p>

          {/* Reason Options */}
          <div className="space-y-2">
            {presetReasons.map((reason) => (
              <label
                key={reason.value}
                className={`flex items-start gap-3 p-4 rounded-[24px] border-2 cursor-pointer transition-all ${
                  selectedReason === reason.value
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100'
                }`}
              >
                <input
                  type="radio"
                  name="banReason"
                  value={reason.value}
                  checked={selectedReason === reason.value}
                  onChange={(e) => handleReasonChange(e.target.value)}
                  className="mt-1 w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
                />
                <span className="flex-1 text-sm font-medium text-gray-700">
                  {reason.label}
                </span>
              </label>
            ))}
          </div>

          {/* Custom Reason Input */}
          {selectedReason === 'OTHER' && (
            <div className="mt-4 pb-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('admin.banReasonModal.customReasonLabel')}
              </label>
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder={t('admin.banReasonModal.customReasonPlaceholder')}
                className="w-full px-4 py-3 rounded-[24px] border-2 border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-300 text-sm resize-none"
                rows="4"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50/50">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-[20px] border border-gray-200 text-gray-700 font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('admin.banReasonModal.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedReason || (selectedReason === 'OTHER' && !customReason.trim())}
            className="px-6 py-2.5 rounded-[20px] bg-red-500 text-white font-semibold hover:bg-red-600 transition-all shadow-[0_8px_20px_rgba(239,68,68,0.3)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {isSubmitting ? t('admin.banReasonModal.processing') : t('admin.banReasonModal.confirm')}
          </button>
        </div>
      </div>
    </div>
  );

  // Render modal sử dụng portal để tránh ràng buộc container
  return modalContainerRef.current 
    ? createPortal(modalContent, modalContainerRef.current)
    : modalContent;
};

export default BanReasonModal;

