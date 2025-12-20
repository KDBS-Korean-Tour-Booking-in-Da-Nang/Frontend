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
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';
import { API_ENDPOINTS, getTourImageUrl } from '../../../../../config/api';
import { sanitizeHtml } from '../../../../../utils/sanitizeHtml';

// Helper function để convert HTML sang text: replace br tags với newline, replace closing p tags với newline, remove tất cả HTML tags, collapse multiple newlines, trim
const htmlToText = (html) => {
  if (!html) return '';
  return String(html)
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\s*\/p\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const TourDetailModal = ({ isOpen, onClose, tour, onApprove, onReject, updateRequest = null }) => {
  const { t, i18n } = useTranslation();
  
  if (!isOpen || !tour) return null;

  // Khi viewing update request: dùng originalTour để display (để compare với updatedTour), nếu không thì dùng tour được provide
  const displayTour = updateRequest?.originalTour || tour;

  // Helper function để parse duration string lấy days và nights: parse "X ngày Y đêm" hoặc "X days Y nights" format, return { days, nights }
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

  // Helper function để tính minAdvancedDays từ expiration date: parse expirationDate, tính diff với today, return diff - 1 nếu >= 0, return null nếu không hợp lệ
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

  // Helper function để normalize values cho comparison: trim string, return null nếu null/undefined, return value as-is cho number/boolean
  const normalizeValue = (value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number') return value;
    if (typeof value === 'boolean') return value;
    return value;
  };

  // Helper function để compare hai values (handle numbers, strings, dates): normalize values, handle null/undefined, handle numbers (allow small floating point differences), handle strings, default comparison
  const compareValues = (val1, val2) => {
    const norm1 = normalizeValue(val1);
    const norm2 = normalizeValue(val2);
    
    if (norm1 === null && norm2 === null) return true;
    if (norm1 === null || norm2 === null) return false;
    
    // Handle numbers (including BigDecimal which might be strings)
    const num1 = typeof norm1 === 'string' && !isNaN(norm1) && !isNaN(parseFloat(norm1)) ? parseFloat(norm1) : norm1;
    const num2 = typeof norm2 === 'string' && !isNaN(norm2) && !isNaN(parseFloat(norm2)) ? parseFloat(norm2) : norm2;
    if (typeof num1 === 'number' && typeof num2 === 'number') {
      return Math.abs(num1 - num2) < 0.01;
    }
    
    if (typeof norm1 === 'string' && typeof norm2 === 'string') {
      return norm1 === norm2;
    }
    
    return norm1 === norm2;
  };

  // Helper function để lấy value từ original tour (TourResponse) hoặc updated tour (TourRequest): handle field name differences giữa TourResponse và TourRequest, try cả hai field names
  const getOriginalValue = (original, fieldName) => {
    switch (fieldName) {
      case 'tourName':
        return original.tourName || original.title;
      case 'tourDescription':
        return original.tourDescription || original.description;
      case 'tourDeparturePoint':
        return original.tourDeparturePoint || original.departurePoint;
      case 'tourDuration':
        return original.tourDuration || original.duration;
      case 'tourExpirationDate':
        return original.tourExpirationDate || original.expirationDate;
      case 'tourCheckDays':
        return original.tourCheckDays || original.checkDays;
      case 'tourVehicle':
        return original.tourVehicle || original.vehicle;
      case 'tourType':
        return original.tourType || original.type;
      case 'adultPrice':
        return original.adultPrice || original.price;
      case 'tourSchedule':
        return original.tourSchedule || original.schedule;
      default:
        return original[fieldName];
    }
  };

  // Helper function để check nếu field đã thay đổi trong update request: exclude readonly fields (refundFloor, companyEmail), get values với proper field mapping, special handling cho tourIntDuration (calculated từ duration và nights), minAdvancedDays (calculated từ tourExpirationDate), balancePaymentDays (calculated từ minAdvancedDays - tourCheckDays), tourDescription (normalize HTML to text)
  const isFieldChanged = (fieldName) => {
    if (!updateRequest || !updateRequest.originalTour || !updateRequest.updatedTour) return false;
    const original = updateRequest.originalTour;
    const updated = updateRequest.updatedTour;
    
    const readonlyFields = ['refundFloor', 'companyEmail'];
    if (readonlyFields.includes(fieldName)) {
      return false;
    }
    
    let originalValue = getOriginalValue(original, fieldName);
    let updatedValue = updated[fieldName];
    
    if (fieldName === 'tourIntDuration') {
      const originalDuration = original.tourDuration || '';
      const updatedDuration = updated.tourDuration || '';
      if (originalDuration === updatedDuration) return false;
      
      const originalParsed = parseDuration(originalDuration);
      const updatedParsed = parseDuration(updatedDuration);
      const originalIntDuration = Math.max(originalParsed.days, originalParsed.nights);
      const updatedIntDuration = Math.max(updatedParsed.days, updatedParsed.nights);
      return originalIntDuration !== updatedIntDuration;
    }
    
    // Special handling for minAdvancedDays: calculated from tourExpirationDate
    if (fieldName === 'minAdvancedDays') {
      const originalExpiration = original.tourExpirationDate;
      const updatedExpiration = updated.tourExpirationDate;
      
      if (originalExpiration === updatedExpiration) {
        return false;
      }
      
      // Calculate expected minAdvancedDays from expiration dates
      const calculatedOriginal = calculateMinAdvancedDays(originalExpiration);
      const calculatedUpdated = calculateMinAdvancedDays(updatedExpiration);
      
      if (calculatedOriginal === null && calculatedUpdated === null) return false;
      if (calculatedOriginal === null || calculatedUpdated === null) return true;
      return calculatedOriginal !== calculatedUpdated;
    }
    
    if (fieldName === 'balancePaymentDays') {
      const originalExpiration = original.tourExpirationDate;
      const updatedExpiration = updated.tourExpirationDate;
      const originalCheckDays = original.tourCheckDays !== undefined && original.tourCheckDays !== null ? Number(original.tourCheckDays) : 0;
      const updatedCheckDays = updated.tourCheckDays !== undefined && updated.tourCheckDays !== null ? Number(updated.tourCheckDays) : 0;
      
      if (originalExpiration === updatedExpiration && originalCheckDays === updatedCheckDays) {
        return false;
      }
      
      let originalMinAdv = original.minAdvancedDays !== undefined && original.minAdvancedDays !== null ? Number(original.minAdvancedDays) : 0;
      let updatedMinAdv = updated.minAdvancedDays !== undefined && updated.minAdvancedDays !== null ? Number(updated.minAdvancedDays) : 0;
      
      if (originalExpiration) {
        const calculated = calculateMinAdvancedDays(originalExpiration);
        if (calculated !== null) originalMinAdv = calculated;
      }
      if (updatedExpiration) {
        const calculated = calculateMinAdvancedDays(updatedExpiration);
        if (calculated !== null) updatedMinAdv = calculated;
      }
      
      const calculatedOriginal = Math.max(0, originalMinAdv - originalCheckDays);
      const calculatedUpdated = Math.max(0, updatedMinAdv - updatedCheckDays);
      
      return calculatedOriginal !== calculatedUpdated;
    }
    
    if (fieldName === 'tourDescription') {
      const originalText = htmlToText(originalValue || '');
      const updatedText = String(updatedValue || '').trim();
      return originalText.trim() !== updatedText;
    }
    
    // Special handling for tourName: compare directly (case-sensitive)
    if (fieldName === 'tourName') {
      // Try to get from both possible field names in original
      const origName = String(original.tourName || original.title || originalValue || '').trim();
      const updName = String(updatedValue || updated.tourName || '').trim();
      return origName !== updName;
    }
    
    if (fieldName === 'tourImgPath') {
      const originalPath = original.tourImgPath || original.thumbnailUrl || '';
      const updatedPath = updateRequest?.updatedImagePath || '';
      if (!updatedPath) return false;
      return originalPath !== updatedPath;
    }
    
    if (fieldName === 'tourSchedule') {
      // Get original value from multiple possible locations
      const origSchedule = original.tourSchedule || original.schedule || originalValue || '';
      const originalStr = origSchedule ? String(origSchedule).trim() : '';
      const updatedStr = updatedValue ? String(updatedValue).trim() : '';
      if (!originalStr && !updatedStr) return false;
      if (!originalStr || !updatedStr) return true;
      return originalStr !== updatedStr;
    }
    
    if (fieldName === 'adultPrice' || fieldName === 'childrenPrice' || fieldName === 'babyPrice') {
      const origNum = originalValue !== null && originalValue !== undefined ? parseFloat(originalValue) : null;
      const updNum = updatedValue !== null && updatedValue !== undefined ? parseFloat(updatedValue) : null;
      if (origNum === null && updNum === null) return false;
      if (origNum === null || updNum === null) return true;
      return Math.abs(origNum - updNum) >= 0.01;
    }
    
    if (fieldName === 'amount' || fieldName === 'tourCheckDays' || fieldName === 'depositPercentage') {
      const origNum = originalValue !== null && originalValue !== undefined ? Number(originalValue) : null;
      const updNum = updatedValue !== null && updatedValue !== undefined ? Number(updatedValue) : null;
      if (origNum === null && updNum === null) return false;
      if (origNum === null || updNum === null) return true;
      return origNum !== updNum;
    }
    
    if (typeof originalValue === 'object' || typeof updatedValue === 'object') {
      if (Array.isArray(originalValue) || Array.isArray(updatedValue)) {
        if (!Array.isArray(originalValue) || !Array.isArray(updatedValue)) return true;
        if (originalValue.length !== updatedValue.length) return true;
        return JSON.stringify(originalValue) !== JSON.stringify(updatedValue);
      }
      return JSON.stringify(originalValue) !== JSON.stringify(updatedValue);
    }
    
    // Default string/number comparison
    return !compareValues(originalValue, updatedValue);
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
    if (!price) return t('admin.tourApproval.status.na');
    const locale = i18n.language === 'ko' ? 'ko-KR' : i18n.language === 'en' ? 'en-US' : 'vi-VN';
    const formatted = new Intl.NumberFormat(locale, {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
    return `${formatted} đ`;
  };

  // Format price for optional fields (childrenPrice, babyPrice) - show "0đ" instead of "N/A"
  const formatOptionalPrice = (price) => {
    const priceNum = price !== undefined && price !== null ? Number(price) : 0;
    const locale = i18n.language === 'ko' ? 'ko-KR' : i18n.language === 'en' ? 'en-US' : 'vi-VN';
    const formatted = new Intl.NumberFormat(locale, {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(priceNum);
    return `${formatted} đ`;
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

  const formatLocalDate = (dateString) => {
    if (!dateString) return t('admin.tourApproval.status.na');
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

  // Field component with change highlighting
  const FieldWithChange = ({ label, value, fieldName, icon: Icon, formatValue = (v) => v }) => {
    const changed = isFieldChanged(fieldName);
    const changedValue = changed ? getChangedValue(fieldName) : null;
    
    return (
      <div className={`rounded-[24px] p-4 border-2 transition-all ${
        changed 
          ? 'border-amber-400 bg-amber-50 shadow-[0_4px_12px_rgba(251,191,36,0.3)] ring-2 ring-amber-200 ring-opacity-50' 
          : 'border-gray-200 bg-gray-50'
      }`}>
        <div className="flex items-center gap-3 mb-2">
          {Icon && <Icon className={`w-5 h-5 ${changed ? 'text-amber-600' : 'text-blue-600'}`} strokeWidth={1.5} />}
          <div className="flex items-center gap-2 flex-1">
            <p className={`text-sm font-medium ${changed ? 'text-amber-900' : 'text-gray-500'}`}>{label}</p>
            {changed && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-200 text-amber-800 text-xs font-bold shadow-sm">
                <ExclamationCircleIcon className="w-3 h-3" />
                {t('admin.tourDetailModal.changed')}
              </span>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <p className={`text-base font-medium ${changed ? 'text-gray-600 line-through decoration-2 decoration-amber-500' : 'text-gray-900'}`}>
            {formatValue(value)}
          </p>
          {changed && changedValue !== null && (
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-300 px-3 py-2 rounded-lg shadow-sm">
              <p className="text-base font-bold text-emerald-700">
                → {formatValue(changedValue)}
              </p>
            </div>
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
          {(displayTour.tourImgPath || displayTour.thumbnailUrl || updateRequest?.updatedImagePath) ? (
            <div className={`rounded-[24px] overflow-hidden border-2 transition-all ${
              isFieldChanged('tourImgPath') 
                ? 'border-amber-400 bg-amber-50 shadow-[0_4px_12px_rgba(251,191,36,0.3)] ring-2 ring-amber-200 ring-opacity-50' 
                : 'border-gray-200 bg-gray-100'
            }`}>
              <div className="relative">
                <img
                  src={getTourImageUrl(displayTour.tourImgPath || displayTour.thumbnailUrl || '')}
                  alt={displayTour.title || displayTour.tourName}
                  className="w-full h-64 object-cover"
                  onError={(e) => {
                    e.target.src = '/default-Tour.jpg';
                  }}
                />
                {isFieldChanged('tourImgPath') && (
                  <div className="absolute top-2 right-2">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-200 text-amber-800 text-xs font-bold shadow-sm">
                      <ExclamationCircleIcon className="w-3 h-3" />
                      {t('admin.tourDetailModal.changed')}
                    </span>
                  </div>
                )}
              </div>
              {isFieldChanged('tourImgPath') && updateRequest?.updatedImagePath && (
                <div className="p-3 bg-gradient-to-r from-emerald-50 to-green-50 border-t-2 border-emerald-300">
                  <p className="text-emerald-700 font-bold text-sm mb-2">→ {t('admin.tourDetailModal.imageChanged')}</p>
                  <img
                    src={getTourImageUrl(updateRequest.updatedImagePath)}
                    alt="New tour image"
                    className="w-full h-64 object-cover rounded-lg"
                    onError={(e) => {
                      e.target.src = '/default-Tour.jpg';
                    }}
                  />
                </div>
              )}
            </div>
          ) : null}

          {/* Tour Name */}
          <div className={`rounded-[24px] p-4 border-2 transition-all ${
            isFieldChanged('tourName') 
              ? 'border-amber-400 bg-amber-50 shadow-[0_4px_12px_rgba(251,191,36,0.3)] ring-2 ring-amber-200 ring-opacity-50' 
              : 'border-transparent'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <h3 className={`text-2xl font-bold ${isFieldChanged('tourName') ? 'text-amber-900' : 'text-gray-900'}`}>
                {displayTour.title || displayTour.tourName || 'N/A'}
              </h3>
              {isFieldChanged('tourName') && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-200 text-amber-800 text-xs font-bold shadow-sm">
                  <ExclamationCircleIcon className="w-3 h-3" />
                  {t('admin.tourDetailModal.changed')}
                </span>
              )}
            </div>
            {isFieldChanged('tourName') && (
              <div className="bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-300 px-4 py-3 rounded-lg shadow-sm mt-2">
                <p className="text-xl font-bold text-emerald-700">
                  → {updateRequest?.updatedTour?.tourName || 'N/A'}
                </p>
              </div>
            )}
            {displayTour.shortDescription && (
              <p className="text-gray-600 leading-relaxed">{displayTour.shortDescription}</p>
            )}
            {displayTour.tourDescription && !displayTour.shortDescription && (
              <div className={`space-y-2 rounded-[24px] p-4 border-2 transition-all ${
                isFieldChanged('tourDescription') 
                  ? 'border-amber-400 bg-amber-50 shadow-[0_4px_12px_rgba(251,191,36,0.3)] ring-2 ring-amber-200 ring-opacity-50' 
                  : 'border-transparent'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-gray-500">{t('admin.tourDetailModal.fields.description')}</span>
                  {isFieldChanged('tourDescription') && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-200 text-amber-800 text-xs font-bold shadow-sm">
                      <ExclamationCircleIcon className="w-3 h-3" />
                      {t('admin.tourDetailModal.changed')}
                    </span>
                  )}
                </div>
                <div 
                  className={`text-gray-600 leading-relaxed prose max-w-none ${isFieldChanged('tourDescription') ? 'line-through decoration-2 decoration-amber-500 opacity-60' : ''}`}
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(displayTour.tourDescription) }}
                />
                {isFieldChanged('tourDescription') && updateRequest?.updatedTour?.tourDescription && (
                  <div className="bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-300 rounded-lg p-4 shadow-sm mt-2">
                    <p className="text-emerald-700 font-bold mb-2 text-sm">→ {t('admin.tourDetailModal.changed')}</p>
                    {/* Updated description is text from EditTourModal, so render as text with line breaks */}
                    <div className="whitespace-pre-wrap text-gray-800">{updateRequest.updatedTour.tourDescription}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tour ID */}
          <div className="bg-gray-50 rounded-[24px] p-4 border border-gray-200">
            <p className="text-sm text-gray-500 mb-1">{t('admin.tourDetailModal.fields.tourId')}</p>
            <p className="text-lg font-semibold text-gray-900">#{displayTour.tourId || displayTour.id}</p>
          </div>

          {/* Basic Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <FieldWithChange
              label={t('admin.tourDetailModal.fields.departurePoint')}
              value={displayTour.departurePoint || displayTour.tourDeparturePoint}
              fieldName="tourDeparturePoint"
              icon={MapPinIcon}
            />

            <FieldWithChange
              label={t('admin.tourDetailModal.fields.duration')}
              value={displayTour.duration || displayTour.tourDuration}
              fieldName="tourDuration"
              icon={ClockIcon}
              formatValue={formatDuration}
            />

            <FieldWithChange
              label={t('admin.tourDetailModal.fields.adultPrice')}
              value={displayTour.price || displayTour.adultPrice}
              fieldName="adultPrice"
              icon={CurrencyDollarIcon}
              formatValue={formatPrice}
            />

            <FieldWithChange
              label={t('admin.tourDetailModal.fields.childrenPrice')}
              value={displayTour.childrenPrice ?? 0}
              fieldName="childrenPrice"
              icon={CurrencyDollarIcon}
              formatValue={formatOptionalPrice}
            />

            <FieldWithChange
              label={t('admin.tourDetailModal.fields.babyPrice')}
              value={displayTour.babyPrice ?? 0}
              fieldName="babyPrice"
              icon={CurrencyDollarIcon}
              formatValue={formatOptionalPrice}
            />

            <FieldWithChange
              label={t('admin.tourDetailModal.fields.expirationDate')}
              value={displayTour.tourExpirationDate || displayTour.expirationDate}
              fieldName="tourExpirationDate"
              icon={CalendarDaysIcon}
              formatValue={formatLocalDate}
            />

            <FieldWithChange
              label={t('admin.tourDetailModal.fields.checkDays')}
              value={displayTour.tourCheckDays || displayTour.checkDays}
              fieldName="tourCheckDays"
              icon={CalendarIcon}
            />

            {(displayTour.amount !== undefined && displayTour.amount !== null) && (
              <FieldWithChange
                label={t('admin.tourDetailModal.fields.amount')}
                value={displayTour.amount}
                fieldName="amount"
                icon={UsersIcon}
                formatValue={(v) => t('admin.tourDetailModal.fields.amountPeople', { amount: v })}
              />
            )}
          </div>

          {/* Payment & Booking Details */}
          <div className="space-y-3">
            <h4 className="text-lg font-semibold text-gray-900">{t('admin.tourDetailModal.fields.paymentBooking')}</h4>
            <div className="grid grid-cols-2 gap-3">
              {(displayTour.balancePaymentDays !== undefined && displayTour.balancePaymentDays !== null) && (
                <FieldWithChange
                  label={t('admin.tourDetailModal.fields.balancePaymentDays')}
                  value={displayTour.balancePaymentDays}
                  fieldName="balancePaymentDays"
                  icon={CreditCardIcon}
                  formatValue={(v) => `${v} ${t('admin.tourDetailModal.fields.days')}`}
                />
              )}

              {(displayTour.minAdvancedDays !== undefined && displayTour.minAdvancedDays !== null) && (
                <FieldWithChange
                  label={t('admin.tourDetailModal.fields.minAdvancedDays')}
                  value={displayTour.minAdvancedDays}
                  fieldName="minAdvancedDays"
                  icon={CalendarDaysIcon}
                  formatValue={(v) => `${v} ${t('admin.tourDetailModal.fields.days')}`}
                />
              )}

              {(displayTour.depositPercentage !== undefined && displayTour.depositPercentage !== null) && (
                <FieldWithChange
                  label={t('admin.tourDetailModal.fields.depositPercentage')}
                  value={displayTour.depositPercentage}
                  fieldName="depositPercentage"
                  icon={CreditCardIcon}
                  formatValue={(v) => `${v}%`}
                />
              )}

              {(displayTour.refundFloor !== undefined && displayTour.refundFloor !== null) && (
                <FieldWithChange
                  label={t('admin.tourDetailModal.fields.refundFloor')}
                  value={displayTour.refundFloor}
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
              {displayTour.tourVehicle && (
                <FieldWithChange
                  label={t('admin.tourDetailModal.fields.vehicle')}
                  value={displayTour.tourVehicle}
                  fieldName="tourVehicle"
                  icon={TruckIcon}
                />
              )}
              {displayTour.tourType && (
                <FieldWithChange
                  label={t('admin.tourDetailModal.fields.tourType')}
                  value={displayTour.tourType}
                  fieldName="tourType"
                  icon={TagIcon}
                />
              )}
              {(displayTour.tourIntDuration !== undefined && displayTour.tourIntDuration !== null) && (
                <FieldWithChange
                  label={t('admin.tourDetailModal.fields.intDuration')}
                  value={displayTour.tourIntDuration}
                  fieldName="tourIntDuration"
                  icon={ClockIcon}
                  formatValue={(v) => `${v} ${t('admin.tourDetailModal.fields.days')}`}
                />
              )}
            </div>
          </div>

          {/* Tour Contents / Itinerary */}
          {displayTour.contents && Array.isArray(displayTour.contents) && displayTour.contents.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900">{t('admin.tourDetailModal.fields.itinerary')}</h4>
              <div className="space-y-4">
                {displayTour.contents.map((content, index) => {
                  // Check if this content item has changed
                  const originalContents = updateRequest?.originalTour?.contents || [];
                  const updatedContents = updateRequest?.updatedTour?.contents || [];
                  const originalContent = originalContents[index];
                  const updatedContent = updatedContents[index];
                  
                  // Check if content item changed (exists in both, or length changed, or content different)
                  let contentChanged = false;
                  if (updateRequest) {
                    // Only compare if we have both original and updated contents
                    if (originalContents.length !== updatedContents.length) {
                      // Length changed - only items at or after the shorter length are considered changed
                      // Items before the change should remain unchanged
                      contentChanged = index >= Math.min(originalContents.length, updatedContents.length);
                    } else if (index < originalContents.length && index < updatedContents.length) {
                      // Both exist at this index, compare individual fields
                      if (originalContent && updatedContent) {
                        // Normalize title for comparison
                        const origTitle = String(originalContent.tourContentTitle || '').trim();
                        const updTitle = String(updatedContent.tourContentTitle || '').trim();
                        const titleChanged = origTitle !== updTitle;
                        
                        // Normalize description for comparison (both to text)
                        const origDesc = htmlToText(originalContent.tourContentDescription || '').trim();
                        const updDesc = htmlToText(updatedContent.tourContentDescription || '').trim();
                        const descChanged = origDesc !== updDesc;
                        
                        // Compare images arrays
                        const origImages = JSON.stringify((originalContent.images || []).sort());
                        const updImages = JSON.stringify((updatedContent.images || []).sort());
                        const imagesChanged = origImages !== updImages;
                        
                        // Compare color (normalize field names)
                        const origColor = String(originalContent.dayColor || originalContent.day_color || '').trim();
                        const updColor = String(updatedContent.dayColor || '').trim();
                        const colorChanged = origColor !== updColor;
                        
                        // Compare alignment (normalize field names)
                        const origAlignment = String(originalContent.titleAlignment || originalContent.title_alignment || '').trim();
                        const updAlignment = String(updatedContent.titleAlignment || '').trim();
                        const alignmentChanged = origAlignment !== updAlignment;
                        
                        // Only mark as changed if at least one field actually changed
                        contentChanged = titleChanged || descChanged || imagesChanged || colorChanged || alignmentChanged;
                      }
                    }
                    // If one exists but not the other, it's a change (handled by length check above)
                  }
                  
                  return (
                    <div 
                      key={index} 
                      className={`rounded-[20px] p-4 border-2 transition-all ${
                        contentChanged 
                          ? 'border-amber-400 bg-amber-50 shadow-[0_4px_12px_rgba(251,191,36,0.3)] ring-2 ring-amber-200 ring-opacity-50' 
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      {contentChanged && (
                        <div className="mb-3 flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-200 text-amber-800 text-xs font-bold shadow-sm">
                            <ExclamationCircleIcon className="w-3 h-3" />
                            {t('admin.tourDetailModal.changed')}
                          </span>
                        </div>
                      )}
                      <h5 
                        className={`text-lg font-semibold mb-2 ${
                          contentChanged && updatedContent && originalContent && 
                          String(originalContent.tourContentTitle || '').trim() !== String(updatedContent.tourContentTitle || '').trim()
                            ? 'line-through decoration-2 decoration-amber-500 text-gray-500' 
                            : ''
                        }`}
                        style={{ 
                          color: contentChanged && updatedContent?.dayColor && originalContent && 
                                 String(originalContent.dayColor || originalContent.day_color || '').trim() !== String(updatedContent.dayColor || '').trim()
                                 ? updatedContent.dayColor : (content.dayColor || '#4c9dff'),
                          textAlign: contentChanged && updatedContent?.titleAlignment && originalContent &&
                                    String(originalContent.titleAlignment || originalContent.title_alignment || '').trim() !== String(updatedContent.titleAlignment || '').trim()
                                    ? updatedContent.titleAlignment : (content.titleAlignment || 'left')
                        }}
                      >
                        {content.tourContentTitle || `${t('admin.tourDetailModal.fields.day')} ${index + 1}`}
                      </h5>
                      {contentChanged && updatedContent && originalContent && 
                       String(originalContent.tourContentTitle || '').trim() !== String(updatedContent.tourContentTitle || '').trim() && (
                        <div className="bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-300 rounded-lg p-3 mb-2 shadow-sm">
                          <h5 
                            className="text-lg font-bold text-emerald-700"
                            style={{ 
                              color: updatedContent.dayColor || '#059669',
                              textAlign: updatedContent.titleAlignment || 'left'
                            }}
                          >
                            → {updatedContent.tourContentTitle}
                          </h5>
                        </div>
                      )}
                      {content.tourContentDescription && (
                        <div className="space-y-2">
                          <div 
                            className={`prose max-w-none text-gray-700 ${
                              contentChanged && updatedContent && originalContent && 
                              htmlToText(originalContent.tourContentDescription || '').trim() !== htmlToText(updatedContent.tourContentDescription || '').trim()
                                ? 'line-through decoration-2 decoration-amber-500 opacity-60' 
                                : ''
                            }`}
                            dangerouslySetInnerHTML={{ __html: sanitizeHtml(content.tourContentDescription) }}
                          />
                          {contentChanged && updatedContent?.tourContentDescription && originalContent && 
                           htmlToText(originalContent.tourContentDescription || '').trim() !== htmlToText(updatedContent.tourContentDescription || '').trim() && (
                            <div className="bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-300 rounded-lg p-4 shadow-sm">
                              <p className="text-emerald-700 font-bold mb-2 text-sm">→ {t('admin.tourDetailModal.changed')}</p>
                              <div className="whitespace-pre-wrap text-gray-800">{htmlToText(updatedContent.tourContentDescription)}</div>
                            </div>
                          )}
                        </div>
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
          {(!displayTour.contents || displayTour.contents.length === 0) && displayTour.tourSchedule && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h4 className="text-lg font-semibold text-gray-900">{t('admin.tourDetailModal.fields.schedule')}</h4>
                {isFieldChanged('tourSchedule') && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                    <ExclamationCircleIcon className="w-3 h-3" />
                    {t('admin.tourDetailModal.changed')}
                  </span>
                )}
              </div>
              <div className={`rounded-[20px] p-4 border ${isFieldChanged('tourSchedule') ? 'border-amber-300 bg-amber-50/30' : 'border-gray-200 bg-gray-50'}`}>
                <div className="space-y-2">
                  <pre className={`whitespace-pre-wrap text-sm font-mono ${isFieldChanged('tourSchedule') ? 'text-gray-700 line-through opacity-50' : 'text-gray-700'}`}>
                    {typeof displayTour.tourSchedule === 'string' ? displayTour.tourSchedule : JSON.stringify(displayTour.tourSchedule, null, 2)}
                  </pre>
                  {isFieldChanged('tourSchedule') && updateRequest?.updatedTour?.tourSchedule && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                      <p className="text-emerald-600 font-semibold mb-2 text-sm">→ {t('admin.tourDetailModal.changed')}</p>
                      <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                        {typeof updateRequest.updatedTour.tourSchedule === 'string' 
                          ? updateRequest.updatedTour.tourSchedule 
                          : JSON.stringify(updateRequest.updatedTour.tourSchedule, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Company Info */}
          {displayTour.companyEmail && (
            <div className="bg-gray-50 rounded-[24px] p-4 border border-gray-200">
              <div className="flex items-center gap-3 mb-2">
                <BuildingOfficeIcon className="w-5 h-5 text-indigo-600" strokeWidth={1.5} />
                <p className="text-sm text-gray-500">{t('admin.tourDetailModal.fields.company')}</p>
              </div>
              <p className="text-base font-medium text-gray-900">{displayTour.companyEmail}</p>
            </div>
          )}

          {/* Status & Dates */}
          <div className="grid grid-cols-2 gap-4">
            {displayTour.tourStatus && (
              <div className="bg-gray-50 rounded-[24px] p-4 border border-gray-200">
                <p className="text-sm text-gray-500 mb-2">{t('admin.tourDetailModal.fields.status')}</p>
                <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                  displayTour.tourStatus === 'PUBLIC' ? 'bg-green-100 text-green-700' :
                  displayTour.tourStatus === 'NOT_APPROVED' ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {displayTour.tourStatus}
                </span>
              </div>
            )}

            {displayTour.createdAt && (
              <div className="bg-gray-50 rounded-[24px] p-4 border border-gray-200">
                <div className="flex items-center gap-3 mb-2">
                  <CalendarIcon className="w-5 h-5 text-amber-600" strokeWidth={1.5} />
                  <p className="text-sm text-gray-500">{t('admin.tourDetailModal.fields.createdAt')}</p>
                </div>
                <p className="text-base font-medium text-gray-900">
                  {formatDate(displayTour.createdAt)}
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
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50">
          {displayTour.tourStatus === 'NOT_APPROVED' && onApprove && onReject && (
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
