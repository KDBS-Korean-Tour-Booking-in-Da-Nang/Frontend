import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { UserPlusIcon } from '@heroicons/react/24/solid';

const AddStaffModal = ({ isOpen, onClose, onSubmit, submitting, error: externalError, formErrors: externalFormErrors }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    staffTask: ''
  });
  const [localFormErrors, setLocalFormErrors] = useState({});

  const formErrors = { ...localFormErrors, ...(externalFormErrors || {}) };
  const error = externalError || '';

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({ username: '', password: '', staffTask: '' });
      setLocalFormErrors({});
    }
  }, [isOpen]);

  // Block space character input in password
  const handlePasswordBeforeInput = (e) => {
    const { data } = e;
    if (data == null) return;
    if (data === ' ' || data === '\u00A0') {
      e.preventDefault();
    }
  };

  // Handle paste in password: remove spaces
  const handlePasswordPaste = (e) => {
    e.preventDefault();
    const pasted = (e.clipboardData || window.clipboardData).getData('text');
    const cleaned = pasted.replace(/\s/g, '');
    const target = e.target;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const current = target.value;
    const newValue = current.slice(0, start) + cleaned + current.slice(end);
    
    setFormData(prev => ({ ...prev, password: newValue }));
    setLocalFormErrors(prev => ({ ...prev, password: '' }));
  };

  const handleInputChange = (field, value) => {
    // Remove all spaces from password field
    const cleanedValue = (field === 'password') ? value.replace(/\s/g, '') : value;
    setFormData(prev => ({ ...prev, [field]: cleanedValue }));
    setLocalFormErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalFormErrors({});

    const errors = {};
    if (!formData.username.trim()) {
      errors.username = t('admin.addStaffModal.errors.usernameRequired');
    }
    if (!formData.password.trim()) {
      errors.password = t('admin.addStaffModal.errors.passwordRequired');
    }

    if (Object.keys(errors).length > 0) {
      setLocalFormErrors(errors);
      return;
    }

    try {
      await onSubmit(formData);
      // Only reset if submission is successful (modal will be closed by parent)
      setFormData({ username: '', password: '', staffTask: '' });
      setLocalFormErrors({});
    } catch (err) {
      // Error is handled by parent component
    }
  };

  const handleClose = () => {
    setFormData({ username: '', password: '', staffTask: '' });
    setLocalFormErrors({});
    onClose();
  };

  // Reset body margin và ngăn scroll khi modal mở
  useEffect(() => {
    if (isOpen) {
      const originalMargin = document.body.style.margin;
      const originalPadding = document.body.style.padding;
      const originalOverflow = document.body.style.overflow;
      
      document.body.style.margin = '0';
      document.body.style.padding = '0';
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.body.style.margin = originalMargin;
        document.body.style.padding = originalPadding;
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed top-0 left-0 right-0 bottom-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm"
      style={{ margin: 0 }}
      onClick={handleClose}
    >
      <div 
        className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
        style={{ marginTop: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-blue-50/30" style={{ marginTop: 0 }}>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-[20px] bg-blue-100 flex items-center justify-center">
              <UserPlusIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{t('admin.addStaffModal.title')}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{t('admin.addStaffModal.subtitle')}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-[20px] hover:bg-gray-50 transition-colors text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit}>
          <div className="flex-1 overflow-y-auto p-6 space-y-5 min-h-0">
            {error && (
              <div className="p-4 rounded-[20px] bg-red-50 border border-red-200">
                <p className="text-sm font-medium text-red-900">{error}</p>
              </div>
            )}

            {/* Username Field */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                {t('admin.addStaffModal.fields.username')} <span className="text-red-500">{t('admin.addStaffModal.fields.usernameRequired')}</span>
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                className={`w-full px-4 py-3 rounded-[20px] border-2 ${
                  formErrors.username 
                    ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-400' 
                    : 'border-gray-200 bg-gray-50 focus:ring-blue-500 focus:border-blue-400'
                } focus:outline-none focus:ring-2 transition-all text-sm`}
                placeholder={t('admin.addStaffModal.fields.usernamePlaceholder')}
                required
              />
              {formErrors.username && (
                <p className="text-xs text-red-600 ml-1">{formErrors.username}</p>
              )}
              <p className="text-xs text-gray-500 ml-1">{t('admin.addStaffModal.fields.usernameHint')}</p>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                {t('admin.addStaffModal.fields.password')} <span className="text-red-500">{t('admin.addStaffModal.fields.passwordRequired')}</span>
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                onBeforeInput={handlePasswordBeforeInput}
                onPaste={handlePasswordPaste}
                className={`w-full px-4 py-3 rounded-[20px] border-2 ${
                  formErrors.password 
                    ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-400' 
                    : 'border-gray-200 bg-gray-50 focus:ring-blue-500 focus:border-blue-400'
                } focus:outline-none focus:ring-2 transition-all text-sm`}
                placeholder={t('admin.addStaffModal.fields.passwordPlaceholder')}
                required
              />
              {formErrors.password && (
                <p className="text-xs text-red-600 ml-1">{formErrors.password}</p>
              )}
              <p className="text-xs text-gray-500 ml-1">{t('admin.addStaffModal.fields.passwordHint')}</p>
            </div>

            {/* Staff Task Field */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                {t('admin.addStaffModal.fields.staffTask')}
              </label>
              <select
                value={formData.staffTask}
                onChange={(e) => handleInputChange('staffTask', e.target.value)}
                className="w-full px-4 py-3 rounded-[20px] border-2 border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all text-sm"
              >
                <option value="">{t('admin.addStaffModal.fields.staffTaskNone')}</option>
                <option value="FORUM_REPORT_AND_BOOKING_COMPLAINT">{t('admin.addStaffModal.fields.staffTaskForum')}</option>
                <option value="COMPANY_REQUEST_AND_RESOLVE_TICKET">{t('admin.addStaffModal.fields.staffTaskCompany')}</option>
                <option value="APPROVE_TOUR_BOOKING_AND_APPROVE_ARTICLE">{t('admin.addStaffModal.fields.staffTaskTour')}</option>
              </select>
              <p className="text-xs text-gray-500 ml-1">{t('admin.addStaffModal.fields.staffTaskHint')}</p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50/50">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="px-6 py-2.5 rounded-[20px] border border-gray-200 text-gray-700 font-semibold hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('admin.addStaffModal.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-[20px] bg-[#4c9dff] text-white font-semibold hover:bg-[#3f85d6] transition-all shadow-[0_8px_20px_rgba(76,157,255,0.3)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {submitting ? t('admin.addStaffModal.submitting') : t('admin.addStaffModal.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddStaffModal;
