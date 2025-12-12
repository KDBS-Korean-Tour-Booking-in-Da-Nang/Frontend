import { useTranslation } from 'react-i18next';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { 
  MapPinIcon, 
  CurrencyDollarIcon, 
  ClockIcon, 
  CalendarIcon, 
  UserIcon,
  BuildingOfficeIcon,
  TruckIcon,
  TagIcon,
  UsersIcon,
  CreditCardIcon,
  CalendarDaysIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import { API_ENDPOINTS, getTourImageUrl } from '../../../config/api';
import { sanitizeHtml } from '../../../utils/sanitizeHtml';

// Helper function to convert HTML to text (same as EditTourModal)
const htmlToText = (html) => {
  if (!html) return '';
  return String(html)
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\s*\/p\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const TourDetailModal = ({ isOpen, onClose, tour, updateRequest = null }) => {
  const { t, i18n } = useTranslation();
  if (!isOpen || !tour) return null;

  // Helper function to parse duration string to get days and nights
  const parseDuration = (durationStr) => {
    if (!durationStr) return { days: 0, nights: 0 };
    const normalized = String(durationStr).toLowerCase().trim();
    const pattern1 = normalized.match(/(\d+)\s*(?:ngày|day|days)\s+(\d+)\s*(?:đêm|night|nights)/i);
    if (pattern1) {
      return {
        days: parseInt(pattern1[1], 10) || 0,
        nights: parseInt(pattern1[2], 10) || 0
      };
    }
    const numbers = normalized.match(/\d+/g);
    if (numbers && numbers.length >= 2) {
      return {
        days: parseInt(numbers[0], 10) || 0,
        nights: parseInt(numbers[1], 10) || 0
      };
    }
    if (numbers && numbers.length === 1) {
      return {
        days: parseInt(numbers[0], 10) || 0,
        nights: 0
      };
    }
    return { days: 0, nights: 0 };
  };

  // Helper function to calculate minAdvancedDays from expiration date
  const calculateMinAdvancedDays = (expirationDate) => {
    if (!expirationDate) return null;
    try {
      const parsed = new Date(`${expirationDate}T00:00:00`);
      if (Number.isNaN(parsed.getTime())) return null;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const utcToday = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
      const utcParsed = Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
      const diff = Math.round((utcParsed - utcToday) / (1000 * 60 * 60 * 24));
      return diff >= 0 ? Math.max(0, diff - 1) : null;
    } catch {
      return null;
    }
  };

  // Helper function to check if a field has changed in update request
  const isFieldChanged = (fieldName) => {
    if (!updateRequest || !updateRequest.originalTour || !updateRequest.updatedTour) return false;
    const original = updateRequest.originalTour;
    const updated = updateRequest.updatedTour;
    
    // Handle nested field access
    const getValue = (obj, path) => {
      const keys = path.split('.');
      let value = obj;
      for (const key of keys) {
        if (value && typeof value === 'object') {
          value = value[key];
        } else {
          return undefined;
        }
      }
      return value;
    };

    let originalValue = getValue(original, fieldName);
    let updatedValue = getValue(updated, fieldName);
    
    // Special handling for tourIntDuration: calculated from duration and nights
    if (fieldName === 'tourIntDuration') {
      const originalDuration = parseDuration(original.tourDuration || '');
      const updatedDuration = parseDuration(updated.tourDuration || '');
      const originalIntDuration = Math.max(originalDuration.days, originalDuration.nights);
      const updatedIntDuration = Math.max(updatedDuration.days, updatedDuration.nights);
      return originalIntDuration !== updatedIntDuration;
    }
    
    // Special handling for minAdvancedDays: calculated from tourExpirationDate
    if (fieldName === 'minAdvancedDays') {
      const originalMinAdv = originalValue !== undefined && originalValue !== null ? Number(originalValue) : null;
      const updatedMinAdv = updatedValue !== undefined && updatedValue !== null ? Number(updatedValue) : null;
      
      // Calculate from expiration dates
      const originalExpiration = original.tourExpirationDate;
      const updatedExpiration = updated.tourExpirationDate;
      
      // If expiration dates are the same, minAdvancedDays should be the same
      if (originalExpiration === updatedExpiration) {
        return false; // No change if expiration date unchanged
      }
      
      // Calculate expected minAdvancedDays from expiration dates
      const calculatedOriginal = calculateMinAdvancedDays(originalExpiration);
      const calculatedUpdated = calculateMinAdvancedDays(updatedExpiration);
      
      // Compare calculated values
      if (calculatedOriginal === null && calculatedUpdated === null) return false;
      if (calculatedOriginal === null || calculatedUpdated === null) return true;
      return calculatedOriginal !== calculatedUpdated;
    }
    
    // Special handling for balancePaymentDays: calculated from minAdvancedDays - tourCheckDays
    if (fieldName === 'balancePaymentDays') {
      // Get minAdvancedDays values (may need to calculate from expiration dates)
      let originalMinAdv = original.minAdvancedDays !== undefined && original.minAdvancedDays !== null ? Number(original.minAdvancedDays) : 0;
      let updatedMinAdv = updated.minAdvancedDays !== undefined && updated.minAdvancedDays !== null ? Number(updated.minAdvancedDays) : 0;
      
      // If expiration dates exist, recalculate minAdvancedDays to ensure accuracy
      if (original.tourExpirationDate) {
        const calculated = calculateMinAdvancedDays(original.tourExpirationDate);
        if (calculated !== null) originalMinAdv = calculated;
      }
      if (updated.tourExpirationDate) {
        const calculated = calculateMinAdvancedDays(updated.tourExpirationDate);
        if (calculated !== null) updatedMinAdv = calculated;
      }
      
      const originalCheckDays = original.tourCheckDays !== undefined && original.tourCheckDays !== null ? Number(original.tourCheckDays) : 0;
      const updatedCheckDays = updated.tourCheckDays !== undefined && updated.tourCheckDays !== null ? Number(updated.tourCheckDays) : 0;
      
      // Calculate expected balancePaymentDays
      const calculatedOriginal = Math.max(0, originalMinAdv - originalCheckDays);
      const calculatedUpdated = Math.max(0, updatedMinAdv - updatedCheckDays);
      
      // Only highlight if the calculated values differ
      // This automatically handles the case where minAdvancedDays or tourCheckDays changed
      return calculatedOriginal !== calculatedUpdated;
    }
    
    // Special handling for tourDescription: normalize HTML to text for comparison
    // EditTourModal sends text, but originalTour may have HTML
    if (fieldName === 'tourDescription') {
      const originalText = htmlToText(originalValue || '');
      const updatedText = htmlToText(updatedValue || '');
      return originalText.trim() !== updatedText.trim();
    }
    
    // Special handling for refundFloor: 
    // refundFloor is readonly in EditTourModal (company cannot change it)
    // It's loaded from database and sent as-is in update request
    // Since company cannot modify it, it should never change in update requests
    // Return false to prevent false positives
    if (fieldName === 'refundFloor') {
      // Company cannot change refundFloor, so it should never be highlighted as changed
      return false;
    }
    
    // For other readonly fields (tourCheckDays, depositPercentage), do normal comparison
    // These fields are readonly but can be set in the form, so we compare directly
    
    // Deep comparison for objects/arrays
    if (typeof originalValue === 'object' || typeof updatedValue === 'object') {
      return JSON.stringify(originalValue) !== JSON.stringify(updatedValue);
    }
    
    return originalValue !== updatedValue;
  };

  // Get changed value for a field
  const getChangedValue = (fieldName) => {
    if (!updateRequest || !updateRequest.updatedTour) return null;
    const keys = fieldName.split('.');
    let value = updateRequest.updatedTour;
    for (const key of keys) {
      if (value && typeof value === 'object') {
        value = value[key];
      } else {
        return null;
      }
    }
    return value;
  };

  const formatPrice = (price) => {
    if (!price) return 'N/A';
    const locale = i18n.language === 'ko' ? 'ko-KR' : i18n.language === 'en' ? 'en-US' : 'vi-VN';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const locale = i18n.language === 'ko' ? 'ko-KR' : i18n.language === 'en' ? 'en-US' : 'vi-VN';
    return new Date(dateString).toLocaleString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatLocalDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      const locale = i18n.language === 'ko' ? 'ko-KR' : i18n.language === 'en' ? 'en-US' : 'vi-VN';
      return date.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatDuration = (duration) => {
    if (!duration) return t('admin.tourDetailModal.fields.duration') || 'N/A';
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
        return t('admin.tourManagement.durationTemplate', { days, nights });
      }
    }
    
    // If can't parse, return as is
    return raw;
  };

  // Field component with change highlighting
  const FieldWithChange = ({ label, value, fieldName, icon: Icon, formatValue = (v) => v }) => {
    const changed = isFieldChanged(fieldName);
    const changedValue = changed ? getChangedValue(fieldName) : null;
    
    return (
      <div className={`bg-gray-50 rounded-[24px] p-4 border ${changed ? 'border-amber-300 bg-amber-50/30' : 'border-gray-200'}`}>
        <div className="flex items-center gap-3 mb-2">
          {Icon && <Icon className={`w-5 h-5 ${changed ? 'text-amber-600' : 'text-blue-600'}`} strokeWidth={1.5} />}
          <div className="flex items-center gap-2">
            <p className="text-sm text-gray-500">{label}</p>
            {changed && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                <ExclamationCircleIcon className="w-3 h-3" />
                {t('admin.tourDetailModal.changed')}
              </span>
            )}
          </div>
        </div>
        <div className="space-y-1">
          <p className={`text-base font-medium ${changed ? 'text-gray-700 line-through' : 'text-gray-900'}`}>
            {formatValue(value)}
          </p>
          {changed && changedValue !== null && (
            <p className="text-base font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
              → {formatValue(changedValue)}
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-[32px] shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">{t('admin.tourDetailModal.title')}</h2>
            {updateRequest && (
              <p className="text-sm text-amber-600 mt-1 flex items-center gap-1">
                <ExclamationCircleIcon className="w-4 h-4" />
                {t('admin.tourDetailModal.viewingUpdateRequest')}
              </p>
            )}
          </div>
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
            <div className={`rounded-[24px] overflow-hidden bg-gray-100 ${isFieldChanged('tourImgPath') ? 'ring-2 ring-amber-400' : ''}`}>
              <img
                src={getTourImageUrl(tour.tourImgPath || tour.thumbnailUrl)}
                alt={tour.title || tour.tourName}
                className="w-full h-64 object-cover"
                onError={(e) => {
                  e.target.src = '/default-Tour.jpg';
                }}
              />
              {isFieldChanged('tourImgPath') && (
                <div className="p-2 bg-amber-100 text-amber-700 text-xs font-semibold text-center">
                  {t('admin.tourDetailModal.imageChanged')}
                </div>
              )}
            </div>
          ) : null}

          {/* Tour Name */}
          <div>
            <h3 className={`text-2xl font-bold mb-2 ${isFieldChanged('tourName') ? 'text-gray-700 line-through' : 'text-gray-900'}`}>
              {tour.title || tour.tourName || 'N/A'}
            </h3>
            {isFieldChanged('tourName') && (
              <p className="text-xl font-semibold text-emerald-600 bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-200 mb-2">
                → {updateRequest?.updatedTour?.tourName || 'N/A'}
              </p>
            )}
            {tour.shortDescription && (
              <p className="text-gray-600 leading-relaxed">{tour.shortDescription}</p>
            )}
            {tour.tourDescription && !tour.shortDescription && (
              <div className="space-y-2">
                <div 
                  className={`text-gray-600 leading-relaxed prose max-w-none ${isFieldChanged('tourDescription') ? 'line-through opacity-50' : ''}`}
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(tour.tourDescription) }}
                />
                {isFieldChanged('tourDescription') && updateRequest?.updatedTour?.tourDescription && (
                  <div className="text-gray-600 leading-relaxed prose max-w-none bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                    <p className="text-emerald-600 font-semibold mb-2">→ {t('admin.tourDetailModal.changed')}</p>
                    {/* Updated description is text from EditTourModal, so render as text with line breaks */}
                    <div className="whitespace-pre-wrap">{updateRequest.updatedTour.tourDescription}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tour ID */}
          <div className="bg-gray-50 rounded-[24px] p-4 border border-gray-200">
            <p className="text-sm text-gray-500 mb-1">{t('admin.tourDetailModal.fields.tourId')}</p>
            <p className="text-lg font-semibold text-gray-900">#{tour.tourId || tour.id}</p>
          </div>

          {/* Basic Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <FieldWithChange
              label={t('admin.tourDetailModal.fields.departurePoint')}
              value={tour.departurePoint || tour.tourDeparturePoint}
              fieldName="tourDeparturePoint"
              icon={MapPinIcon}
            />

            <FieldWithChange
              label={t('admin.tourDetailModal.fields.duration')}
              value={tour.duration || tour.tourDuration}
              fieldName="tourDuration"
              icon={ClockIcon}
              formatValue={formatDuration}
            />

            <FieldWithChange
              label={t('admin.tourDetailModal.fields.adultPrice')}
              value={tour.price || tour.adultPrice}
              fieldName="adultPrice"
              icon={CurrencyDollarIcon}
              formatValue={formatPrice}
            />

            {tour.childrenPrice && (
              <FieldWithChange
                label={t('admin.tourDetailModal.fields.childrenPrice')}
                value={tour.childrenPrice}
                fieldName="childrenPrice"
                icon={CurrencyDollarIcon}
                formatValue={formatPrice}
              />
            )}

            {tour.babyPrice && (
              <FieldWithChange
                label={t('admin.tourDetailModal.fields.babyPrice')}
                value={tour.babyPrice}
                fieldName="babyPrice"
                icon={CurrencyDollarIcon}
                formatValue={formatPrice}
              />
            )}

            <FieldWithChange
              label={t('admin.tourDetailModal.fields.expirationDate')}
              value={tour.tourExpirationDate || tour.expirationDate}
              fieldName="tourExpirationDate"
              icon={CalendarDaysIcon}
              formatValue={formatLocalDate}
            />

            <FieldWithChange
              label={t('admin.tourDetailModal.fields.checkDays')}
              value={tour.tourCheckDays || tour.checkDays}
              fieldName="tourCheckDays"
              icon={CalendarIcon}
            />

            <FieldWithChange
              label={t('admin.tourDetailModal.fields.amount')}
              value={tour.amount}
              fieldName="amount"
              icon={UsersIcon}
              formatValue={(v) => t('admin.tourDetailModal.fields.amountPeople', { amount: v })}
            />
          </div>

          {/* Payment & Booking Details */}
          <div className="space-y-3">
            <h4 className="text-lg font-semibold text-gray-900">{t('admin.tourDetailModal.fields.paymentBooking')}</h4>
            <div className="grid grid-cols-2 gap-3">
              {tour.balancePaymentDays !== undefined && (
                <FieldWithChange
                  label={t('admin.tourDetailModal.fields.balancePaymentDays')}
                  value={tour.balancePaymentDays}
                  fieldName="balancePaymentDays"
                  icon={CreditCardIcon}
                  formatValue={(v) => `${v} ${t('admin.tourDetailModal.fields.days')}`}
                />
              )}

              {tour.minAdvancedDays !== undefined && (
                <FieldWithChange
                  label={t('admin.tourDetailModal.fields.minAdvancedDays')}
                  value={tour.minAdvancedDays}
                  fieldName="minAdvancedDays"
                  icon={CalendarDaysIcon}
                  formatValue={(v) => `${v} ${t('admin.tourDetailModal.fields.days')}`}
                />
              )}

              {tour.depositPercentage !== undefined && (
                <FieldWithChange
                  label={t('admin.tourDetailModal.fields.depositPercentage')}
                  value={tour.depositPercentage}
                  fieldName="depositPercentage"
                  icon={CreditCardIcon}
                  formatValue={(v) => `${v}%`}
                />
              )}

              {tour.refundFloor !== undefined && (
                <FieldWithChange
                  label={t('admin.tourDetailModal.fields.refundFloor')}
                  value={tour.refundFloor}
                  fieldName="refundFloor"
                  icon={CreditCardIcon}
                  formatValue={(v) => `${v}%`}
                />
              )}
            </div>
          </div>

          {/* Additional Info */}
          <div className="space-y-3">
            <h4 className="text-lg font-semibold text-gray-900">{t('admin.tourDetailModal.fields.additionalInfo')}</h4>
            <div className="grid grid-cols-2 gap-3">
              {tour.tourVehicle && (
                <FieldWithChange
                  label={t('admin.tourDetailModal.fields.vehicle')}
                  value={tour.tourVehicle}
                  fieldName="tourVehicle"
                  icon={TruckIcon}
                />
              )}
              {tour.tourType && (
                <FieldWithChange
                  label={t('admin.tourDetailModal.fields.tourType')}
                  value={tour.tourType}
                  fieldName="tourType"
                  icon={TagIcon}
                />
              )}
              {tour.tourIntDuration !== undefined && (
                <FieldWithChange
                  label={t('admin.tourDetailModal.fields.intDuration')}
                  value={tour.tourIntDuration}
                  fieldName="tourIntDuration"
                  icon={ClockIcon}
                  formatValue={(v) => `${v} ${t('admin.tourDetailModal.fields.days')}`}
                />
              )}
            </div>
          </div>

          {/* Tour Contents / Itinerary */}
          {tour.contents && Array.isArray(tour.contents) && tour.contents.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900">{t('admin.tourDetailModal.fields.itinerary')}</h4>
              <div className="space-y-4">
                {tour.contents.map((content, index) => {
                  const contentChanged = isFieldChanged(`contents.${index}`);
                  return (
                    <div 
                      key={index} 
                      className={`rounded-[20px] p-4 border ${contentChanged ? 'border-amber-300 bg-amber-50/30' : 'border-gray-200 bg-gray-50'}`}
                    >
                      {contentChanged && (
                        <div className="mb-2 flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                            <ExclamationCircleIcon className="w-3 h-3" />
                            {t('admin.tourDetailModal.changed')}
                          </span>
                        </div>
                      )}
                      <h5 
                        className="text-lg font-semibold mb-2"
                        style={{ 
                          color: content.dayColor || '#4c9dff',
                          textAlign: content.titleAlignment || 'left'
                        }}
                      >
                        {content.tourContentTitle || `${t('admin.tourDetailModal.fields.day')} ${index + 1}`}
                      </h5>
                      {content.tourContentDescription && (
                        <div 
                          className="prose max-w-none text-gray-700"
                          dangerouslySetInnerHTML={{ __html: sanitizeHtml(content.tourContentDescription) }}
                        />
                      )}
                      {content.images && Array.isArray(content.images) && content.images.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 mt-3">
                          {content.images.map((imgPath, imgIndex) => (
                            <img
                              key={imgIndex}
                              src={getTourImageUrl(imgPath)}
                              alt={`${content.tourContentTitle} - Image ${imgIndex + 1}`}
                              className="w-full h-32 object-cover rounded-lg"
                              onError={(e) => {
                                e.target.src = '/default-Tour.jpg';
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tour Schedule (if contents not available) */}
          {(!tour.contents || tour.contents.length === 0) && tour.tourSchedule && (
            <div className="space-y-3">
              <h4 className="text-lg font-semibold text-gray-900">{t('admin.tourDetailModal.fields.schedule')}</h4>
              <div className="bg-gray-50 rounded-[20px] p-4 border border-gray-200">
                <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                  {typeof tour.tourSchedule === 'string' ? tour.tourSchedule : JSON.stringify(tour.tourSchedule, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Company Info */}
          {tour.companyEmail && (
            <div className="bg-gray-50 rounded-[24px] p-4 border border-gray-200">
              <div className="flex items-center gap-3 mb-2">
                <BuildingOfficeIcon className="w-5 h-5 text-indigo-600" strokeWidth={1.5} />
                <p className="text-sm text-gray-500">{t('admin.tourDetailModal.fields.company')}</p>
              </div>
              <p className="text-base font-medium text-gray-900">{tour.companyEmail}</p>
            </div>
          )}

          {/* Status & Dates */}
          <div className="grid grid-cols-2 gap-4">
            {tour.tourStatus && (
              <div className="bg-gray-50 rounded-[24px] p-4 border border-gray-200">
                <p className="text-sm text-gray-500 mb-2">{t('admin.tourDetailModal.fields.status')}</p>
                <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                  tour.tourStatus === 'PUBLIC' ? 'bg-green-100 text-green-700' :
                  tour.tourStatus === 'NOT_APPROVED' ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {tour.tourStatus}
                </span>
              </div>
            )}

            {tour.createdAt && (
              <div className="bg-gray-50 rounded-[24px] p-4 border border-gray-200">
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

          {/* Update Request Info */}
          {updateRequest && (
            <div className="bg-amber-50 rounded-[24px] p-4 border border-amber-200">
              <h4 className="text-lg font-semibold text-amber-900 mb-3">{t('admin.tourDetailModal.updateRequestInfo')}</h4>
              {updateRequest.companyNote && (
                <div className="mb-3">
                  <p className="text-sm font-medium text-amber-800 mb-1">{t('admin.tourDetailModal.companyNote')}</p>
                  <p className="text-sm text-amber-700">{updateRequest.companyNote}</p>
                </div>
              )}
              {updateRequest.status && (
                <div className="mb-2">
                  <p className="text-sm font-medium text-amber-800 mb-1">{t('admin.tourDetailModal.requestStatus')}</p>
                  <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                    updateRequest.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                    updateRequest.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {updateRequest.status}
                  </span>
                </div>
              )}
              {updateRequest.createdAt && (
                <p className="text-xs text-amber-600">
                  {t('admin.tourDetailModal.requestedAt')}: {formatDate(updateRequest.createdAt)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-6 border-t border-gray-100 bg-gray-50">
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
