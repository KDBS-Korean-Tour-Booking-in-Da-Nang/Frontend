import { 
  XMarkIcon,
  EyeIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  CalendarIcon,
  ShoppingCartIcon,
  UserCircleIcon,
  CreditCardIcon,
  CurrencyDollarIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

const CustomerDetailModal = ({ isOpen, onClose, customer }) => {
  const { t, i18n } = useTranslation();
  if (!isOpen || !customer) return null;

  const formatCurrency = (value) => {
    if (!value && value !== 0) return 'N/A';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const locale = i18n.language === 'ko' ? 'ko-KR' : i18n.language === 'en' ? 'en-US' : 'vi-VN';
      return new Date(dateString).toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  const getGenderLabel = (gender) => {
    if (!gender) return 'N/A';
    const g = gender.toUpperCase();
    if (g === 'M' || g === 'MALE' || g === 'NAM') return t('admin.customerDetailModal.gender.male');
    if (g === 'F' || g === 'FEMALE' || g === 'NỮ' || g === 'NU') return t('admin.customerDetailModal.gender.female');
    if (g === 'O' || g === 'OTHER' || g === 'KHÁC') return t('admin.customerDetailModal.gender.other');
    return gender;
  };

  const statusStyle = customer.status === 'active'
    ? { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' }
    : { bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-300' };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-[32px] shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-blue-50/30">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-[20px] bg-blue-100 flex items-center justify-center">
              <EyeIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{t('admin.customerDetailModal.title')}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{t('admin.customerDetailModal.id', { id: customer.id || customer.userId })}</p>
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
        <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0">
          {/* Avatar & Basic Info */}
          <div className="flex items-start gap-4 pb-6 border-b border-gray-100">
            <img 
              src={customer.avatar || '/default-avatar.png'} 
              alt={customer.name} 
              className="h-24 w-24 rounded-full object-cover border-2 border-gray-200"
              onError={(e) => {
                e.target.src = '/default-avatar.png';
              }}
            />
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{customer.name || 'N/A'}</h3>
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                  {customer.status === 'active' ? t('admin.customerDetailModal.status.active') : t('admin.customerDetailModal.status.inactive')}
                </span>
              </div>
              {customer.userId && (
                <p className="text-sm text-gray-500">User ID: {customer.userId}</p>
              )}
            </div>
          </div>

          {/* Personal Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <UserIcon className="w-4 h-4" />
              {t('admin.customerDetailModal.sections.personalInfo')}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customer.dob && (
                <div className="flex items-start gap-3 p-4 rounded-[20px] bg-gray-50 border border-gray-200">
                  <div className="h-10 w-10 rounded-[12px] bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <CalendarIcon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 mb-1">{t('admin.customerDetailModal.fields.dob')}</p>
                    <p className="text-sm font-medium text-gray-900">{formatDate(customer.dob)}</p>
                  </div>
                </div>
              )}

              {customer.gender && (
                <div className="flex items-start gap-3 p-4 rounded-[20px] bg-gray-50 border border-gray-200">
                  <div className="h-10 w-10 rounded-[12px] bg-pink-100 flex items-center justify-center flex-shrink-0">
                    <UserIcon className="w-5 h-5 text-pink-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 mb-1">{t('admin.customerDetailModal.fields.gender')}</p>
                    <p className="text-sm font-medium text-gray-900">{getGenderLabel(customer.gender)}</p>
                  </div>
                </div>
              )}

              {customer.cccd && (
                <div className="flex items-start gap-3 p-4 rounded-[20px] bg-gray-50 border border-gray-200">
                  <div className="h-10 w-10 rounded-[12px] bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <CreditCardIcon className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 mb-1">{t('admin.customerDetailModal.fields.cccd')}</p>
                    <p className="text-sm font-medium text-gray-900">{customer.cccd}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <UserCircleIcon className="w-4 h-4" />
              {t('admin.customerDetailModal.sections.contactInfo')}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-4 rounded-[20px] bg-gray-50 border border-gray-200">
                <div className="h-10 w-10 rounded-[12px] bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <EnvelopeIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 mb-1">{t('admin.customerDetailModal.fields.email')}</p>
                  <p className="text-sm font-medium text-gray-900 break-words">{customer.email || 'N/A'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-[20px] bg-gray-50 border border-gray-200">
                <div className="h-10 w-10 rounded-[12px] bg-green-100 flex items-center justify-center flex-shrink-0">
                  <PhoneIcon className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 mb-1">{t('admin.customerDetailModal.fields.phone')}</p>
                  <p className="text-sm font-medium text-gray-900">{customer.phone || 'N/A'}</p>
                </div>
              </div>

              {customer.address && (
                <div className="flex items-start gap-3 p-4 rounded-[20px] bg-gray-50 border border-gray-200 md:col-span-2">
                  <div className="h-10 w-10 rounded-[12px] bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <MapPinIcon className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 mb-1">{t('admin.customerDetailModal.fields.address')}</p>
                    <p className="text-sm font-medium text-gray-900 break-words">{customer.address}</p>
                    {customer.city && (
                      <p className="text-xs text-gray-500 mt-1">{t('admin.customerDetailModal.fields.city', { city: customer.city })}</p>
                    )}
                    {customer.country && (
                      <p className="text-xs text-gray-500 mt-1">{t('admin.customerDetailModal.fields.country', { country: customer.country })}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Account & Financial Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <CurrencyDollarIcon className="w-4 h-4" />
              {t('admin.customerDetailModal.sections.accountFinancial')}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customer.balance !== undefined && customer.balance !== null && (
                <div className="flex items-start gap-3 p-4 rounded-[20px] bg-gradient-to-br from-green-50 to-green-100 border border-green-200">
                  <div className="h-10 w-10 rounded-[12px] bg-green-100 flex items-center justify-center flex-shrink-0">
                    <CurrencyDollarIcon className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-green-600 font-semibold uppercase mb-1">{t('admin.customerDetailModal.fields.balance')}</p>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(customer.balance)}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 p-4 rounded-[20px] bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
                <div className="h-10 w-10 rounded-[12px] bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <ShoppingCartIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-blue-600 font-semibold uppercase mb-1">{t('admin.customerDetailModal.fields.totalOrders')}</p>
                  <p className="text-lg font-bold text-gray-900">{customer.totalBookings || 0}</p>
                </div>
              </div>

              {customer.lastBooking && (
                <div className="flex items-start gap-3 p-4 rounded-[20px] bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200">
                  <div className="h-10 w-10 rounded-[12px] bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <CalendarIcon className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-purple-600 font-semibold uppercase mb-1">{t('admin.customerDetailModal.fields.lastOrder')}</p>
                    <p className="text-sm font-semibold text-gray-900">{formatDate(customer.lastBooking)}</p>
                  </div>
                </div>
              )}

              {customer.createdAt && (
                <div className="flex items-start gap-3 p-4 rounded-[20px] bg-gray-50 border border-gray-200">
                  <div className="h-10 w-10 rounded-[12px] bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <CalendarIcon className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 mb-1">{t('admin.customerDetailModal.fields.accountCreated')}</p>
                    <p className="text-sm font-medium text-gray-900">{formatDate(customer.createdAt)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Ban Reason (if banned) */}
          {customer.status === 'inactive' && customer.banReason && (
            <div className="space-y-4 pt-4 border-t border-red-100">
              <h4 className="text-sm font-semibold text-red-500 uppercase tracking-wider">{t('admin.customerDetailModal.sections.banReason')}</h4>
              <div className="p-4 rounded-[20px] bg-red-50 border border-red-200">
                <p className="text-sm font-medium text-red-900">{customer.banReason}</p>
              </div>
            </div>
          )}

          {/* Role Information */}
          {customer.role && (
            <div className="space-y-4 pt-4 border-t border-gray-100">
              <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{t('admin.customerDetailModal.sections.role')}</h4>
              <div className="p-4 rounded-[20px] bg-gray-50 border border-gray-200">
                <p className="text-sm font-medium text-gray-900">{customer.role}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50/50">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-[20px] bg-[#4c9dff] text-white font-semibold hover:bg-[#3f85d6] transition-all shadow-[0_8px_20px_rgba(76,157,255,0.3)]"
          >
            {t('admin.customerDetailModal.close')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerDetailModal;