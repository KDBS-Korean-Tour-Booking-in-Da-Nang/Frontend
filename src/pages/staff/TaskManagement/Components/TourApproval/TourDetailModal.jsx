import { useTranslation } from 'react-i18next';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { MapPinIcon, CurrencyDollarIcon, ClockIcon, CalendarIcon, UserIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';
import { API_ENDPOINTS, getTourImageUrl } from '../../../../../config/api';

const TourDetailModal = ({ isOpen, onClose, tour, onApprove, onReject }) => {
  const { t, i18n } = useTranslation();
  
  if (!isOpen || !tour) return null;

  const formatPrice = (price) => {
    if (!price) return t('admin.tourApproval.status.na');
    const locale = i18n.language === 'ko' ? 'ko-KR' : i18n.language === 'en' ? 'en-US' : 'vi-VN';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  const formatDate = (dateString) => {
    if (!dateString) return t('admin.tourApproval.status.na');
    try {
      const date = new Date(dateString);
      const locale = i18n.language === 'ko' ? 'ko-KR' : i18n.language === 'en' ? 'en-US' : 'vi-VN';
      return date.toLocaleString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const formatDuration = (duration) => {
    if (!duration) return t('admin.tourApproval.status.na');
    const raw = String(duration);
    
    // Try to parse "X ngày Y đêm" or "X days Y nights" or "X일 Y박" format
    const viMatch = raw.match(/(\d+)\s*ngày\s*(\d+)\s*đêm/i);
    const enMatch = raw.match(/(\d+)\s*days?\s*(\d+)\s*nights?/i);
    const koMatch = raw.match(/(\d+)\s*일\s*(\d+)\s*박/i);
    const genericMatch = raw.match(/(\d+)\D+(\d+)/);
    
    const match = viMatch || enMatch || koMatch || genericMatch;
    
    if (match) {
      const days = parseInt(match[1], 10);
      const nights = parseInt(match[2], 10);
      if (Number.isFinite(days) && Number.isFinite(nights)) {
        return t('admin.tourApproval.durationTemplate', { days, nights });
      }
    }
    
    // If can't parse, return as is
    return raw;
  };

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
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-2xl font-semibold text-gray-900">{t('admin.tourDetailModal.title')}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-[20px] hover:bg-gray-50 transition-colors text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Tour Image */}
          {tour.tourImgPath || tour.thumbnailUrl ? (
            <div className="rounded-[24px] overflow-hidden bg-gray-100">
              <img
                src={getTourImageUrl(tour.tourImgPath || tour.thumbnailUrl)}
                alt={tour.title || tour.tourName}
                className="w-full h-64 object-cover"
                onError={(e) => {
                  e.target.src = '/default-Tour.jpg';
                }}
              />
            </div>
          ) : null}

          {/* Tour Name */}
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {tour.title || tour.tourName || 'N/A'}
            </h3>
            {tour.shortDescription && (
              <p className="text-gray-600 leading-relaxed">{tour.shortDescription}</p>
            )}
            {tour.tourDescription && !tour.shortDescription && (
              <p className="text-gray-600 leading-relaxed">{tour.tourDescription}</p>
            )}
          </div>

          {/* Tour ID */}
          <div className="bg-gray-50 rounded-[24px] p-4">
            <p className="text-sm text-gray-500 mb-1">{t('admin.tourDetailModal.fields.tourId')}</p>
            <p className="text-lg font-semibold text-gray-900">#{tour.tourId || tour.id}</p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            {tour.departurePoint && (
              <div className="bg-blue-50 rounded-[24px] p-4 border border-blue-100">
                <div className="flex items-center gap-3 mb-2">
                  <MapPinIcon className="w-5 h-5 text-blue-600" strokeWidth={1.5} />
                  <p className="text-sm text-gray-500">{t('admin.tourDetailModal.fields.departurePoint')}</p>
                </div>
                <p className="text-base font-medium text-gray-900">{tour.departurePoint}</p>
              </div>
            )}

            {(tour.price || tour.adultPrice) && (
              <div className="bg-green-50 rounded-[24px] p-4 border border-green-100">
                <div className="flex items-center gap-3 mb-2">
                  <CurrencyDollarIcon className="w-5 h-5 text-green-600" strokeWidth={1.5} />
                  <p className="text-sm text-gray-500">{t('admin.tourDetailModal.fields.adultPrice')}</p>
                </div>
                <p className="text-base font-semibold text-green-700">
                  {formatPrice(tour.price || tour.adultPrice)}
                </p>
                {tour.childrenPrice && (
                  <p className="text-sm text-gray-600 mt-1">
                    {t('admin.tourDetailModal.fields.childrenPrice', { price: formatPrice(tour.childrenPrice) })}
                  </p>
                )}
                {tour.babyPrice && (
                  <p className="text-sm text-gray-600">
                    {t('admin.tourDetailModal.fields.babyPrice', { price: formatPrice(tour.babyPrice) })}
                  </p>
                )}
              </div>
            )}

            {(tour.duration || tour.tourDuration) && (
              <div className="bg-purple-50 rounded-[24px] p-4 border border-purple-100">
                <div className="flex items-center gap-3 mb-2">
                  <ClockIcon className="w-5 h-5 text-purple-600" strokeWidth={1.5} />
                  <p className="text-sm text-gray-500">{t('admin.tourDetailModal.fields.duration')}</p>
                </div>
                <p className="text-base font-medium text-gray-900">
                  {formatDuration(tour.duration || tour.tourDuration)}
                </p>
              </div>
            )}

            {tour.createdAt && (
              <div className="bg-amber-50 rounded-[24px] p-4 border border-amber-100">
                <div className="flex items-center gap-3 mb-2">
                  <CalendarIcon className="w-5 h-5 text-amber-600" strokeWidth={1.5} />
                  <p className="text-sm text-gray-500">{t('admin.tourDetailModal.fields.createdAt')}</p>
                </div>
                <p className="text-base font-medium text-gray-900">
                  {formatDate(tour.createdAt)}
                </p>
              </div>
            )}
          </div>

          {/* Additional Info */}
          {(tour.tourVehicle || tour.tourType || tour.amount) && (
            <div className="space-y-3">
              <h4 className="text-lg font-semibold text-gray-900">{t('admin.tourDetailModal.fields.additionalInfo')}</h4>
              <div className="grid grid-cols-2 gap-3">
                {tour.tourVehicle && (
                  <div className="bg-gray-50 rounded-[20px] p-3">
                    <p className="text-xs text-gray-500 mb-1">{t('admin.tourDetailModal.fields.vehicle')}</p>
                    <p className="text-sm font-medium text-gray-900">{tour.tourVehicle}</p>
                  </div>
                )}
                {tour.tourType && (
                  <div className="bg-gray-50 rounded-[20px] p-3">
                    <p className="text-xs text-gray-500 mb-1">{t('admin.tourDetailModal.fields.tourType')}</p>
                    <p className="text-sm font-medium text-gray-900">{tour.tourType}</p>
                  </div>
                )}
                {tour.amount && (
                  <div className="bg-gray-50 rounded-[20px] p-3">
                    <p className="text-xs text-gray-500 mb-1">{t('admin.tourDetailModal.fields.amount')}</p>
                    <p className="text-sm font-medium text-gray-900">{t('admin.tourDetailModal.fields.amountPeople', { amount: tour.amount })}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Company Info */}
          {tour.companyEmail && (
            <div className="bg-indigo-50 rounded-[24px] p-4 border border-indigo-100">
              <div className="flex items-center gap-3 mb-2">
                <UserIcon className="w-5 h-5 text-indigo-600" strokeWidth={1.5} />
                <p className="text-sm text-gray-500">{t('admin.tourDetailModal.fields.company')}</p>
              </div>
              <p className="text-base font-medium text-gray-900">{tour.companyEmail}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50">
          {tour.tourStatus === 'NOT_APPROVED' && onApprove && onReject && (
            <>
              <button
                onClick={() => {
                  if (window.confirm(t('admin.tourDetailModal.actions.confirmReject'))) {
                    onReject();
                  }
                }}
                className="px-6 py-2.5 rounded-[24px] text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-all shadow-[0_8px_20px_rgba(239,68,68,0.3)] flex items-center gap-2"
              >
                <XCircleIcon className="w-4 h-4" />
                {t('admin.tourDetailModal.actions.reject')}
              </button>
              <button
                onClick={() => {
                  if (window.confirm(t('admin.tourDetailModal.actions.confirmApprove'))) {
                    onApprove();
                  }
                }}
                className="px-6 py-2.5 rounded-[24px] text-sm font-semibold text-white bg-green-500 hover:bg-green-600 transition-all shadow-[0_8px_20px_rgba(34,197,94,0.3)] flex items-center gap-2"
              >
                <CheckCircleIcon className="w-4 h-4" />
                {t('admin.tourDetailModal.actions.approve')}
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-[24px] text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 transition-colors"
          >
            {t('admin.tourDetailModal.close')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TourDetailModal;
