import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useBooking } from '../../../../../contexts/TourBookingContext';
import { formatPrice } from '../../../../../utils/priceRules';
import { DatePicker } from 'react-rainbow-components';
import {
  Calendar,
  CalendarRange,
  Users as UsersIcon,
  IdCard,
  UserRound,
  Baby,
  User,
  PenSquare,
  CalendarDays,
  Globe,
  BookUser,
  Venus,
  Mars
} from 'lucide-react';
import styles from './Step2Details.module.css';

const GenderIcon = ({ className = '' }) => (
  <span className={`${styles['gender-icon']} ${className}`}>
    <Mars />
    <Venus />
  </span>
);

const Step2Details = () => {
  const [searchParams] = useSearchParams();
  const tourId = searchParams.get('id');
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language || 'vi';
  const { 
    plan, 
    setDate, 
    incrementPax, 
    decrementPax, 
    setMember, 
    rebuildMembers, 
    recalcTotal,
    contact
  } = useBooking();

  const [errors, setErrors] = useState({});
  const [confirmedNationalities, setConfirmedNationalities] = useState({});
  const [touchedFields, setTouchedFields] = useState(new Set());
  const touchedFieldsRef = useRef(new Set()); // Ref to track touched fields for event handler
  const [dateTouched, setDateTouched] = useState(false);
  const [editingFields, setEditingFields] = useState(new Set()); // Track which fields are being edited
  const [validatingFields, setValidatingFields] = useState(new Set()); // Track fields being validated manually
  const validatingFieldsRef = useRef(new Set());
  const [isDeleting, setIsDeleting] = useState(false); // Track if user is deleting
  const previousValueRef = useRef(''); // Track previous value to detect deletion
  const isDeletingRef = useRef(false); // Ref to track deletion state without causing re-renders
  const departureDatePickerRef = useRef(null); // Ref for departure DatePicker to trigger programmatically
  const [tourPrices, setTourPrices] = useState({
    adult: null,
    child: null,
    infant: null
  });
  const [tourMeta, setTourMeta] = useState({
    deadlineDays: null,
    expirationDate: null
  });
  const [loading, setLoading] = useState(true);

  // Helper functions for date formatting based on language
  const getDateSeparator = () => {
    switch (currentLanguage) {
      case 'vi': return '/';
      case 'en': return '/';
      case 'ko': return '.';
      default: return '/';
    }
  };

  // Helper functions for date validation
  const isLeapYear = (year) => {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  };

  const getDaysInMonth = (month, year) => {
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);
    
    if ([1, 3, 5, 7, 8, 10, 12].includes(monthNum)) {
      return 31;
    } else if ([4, 6, 9, 11].includes(monthNum)) {
      return 30;
    } else if (monthNum === 2) {
      return isLeapYear(yearNum) ? 29 : 28;
    }
    return 31; // Default fallback
  };

  const toIsoDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const computeMinDepartureDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Nếu tour có hạn tối thiểu (deadlineDays), user chỉ có thể chọn ngày khởi hành SAU số ngày đó
    // Ví dụ: nếu deadlineDays = 8, thì user KHÔNG được chọn ngày = today + 8, chỉ được chọn từ today + 9 trở đi
    if (tourMeta.deadlineDays !== null && !Number.isNaN(tourMeta.deadlineDays) && tourMeta.deadlineDays > 0) {
      const minDate = new Date(today);
      minDate.setDate(minDate.getDate() + tourMeta.deadlineDays + 1); // +1 để không cho phép chọn ngày = today + deadlineDays
      return toIsoDate(minDate);
    }
    // Nếu không có deadline, chỉ cần không chọn ngày trong quá khứ
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return toIsoDate(tomorrow);
  };

  const computeMaxDepartureDate = () => {
    if (tourMeta.expirationDate) {
      return tourMeta.expirationDate;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fallback = new Date(today);
    fallback.setMonth(fallback.getMonth() + 1);
    return toIsoDate(fallback);
  };

  // Helper function to format date input for members (separate from representative)
  const formatMemberDateInput = (value, fieldKey) => {
    if (!value) return '';
    
    // Remove any non-numeric characters except separators
    const cleanValue = value.replace(/[^\d\/\.]/g, '');
    
    const separator = getDateSeparator();
    let parts = cleanValue.split(separator);
    
    // Get previous value for this field
    const previousValue = previousValueRef.current;
    const isDeletingNow = cleanValue.length < previousValue.length;
    
    // Also detect if user is trying to delete trailing separator
    // If previous value ended with separator and current doesn't, user is deleting
    const isDeletingTrailingSeparator = previousValue.endsWith(separator) && 
                                       !cleanValue.endsWith(separator) && 
                                       cleanValue.length === previousValue.length - 1;
    
    // Detect if user is trying to delete the last character of a complete part
    // e.g., when they have "19/09/" and try to delete the "/" to get "19/09"
    const isDeletingLastSeparator = previousValue.endsWith(separator) && 
                                   !cleanValue.endsWith(separator) && 
                                   cleanValue.length === previousValue.length - 1 &&
                                   cleanValue.split(separator).every(part => part.length >= 2 || part === '');
    
    // More comprehensive deletion detection
    // Check if we're in deletion mode from the ref (set by onKeyDown)
    const isInDeletionMode = isDeletingRef.current;
    
    // Check if the current clean value is shorter than what it should be based on formatting
    // This helps detect when user is deleting from a formatted string
    const shouldBeFormatted = previousValue.includes(separator) || cleanValue.includes(separator);
    const isDeletingFromFormatted = shouldBeFormatted && cleanValue.length <= previousValue.replace(/[\/\.]/g, '').length;
    
    // Update previous value for next comparison - but only after we've used it for detection
    previousValueRef.current = cleanValue;
    
    // If user is deleting, allow deletion of any characters including separators
    if (isDeletingNow || isDeletingTrailingSeparator || isDeletingLastSeparator || isInDeletionMode || isDeletingFromFormatted) {
      // Set deletion flag to prevent automatic separator addition
      isDeletingRef.current = true;
      // Allow deletion of separators and digits freely
      return cleanValue;
    }
    
    // If we were deleting but now we're typing again, clear the deletion flag
    if (isDeletingRef.current && !isDeletingNow && !isDeletingTrailingSeparator && !isDeletingLastSeparator && !isInDeletionMode && !isDeletingFromFormatted) {
      isDeletingRef.current = false;
    }
    
    // If user is in deletion mode, don't add automatic separators
    if (isDeletingRef.current) {
      return cleanValue;
    }
    
    // If the value is just a separator, allow deletion
    if (cleanValue === separator) {
      return cleanValue;
    }
    
    // If the value ends with separator, allow deletion
    if (cleanValue.endsWith(separator)) {
      return cleanValue;
    }
    
    // Helper function to validate and format date parts
    const validateAndFormat = (day, month, year) => {
      const currentYear = new Date().getFullYear();
      const minYear = 1900;
      const maxYear = currentYear;
      
      // Validate year - only if it's complete (4 digits)
      if (year && year.length === 4) {
        const yearNum = parseInt(year);
        if (yearNum < minYear) year = minYear.toString();
        if (yearNum > maxYear) year = maxYear.toString();
      }
      
      // Validate month - only if it's complete (2 digits)
      if (month && month.length === 2) {
        const monthNum = parseInt(month);
        if (monthNum < 1) month = '01';
        if (monthNum > 12) month = '12';
      }
      
      // Validate day - only if all parts are complete
      if (day && month && year && day.length === 2 && month.length === 2 && year.length === 4) {
        const dayNum = parseInt(day);
        const monthNum = parseInt(month);
        const yearNum = parseInt(year);
        
        // Get days in month using our custom function
        const daysInMonth = getDaysInMonth(month, year);
        
        if (dayNum < 1) day = '01';
        if (dayNum > daysInMonth) day = daysInMonth.toString();
      }
      
      return { day, month, year };
    };
    
    // Handle different language formats
    switch (currentLanguage) {
      case 'vi': // DD/MM/YYYY
        if (parts.length === 1) {
          let day = parts[0];
          if (day.length > 2) day = day.substring(0, 2);
          if (parseInt(day) > 31) day = '31';
          if (parseInt(day) > 3 && day.length === 1) day = '0' + day;
          
          if (day.length === 2 && parseInt(day) > 3) {
            return day + separator;
          }
          return day;
        }
        
        if (parts.length === 2) {
          let day = parts[0];
          let month = parts[1];
          
          if (day.length > 2) day = day.substring(0, 2);
          if (parseInt(day) > 31) day = '31';
          if (parseInt(day) > 3 && day.length === 1) day = '0' + day;
          
          if (month.length > 2) month = month.substring(0, 2);
          if (parseInt(month) > 12) month = '12';
          if (parseInt(month) > 1 && month.length === 1) month = '0' + month;
          
          // Allow deletion of separators - if month is empty, just return day
          if (month === '') {
            return day;
          }
          
          // Only add separator after month if month is complete (2 digits)
          if (month.length === 2 && parseInt(month) > 1) {
            return day + separator + month + separator;
          }
          return day + separator + month;
        }
        
        if (parts.length === 3) {
          let day = parts[0];
          let month = parts[1];
          let year = parts[2];
          
          // Allow deletion of separators - if year is empty, return day + separator + month
          if (year === '') {
            return day + separator + month;
          }
          
          // Allow deletion of separators - if month is empty, return day
          if (month === '') {
            return day;
          }
          
          // Limit year to 4 digits
          if (year.length > 4) year = year.substring(0, 4);
          
          // Only validate if year is complete (4 digits)
          if (year.length === 4) {
            const validated = validateAndFormat(day, month, year);
            return validated.day + separator + validated.month + separator + validated.year;
          }
          
          // Otherwise, just return the formatted string without forcing separators
          return day + separator + month + separator + year;
        }
        break;
        
      case 'en': // MM/DD/YYYY
        if (parts.length === 1) {
          let month = parts[0];
          if (month.length > 2) month = month.substring(0, 2);
          if (parseInt(month) > 12) month = '12';
          if (parseInt(month) > 1 && month.length === 1) month = '0' + month;
          
          if (month.length === 2 && parseInt(month) > 1) {
            return month + separator;
          }
          return month;
        }
        
        if (parts.length === 2) {
          let month = parts[0];
          let day = parts[1];
          
          if (month.length > 2) month = month.substring(0, 2);
          if (parseInt(month) > 12) month = '12';
          if (parseInt(month) > 1 && month.length === 1) month = '0' + month;
          
          if (day.length > 2) day = day.substring(0, 2);
          if (parseInt(day) > 31) day = '31';
          if (parseInt(day) > 3 && day.length === 1) day = '0' + day;
          
          // Allow deletion of separators - if day is empty, just return month
          if (day === '') {
            return month;
          }
          
          if (day.length === 2 && parseInt(day) > 3) {
            return month + separator + day + separator;
          }
          return month + separator + day;
        }
        
        if (parts.length === 3) {
          let month = parts[0];
          let day = parts[1];
          let year = parts[2];
          
          // Allow deletion of separators - if year is empty, return month + separator + day
          if (year === '') {
            return month + separator + day;
          }
          
          // Allow deletion of separators - if day is empty, return month
          if (day === '') {
            return month;
          }
          
          // Limit year to 4 digits
          if (year.length > 4) year = year.substring(0, 4);
          
          // Only validate if year is complete (4 digits)
          if (year.length === 4) {
            const validated = validateAndFormat(day, month, year);
            return validated.month + separator + validated.day + separator + validated.year;
          }
          
          // Otherwise, just return the formatted string without forcing separators
          return month + separator + day + separator + year;
        }
        break;
        
      case 'ko': // YYYY.MM.DD
        if (parts.length === 1) {
          let year = parts[0];
          if (year.length > 4) year = year.substring(0, 4);
          
          // Only validate year if it's complete (4 digits)
          if (year.length === 4) {
            const currentYear = new Date().getFullYear();
            if (parseInt(year) > currentYear) year = currentYear.toString();
            if (parseInt(year) < 1900) year = '1900';
          }
          
          if (year.length === 4) {
            return year + separator;
          }
          return year;
        }
        
        if (parts.length === 2) {
          let year = parts[0];
          let month = parts[1];
          
          if (year.length > 4) year = year.substring(0, 4);
          
          // Only validate year if it's complete (4 digits)
          if (year.length === 4) {
            const currentYear = new Date().getFullYear();
            if (parseInt(year) > currentYear) year = currentYear.toString();
            if (parseInt(year) < 1900) year = '1900';
          }
          
          if (month.length > 2) month = month.substring(0, 2);
          if (parseInt(month) > 12) month = '12';
          if (parseInt(month) > 1 && month.length === 1) month = '0' + month;
          
          // Allow deletion of separators - if month is empty, just return year
          if (month === '') {
            return year;
          }
          
          if (month.length === 2 && parseInt(month) > 1) {
            return year + separator + month + separator;
          }
          return year + separator + month;
        }
        
        if (parts.length === 3) {
          let year = parts[0];
          let month = parts[1];
          let day = parts[2];
          
          // Allow deletion of separators - if day is empty, return year + separator + month
          if (day === '') {
            return year + separator + month;
          }
          
          // Allow deletion of separators - if month is empty, return year
          if (month === '') {
            return year;
          }
          
          // Limit year to 4 digits
          if (year.length > 4) year = year.substring(0, 4);
          
          // Limit day to 2 digits
          if (day.length > 2) day = day.substring(0, 2);
          if (parseInt(day) > 31) day = '31';
          if (parseInt(day) > 3 && day.length === 1) day = '0' + day;
          
          // Only validate if year is complete (4 digits)
          if (year.length === 4) {
            const validated = validateAndFormat(day, month, year);
            return validated.year + separator + validated.month + separator + validated.day;
          }
          
          // Otherwise, just return the formatted string without forcing separators
          return year + separator + month + separator + day;
        }
        break;
    }
    
    return cleanValue;
  };

  // Helper function to validate and format date input as user types
  const formatDateInput = (value, fieldKey) => {
    if (!value) return '';
    
    // Remove any non-numeric characters except separators
    const cleanValue = value.replace(/[^\d\/\.]/g, '');
    
    const separator = getDateSeparator();
    let parts = cleanValue.split(separator);
    
    // Handle different language formats
    switch (currentLanguage) {
      case 'vi': // DD/MM/YYYY
        if (parts.length >= 1) {
          // Validate day (01-31)
          let day = parts[0];
          if (day.length > 2) day = day.substring(0, 2);
          if (parseInt(day) > 31) day = '31';
          if (parseInt(day) > 3 && day.length === 1) day = '0' + day;
          
          if (parts.length === 1) {
            if (day.length === 2 && parseInt(day) > 3) {
              return day + separator;
            }
            return day;
          }
          
          if (parts.length >= 2) {
            // Validate month (01-12)
            let month = parts[1];
            if (month.length > 2) month = month.substring(0, 2);
            if (parseInt(month) > 12) month = '12';
            if (parseInt(month) > 1 && month.length === 1) month = '0' + month;
            
            if (parts.length === 2) {
              if (month.length === 2 && parseInt(month) > 1) {
                return day + separator + month + separator;
              }
              return day + separator + month;
            }
            
            if (parts.length >= 3) {
              // Validate year (not future)
              let year = parts[2];
              const currentYear = new Date().getFullYear();
              if (year.length > 4) year = year.substring(0, 4);
              if (parseInt(year) > currentYear) year = currentYear.toString();
              
              return day + separator + month + separator + year;
            }
          }
        }
        break;
        
      case 'en': // MM/DD/YYYY
        if (parts.length >= 1) {
          // Validate month (01-12)
          let month = parts[0];
          if (month.length > 2) month = month.substring(0, 2);
          if (parseInt(month) > 12) month = '12';
          if (parseInt(month) > 1 && month.length === 1) month = '0' + month;
          
          if (parts.length === 1) {
            if (month.length === 2 && parseInt(month) > 1) {
              return month + separator;
            }
            return month;
          }
          
          if (parts.length >= 2) {
            // Validate day (01-31)
            let day = parts[1];
            if (day.length > 2) day = day.substring(0, 2);
            if (parseInt(day) > 31) day = '31';
            if (parseInt(day) > 3 && day.length === 1) day = '0' + day;
            
            if (parts.length === 2) {
              if (day.length === 2 && parseInt(day) > 3) {
                return month + separator + day + separator;
              }
              return month + separator + day;
            }
            
            if (parts.length >= 3) {
              // Validate year (not future)
              let year = parts[2];
              const currentYear = new Date().getFullYear();
              if (year.length > 4) year = year.substring(0, 4);
              if (parseInt(year) > currentYear) year = currentYear.toString();
              
              return month + separator + day + separator + year;
            }
          }
        }
        break;
        
      case 'ko': // YYYY.MM.DD
        if (parts.length >= 1) {
          // Validate year (not future)
          let year = parts[0];
          const currentYear = new Date().getFullYear();
          if (year.length > 4) year = year.substring(0, 4);
          if (parseInt(year) > currentYear) year = currentYear.toString();
          
          if (parts.length === 1) {
            if (year.length === 4) {
              return year + separator;
            }
            return year;
          }
          
          if (parts.length >= 2) {
            // Validate month (01-12)
            let month = parts[1];
            if (month.length > 2) month = month.substring(0, 2);
            if (parseInt(month) > 12) month = '12';
            if (parseInt(month) > 1 && month.length === 1) month = '0' + month;
            
            if (parts.length === 2) {
              if (month.length === 2 && parseInt(month) > 1) {
                return year + separator + month + separator;
              }
              return year + separator + month;
            }
            
            if (parts.length >= 3) {
              // Validate day (01-31)
              let day = parts[2];
              if (day.length > 2) day = day.substring(0, 2);
              if (parseInt(day) > 31) day = '31';
              
              return year + separator + month + separator + day;
            }
          }
        }
        break;
    }
    
    return cleanValue;
  };

  const getDateFormat = () => {
    switch (currentLanguage) {
      case 'vi': return 'DD/MM/YYYY';
      case 'en': return 'MM/DD/YYYY';
      case 'ko': return 'YYYY.MM.DD';
      default: return 'YYYY-MM-DD';
    }
  };

  const formatDateFromNormalized = (normalizedDate) => {
    if (!normalizedDate || !/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
      return normalizedDate;
    }
    
    const [year, month, day] = normalizedDate.split('-');
    const separator = getDateSeparator();
    
    switch (currentLanguage) {
      case 'vi':
        return `${day}${separator}${month}${separator}${year}`;
      case 'en':
        return `${month}${separator}${day}${separator}${year}`;
      case 'ko':
        return `${year}${separator}${month}${separator}${day}`;
      default:
        return `${day}${separator}${month}${separator}${year}`;
    }
  };

  // Format date with month name for better readability (e.g., "12 tháng 2, 2025")
  const formatDateWithMonthName = (normalizedDate) => {
    if (!normalizedDate || !/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
      return normalizedDate;
    }
    
    const [year, month, day] = normalizedDate.split('-');
    const monthNum = parseInt(month, 10);
    const dayNum = parseInt(day, 10);
    
    const monthNames = {
      vi: ['', 'tháng 1', 'tháng 2', 'tháng 3', 'tháng 4', 'tháng 5', 'tháng 6', 
           'tháng 7', 'tháng 8', 'tháng 9', 'tháng 10', 'tháng 11', 'tháng 12'],
      en: ['', 'January', 'February', 'March', 'April', 'May', 'June',
           'July', 'August', 'September', 'October', 'November', 'December'],
      ko: ['', '1월', '2월', '3월', '4월', '5월', '6월',
           '7월', '8월', '9월', '10월', '11월', '12월']
    };
    
    const monthName = monthNames[currentLanguage]?.[monthNum] || month;
    
    switch (currentLanguage) {
      case 'vi':
        return `${dayNum} ${monthName}, ${year}`;
      case 'en':
        return `${monthName} ${dayNum}, ${year}`;
      case 'ko':
        return `${year}년 ${monthName} ${dayNum}일`;
      default:
        return `${dayNum} ${monthName}, ${year}`;
    }
  };

  // Format departure date from plan.date (year, month, day) to display format
  const formatDepartureDateForDisplay = () => {
    if (!plan.date.year || !plan.date.month || !plan.date.day) {
      return '';
    }
    
    const year = String(plan.date.year);
    const month = String(plan.date.month).padStart(2, '0');
    const day = String(plan.date.day).padStart(2, '0');
    const separator = getDateSeparator();
    
    switch (currentLanguage) {
      case 'vi':
        return `${day}${separator}${month}${separator}${year}`;
      case 'en':
        return `${month}${separator}${day}${separator}${year}`;
      case 'ko':
        return `${year}${separator}${month}${separator}${day}`;
      default:
        return `${year}-${month}-${day}`;
    }
  };

  const formatDateForDisplay = (dateString, fieldKey) => {
    if (!dateString) return '';
    
    // If field is being edited, do not transform user input
    if (editingFields.has(fieldKey)) {
      return dateString;
    }
    
    // If normalized, format for current language
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-');
      const separator = getDateSeparator();
      switch (currentLanguage) {
        case 'vi': return `${day}${separator}${month}${separator}${year}`;
        case 'en': return `${month}${separator}${day}${separator}${year}`;
        case 'ko': return `${year}${separator}${month}${separator}${day}`;
        default: return `${year}-${month}-${day}`;
      }
    }
    
    // Otherwise, actively convert to the current language format
    try {
      const converted = parseAndConvertDate(dateString, null, currentLanguage);
      return converted || dateString;
    } catch (_) {
      return dateString;
    }
  };

  // Helper to convert between display formats across languages, reusing Step1 approach
  const parseAndConvertDate = (dateString, fromLanguage, toLanguage) => {
    if (!dateString) return '';
    try {
      // Normalize detection if fromLanguage not provided
      let detectedFrom = fromLanguage;
      if (!detectedFrom) {
        if (dateString.includes('.')) {
          detectedFrom = 'ko';
        } else if (dateString.includes('/')) {
          const parts = dateString.split('/');
          if (parts.length === 3) {
            const first = parseInt(parts[0], 10);
            const second = parseInt(parts[1], 10);
            // If first <= 12 and second <= 31, ambiguous; prefer 'vi' when first > 12 else 'en'
            detectedFrom = (first > 12) ? 'vi' : 'en';
          }
        }
      }

      // Parse into Date components (YYYY, MM, DD)
      const parseParts = (value, lang) => {
        const sep = lang === 'ko' ? '.' : '/';
        const parts = value.split(sep);
        if (parts.length !== 3) return null;
        let y, m, d;
        switch (lang) {
          case 'vi': // DD/MM/YYYY
            d = parts[0]; m = parts[1]; y = parts[2];
            break;
          case 'en': // MM/DD/YYYY
            m = parts[0]; d = parts[1]; y = parts[2];
            break;
          case 'ko': // YYYY.MM.DD
            y = parts[0]; m = parts[1]; d = parts[2];
            break;
          default:
            return null;
        }
        const year = y.padStart(4, '0');
        const month = m.padStart(2, '0');
        const day = d.padStart(2, '0');
        const iso = `${year}-${month}-${day}`;
        const date = new Date(iso);
        if (isNaN(date.getTime())) return null;
        return { year, month, day };
      };

      const srcLang = detectedFrom || toLanguage; // fallback
      const parts = parseParts(dateString, srcLang);
      if (!parts) return dateString;

      const sep = toLanguage === 'ko' ? '.' : '/';
      switch (toLanguage) {
        case 'vi':
          return `${parts.day}${sep}${parts.month}${sep}${parts.year}`;
        case 'en':
          return `${parts.month}${sep}${parts.day}${sep}${parts.year}`;
        case 'ko':
          return `${parts.year}${sep}${parts.month}${sep}${parts.day}`;
        default:
          return `${parts.year}-${parts.month}-${parts.day}`;
      }
    } catch (_) {
      return dateString;
    }
  };

  const parseDateFromDisplay = (displayString) => {
    if (!displayString) return null;
    
    const separator = getDateSeparator();
    const parts = displayString.split(separator);
    
    if (parts.length !== 3) return null;
    
    let day, month, year;
    
    switch (currentLanguage) {
      case 'vi': // DD/MM/YYYY
        day = parts[0];
        month = parts[1];
        year = parts[2];
        break;
      case 'en': // MM/DD/YYYY
        month = parts[0];
        day = parts[1];
        year = parts[2];
        break;
      case 'ko': // YYYY.MM.DD
        year = parts[0];
        month = parts[1];
        day = parts[2];
        break;
      default:
        return null;
    }
    
    const date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
  };

  // Helper function to validate and normalize date input
  const validateDateInput = (inputValue) => {
    if (!inputValue || inputValue.trim() === '') {
      return null;
    }

    // First try to parse using language-specific format
    const parsedDate = parseDateFromDisplay(inputValue);
    
    if (parsedDate) {
      return parsedDate;
    }
    
    // Don't use fallback new Date() as it can cause issues
    // Just return null for invalid input
    return null;
  };

  // Helper function to calculate age from date of birth at a specific date
  const calculateAge = (dob, referenceDate = null) => {
    if (!dob) return null;
    
    const refDate = referenceDate ? new Date(referenceDate) : new Date();
    
    // Handle different date formats
    let birthDate;
    if (typeof dob === 'string') {
      // Check if it's DD/MM/YYYY format
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(dob)) {
        const [day, month, year] = dob.split('/');
        birthDate = new Date(year, month - 1, day); // month is 0-indexed
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
        // YYYY-MM-DD format
        birthDate = new Date(dob);
      } else {
        // Try default Date constructor
        birthDate = new Date(dob);
      }
    } else {
      birthDate = new Date(dob);
    }
    
    // Check if birthDate is valid
    if (isNaN(birthDate.getTime())) {
      return null;
    }
    
    let age = refDate.getFullYear() - birthDate.getFullYear();
    const monthDiff = refDate.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && refDate.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  // Helper function to get global index for member
  const getGlobalIndex = (memberType, localIndex) => {
    if (memberType === 'adult') {
      return localIndex; // Adult members: adult[0] = globalIndex 0, adult[1] = globalIndex 1, etc.
    } else if (memberType === 'child') {
      return (plan.members?.adult?.length || 0) + localIndex; // Child members start after adults
    } else if (memberType === 'infant') {
      return (plan.members?.adult?.length || 0) + (plan.members?.child?.length || 0) + localIndex; // Infant members start after adults and children
    }
    return localIndex;
  };

  // Helper function to determine if ID is required based on age and nationality
  const isIdRequired = (dob, nationality) => {
    if (!dob || !nationality) return false;
    const age = calculateAge(dob);
    if (age === null) return false;
    // Temporarily disable Vietnam-specific logic; require passport/ID for all
    return true;
  };

  // List of countries (codes) with i18n labels - keep only Korea
  const countries = ['KR']
    .map(code => ({ code, label: t(`booking.step2.countries.${code}`) }));

  // Ensure we have at least 1 adult passenger when entering step 2
  useEffect(() => {
    if (plan.pax.adult < 1) {
      setPax({ ...plan.pax, adult: 1 });
    }
    // Ensure members array is rebuilt to match pax count
    if (plan.members.adult.length !== plan.pax.adult) {
      rebuildMembers();
    }
  }, []); // Only run once on mount

  // Handle language change - re-format dates and update displays
  useEffect(() => {
    // When language changes, we need to update the display format of dates
    // but keep the actual stored values unchanged
    
    // Force re-render of all date fields by clearing editing fields
    setEditingFields(new Set());
    
    // Re-validate all fields with new language-specific error messages
    if (Object.keys(errors).length > 0) {
      setErrors({});
      // Trigger validation on next tick to ensure UI updates
      setTimeout(() => {
        // This will trigger the validation useEffect
      }, 0);
    }

    // Convert existing DOB values to current language display, mirroring Step1 behavior
    try {
      const convertMemberDob = (memberType, index) => {
        const member = plan.members[memberType][index];
        const dob = member?.dob;
        if (!dob || typeof dob !== 'string' || dob.trim() === '') return;
        // Detect source language by separator and structure
        let fromLang = null;
        if (dob.includes('.')) {
          fromLang = 'ko';
        } else if (dob.includes('/')) {
          const parts = dob.split('/');
          if (parts.length === 3) {
            const first = parseInt(parts[0], 10);
            const second = parseInt(parts[1], 10);
            fromLang = (first > 12) ? 'vi' : 'en';
          }
        }
        const converted = parseAndConvertDate(dob, fromLang, currentLanguage);
        if (converted && converted !== dob) {
          setMember(memberType, index, { dob: converted });
        }
      };

      // All adult members (no representative anymore)
      if (plan.members?.adult?.length > 0) {
        for (let i = 0; i < plan.members.adult.length; i++) {
          convertMemberDob('adult', i);
        }
      }
      // Children
      if (plan.members?.child?.length > 0) {
        for (let i = 0; i < plan.members.child.length; i++) {
          convertMemberDob('child', i);
        }
      }
      // Infants
      if (plan.members?.infant?.length > 0) {
        for (let i = 0; i < plan.members.infant.length; i++) {
          convertMemberDob('infant', i);
        }
      }
    } catch (err) {
      // Language change DOB conversion error
    }
  }, [currentLanguage]);

  // Fetch tour data and prices
  const loadTourPrices = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch tour data directly (public endpoint)
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
      
      // Get token for authentication
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      
      const response = await fetch(`${API_BASE_URL}/api/tour/${tourId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });
      
      if (!response.ok) {
        // Handle 401 with global error handler
        if (response.status === 401) {
          const { handleApiError } = await import('../../../../../utils/apiErrorHandler');
          await handleApiError(response);
          throw new Error('Session expired. Please login again.');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const tourData = await response.json();
      
       // Extract prices from tour data - only use real prices from database
       const prices = {
         adult: tourData.adultPrice !== null && tourData.adultPrice !== undefined ? Number(tourData.adultPrice) : null,
         child: tourData.childrenPrice !== null && tourData.childrenPrice !== undefined ? Number(tourData.childrenPrice) : null,
         infant: tourData.babyPrice !== null && tourData.babyPrice !== undefined ? Number(tourData.babyPrice) : null
       };

      const parseDeadlineDays = () => {
        // Try multiple field names to support different API response formats
        const deadlineValue = tourData.tourDeadline ?? 
                             tourData.tour_deadline ?? 
                             tourData.minimumAdvanceDays ?? 
                             tourData.minimum_advance_days;
        
        if (deadlineValue === undefined || deadlineValue === null || deadlineValue === '') {
          return null;
        }
        const parsed = parseInt(deadlineValue, 10);
        return Number.isNaN(parsed) || parsed < 0 ? null : parsed;
      };

      const parseExpirationDate = () => {
        // Try multiple field names to support different API response formats
        const expirationValue = tourData.tourExpirationDate ?? 
                               tourData.tour_expiration_date ?? 
                               tourData.bookingDeadline ?? 
                               tourData.booking_deadline;
        
        if (!expirationValue) return null;
        
        // If it's already a date string (YYYY-MM-DD), return it
        if (typeof expirationValue === 'string' && /^\d{4}-\d{2}-\d{2}/.test(expirationValue)) {
          return expirationValue.split('T')[0]; // Remove time part if present
        }
        
        // If it's a Date object or timestamp, convert to YYYY-MM-DD
        try {
          const date = new Date(expirationValue);
          if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
          }
        } catch (e) {
          // Failed to parse expiration date
        }
        
        return null;
      };

      const deadlineDays = parseDeadlineDays();
      const expirationDate = parseExpirationDate();

      setTourMeta({
        deadlineDays: deadlineDays,
        expirationDate: expirationDate
      });
      
      
      // Diagnostics removed
      
      setTourPrices(prices);
    } catch (error) {
      // Error loading tour prices
      
      // Set prices to null if API fails - no fallback prices
      setTourPrices({
        adult: null,
        child: null,
        infant: null
      });
    } finally {
      setLoading(false);
    }
  }, [tourId]);

  useEffect(() => {
    if (tourId) {
      loadTourPrices();
    }
  }, [tourId, loadTourPrices]);

  // Validate và clear date nếu không hợp lệ khi tourMeta thay đổi
  useEffect(() => {
    if (plan.date.day && plan.date.month && plan.date.year) {
      const selectedDate = new Date(plan.date.year, plan.date.month - 1, plan.date.day);
      selectedDate.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const minDate = new Date(today);
      
      // Nếu tour có deadlineDays, tính minDate = today + deadlineDays + 1
      // Ví dụ: nếu deadlineDays = 8, thì user KHÔNG được chọn ngày = today + 8, chỉ được chọn từ today + 9 trở đi
      if (tourMeta.deadlineDays !== null && !Number.isNaN(tourMeta.deadlineDays) && tourMeta.deadlineDays > 0) {
        minDate.setDate(minDate.getDate() + tourMeta.deadlineDays + 1); // +1 để không cho phép chọn ngày = today + deadlineDays
      } else {
        // Nếu không có deadline, minDate = tomorrow (không cho chọn hôm nay)
        minDate.setDate(minDate.getDate() + 1);
      }
      
      // Nếu ngày đã chọn không hợp lệ (trước minDate hoặc sau expirationDate), clear nó
      if (selectedDate < minDate) {
        setDate({ day: null, month: null, year: null });
        setDateTouched(false);
      } else if (tourMeta.expirationDate) {
        const expiration = new Date(`${tourMeta.expirationDate}T00:00:00`);
        expiration.setHours(0, 0, 0, 0);
        if (selectedDate > expiration) {
          setDate({ day: null, month: null, year: null });
          setDateTouched(false);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourMeta.deadlineDays, tourMeta.expirationDate]);

  // Update members when pax changes
  useEffect(() => {
    rebuildMembers();
  }, [plan.pax, rebuildMembers]);

  // Recalculate total when prices or pax change
  useEffect(() => {
    // Only recalculate if we have real prices from database
    if (tourPrices.adult !== null || tourPrices.child !== null || tourPrices.infant !== null) {
      recalcTotal(tourPrices);
    }
  }, [plan.pax, tourPrices, recalcTotal]);

  // Restore confirmedNationalities from saved data when component mounts or when returning from other steps
  useEffect(() => {
    const restoreConfirmedNationalities = () => {
      const restored = {};
      
      // Check all adult members (no representative anymore)
      plan.members.adult.forEach((member, index) => {
        if (member.nationality) {
          restored[`adult-${index}`] = member.nationality;
        }
      });
      
      // Check child members
      plan.members.child.forEach((member, index) => {
        if (member.nationality) {
          const globalIndex = plan.members.adult.length + index; // globalIndex starts after all adults
          restored[`child-${globalIndex}`] = member.nationality;
        }
      });
      
      // Check infant members
      plan.members.infant.forEach((member, index) => {
        if (member.nationality) {
          const globalIndex = plan.members.adult.length + plan.members.child.length + index; // globalIndex starts after adults and children
          restored[`infant-${globalIndex}`] = member.nationality;
        }
      });
      
      
      setConfirmedNationalities(restored);
    };
    
    restoreConfirmedNationalities();
  }, []); // Only run once on mount to restore nationalities

  // Removed cleanup useEffect since we no longer use timeouts

  // Helper function to set touched fields and sync with ref
  const setTouchedFieldsWithRef = (updater) => {
    setTouchedFields(prev => {
      const newValue = typeof updater === 'function' ? updater(prev) : updater;
      touchedFieldsRef.current = newValue;
      return newValue;
    });
  };

  // Sync touchedFieldsRef with touchedFields state
  useEffect(() => {
    touchedFieldsRef.current = touchedFields;
  }, [touchedFields]);

  // Listen for validation trigger from parent component (when Next is clicked)
  useEffect(() => {
    const handleValidateAll = () => {
      // Only validate and mark touched for fields that haven't been touched yet
      // This preserves the realtime validation logic for fields that user has already interacted with
      
      // Get current touched fields from ref (to avoid closure issues)
      const currentTouchedFields = touchedFieldsRef.current;
      const fieldsToValidate = [];
      
      // Check date field
      if (!currentTouchedFields.has('date') && !dateTouched) {
        fieldsToValidate.push({ type: 'date', key: 'date' });
      }
      
      // Check all members
      const allMembers = [
        ...plan.members.adult.map((m, i) => ({ member: m, type: 'adult', index: i })),
        ...plan.members.child.map((m, i) => ({ member: m, type: 'child', index: i })),
        ...plan.members.infant.map((m, i) => ({ member: m, type: 'infant', index: i }))
      ];
      
      allMembers.forEach(({ member, type, index }) => {
        if (!member) return;
        
        // Check each field
        const fields = ['fullName', 'dob', 'gender', 'nationality', 'idNumber'];
        fields.forEach(field => {
          // For idNumber, use different key format
          let fieldKey;
          if (field === 'idNumber') {
            // All members use the same pattern: {type}_{index}_idNumber
            fieldKey = `${type}_${index}_idNumber`;
          } else {
            fieldKey = `${type}_${index}_${field}`;
          }
          
          if (!currentTouchedFields.has(fieldKey)) {
            fieldsToValidate.push({ type: 'member', memberType: type, index, field, key: fieldKey });
          }
        });
      });
      
        // Mark untouched fields as touched and validate them
        if (fieldsToValidate.length > 0) {
          // First, mark all untouched fields as touched
          const newTouchedFields = new Set(touchedFieldsRef.current);
          fieldsToValidate.forEach(({ key }) => {
            if (key) {
              newTouchedFields.add(key);
            }
          });
          
          // Update ref immediately to ensure validation can access it
          touchedFieldsRef.current = newTouchedFields;
          
          // Update state to trigger validation useEffect
          setTouchedFieldsWithRef(newTouchedFields);
          
          // Mark date as touched if needed
          if (fieldsToValidate.some(f => f.type === 'date')) {
            setDateTouched(true);
          }
          
          // Validation will be handled by the existing useEffect that watches touchedFields
          // The useEffect will automatically validate all touched fields
        }
    };
    
    // Listen for custom event from parent component
    window.addEventListener('validateStep2', handleValidateAll);
    
    return () => {
      window.removeEventListener('validateStep2', handleValidateAll);
    };
  }, [plan.members, dateTouched]);

  // Validate form
  useEffect(() => {
    const newErrors = {};

    // Check date - only validate if dateTouched is true
    if (!plan.date.day || !plan.date.month || !plan.date.year) {
      // Only show error if field has been touched (user tried to proceed)
      if (dateTouched) {
        newErrors.date = t('booking.step2.errors.dateRequired');
      }
    } else {
      // Create selected date and normalize to midnight for accurate comparison
      const selectedDate = new Date(plan.date.year, plan.date.month - 1, plan.date.day);
      selectedDate.setHours(0, 0, 0, 0);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Calculate minimum date: today + deadlineDays + 1 (Minimum Advance Days)
      // Example: if deadlineDays = 8, user CANNOT select today + 8, only from today + 9 onwards
      const minDate = new Date(today);
      if (tourMeta.deadlineDays !== null && !Number.isNaN(tourMeta.deadlineDays) && tourMeta.deadlineDays > 0) {
        minDate.setDate(minDate.getDate() + tourMeta.deadlineDays + 1); // +1 để không cho phép chọn ngày = today + deadlineDays
      } else {
        // Nếu không có deadline, minDate = tomorrow (không cho chọn hôm nay)
        minDate.setDate(minDate.getDate() + 1);
      }

      // Validate: selected date must not be in the past
      if (selectedDate < today) {
        newErrors.date = t('booking.step2.errors.dateInPast');
      } 
      // Validate: selected date must be AFTER today + deadlineDays (not equal to)
      else if (tourMeta.deadlineDays !== null && !Number.isNaN(tourMeta.deadlineDays) && tourMeta.deadlineDays > 0) {
        if (selectedDate < minDate) {
          // Selected date is before or equal to the minimum advance days requirement
          newErrors.date = t('booking.step2.errors.dateBeforeDeadline', { days: tourMeta.deadlineDays });
        } else if (tourMeta.expirationDate) {
          // Validate: selected date must not exceed booking deadline (expiration date)
          const expiration = new Date(`${tourMeta.expirationDate}T00:00:00`);
          expiration.setHours(0, 0, 0, 0);
          if (selectedDate > expiration) {
            newErrors.date = t('booking.step2.errors.dateAfterExpiration', { date: tourMeta.expirationDate });
          } else {
            delete newErrors.date;
          }
        } else {
          // No expiration date, use fallback (1 month from today)
          const fallbackMax = new Date(today);
          fallbackMax.setMonth(fallbackMax.getMonth() + 1);
          if (selectedDate > fallbackMax) {
            newErrors.date = t('booking.step2.errors.dateOverOneMonth');
          } else {
            delete newErrors.date;
          }
        }
      } 
      // No deadlineDays requirement, but still check expiration date
      else if (tourMeta.expirationDate) {
        const expiration = new Date(`${tourMeta.expirationDate}T00:00:00`);
        expiration.setHours(0, 0, 0, 0);
        if (selectedDate > expiration) {
          newErrors.date = t('booking.step2.errors.dateAfterExpiration', { date: tourMeta.expirationDate });
        } else {
          delete newErrors.date;
        }
      } 
      // No constraints, just check it's not in the past and not today
      else {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        if (selectedDate < tomorrow) {
          newErrors.date = t('booking.step2.errors.dateInPast');
        } else {
          const fallbackMax = new Date(today);
          fallbackMax.setMonth(fallbackMax.getMonth() + 1);
          if (selectedDate > fallbackMax) {
            newErrors.date = t('booking.step2.errors.dateOverOneMonth');
          } else {
            delete newErrors.date;
          }
        }
      }
    }

    // Check members - validate each type separately
    // Validate all adult members (no representative anymore)
    plan.members.adult.forEach((member, index) => {
      // Safety check: skip if member is undefined
      if (!member) { return; }
      
      const memberType = 'adult';
      const globalIndex = index; // Adult members start from 0
      
      // Validate fullName
      const nameKey = `${memberType}_${index}_fullName`;
      if (touchedFields.has(nameKey) && !member.fullName?.trim()) {
        newErrors[`member_${globalIndex}_name`] = t('booking.step2.errors.fullNameRequired');
      } else if (touchedFields.has(nameKey) && member.fullName && !/^[\p{L}\p{M}\s\-']+$/u.test(member.fullName.trim())) {
        newErrors[`member_${globalIndex}_name`] = t('booking.step2.errors.fullNameInvalid');
      }
      
      // Validate DOB
      const dobKey = `${memberType}_${index}_dob`;
      if (!member.dob || !member.dob.trim()) {
        if (touchedFields.has(dobKey)) {
          newErrors[dobKey] = t('booking.step2.errors.dobRequired');
        }
      } else if (member.dob) {
        // Skip useEffect validation if field is being validated manually
        if (!validatingFieldsRef.current.has(dobKey)) {
          // Use the same validation logic as manual input and calendar picker
          const normalizedDate = validateDateInput(member.dob);
          if (!normalizedDate) {
            newErrors[dobKey] = t('booking.step2.errors.dobInvalidFormat');
          } else {
            // Use validateMemberAge function for consistent validation
            const validationResult = validateMemberAge(memberType, normalizedDate);
            if (!validationResult.isValid) {
              newErrors[dobKey] = validationResult.error;
            }
          }
        }
      }
      
      // Validate gender
      const genderKey = `${memberType}_${index}_gender`;
      if (touchedFields.has(genderKey) && !member.gender) {
        newErrors[`member_${globalIndex}_gender`] = t('booking.step2.errors.genderRequired');
      }
      
      // Validate nationality
      const nationalityKey = `${memberType}_${index}_nationality`;
      if (touchedFields.has(nationalityKey) && !member.nationality) {
        newErrors[`member_${globalIndex}_nationality`] = t('booking.step2.errors.nationalityRequired');
      }
      
      // ID validation - always required when field is touched
      // Use consistent error key matching handleIdNumberChange and render
      // All adult members use the same pattern: adult_{index}_idNumber
      const idErrorKey = `${memberType}_${index}_idNumber`;
      const idTouchedKey = `${memberType}_${index}_idNumber`;
      
      if (touchedFields.has(idTouchedKey)) {
        // Always validate when field is touched
        // Passport is always required for all nationalities (currently only Korea)
        // Validate regardless of nationality selection to show error message
        if (!member.idNumber || !member.idNumber.trim()) {
          // ID is required but not provided
          newErrors[idErrorKey] = t('booking.step2.validation.passport');
        } else {
          // Validate format - Passport validation: 6-9 characters, letters and numbers
          const passportRegex = /^[A-Z0-9]{6,9}$/i;
          const isValid = passportRegex.test(member.idNumber);
          if (!isValid) {
            newErrors[idErrorKey] = t('booking.step2.validation.passport');
          }
        }
      }
    });

    // Validate child members
    plan.members.child.forEach((member, index) => {
      // Safety check: skip if member is undefined
      if (!member) { return; }
      
      const memberType = 'child';
      const globalIndex = plan.members.adult.length + index; // Child members start after adults
      const localIndex = index; // Child members use index directly
      
      // Only validate if field has been touched or has value
      const nameKey = `${memberType}_${index}_fullName`;
      if (touchedFields.has(nameKey)) {
        if (!member.fullName?.trim()) {
          newErrors[`member_${globalIndex}_name`] = t('booking.step2.errors.fullNameRequired');
        } else {
          // Validate full name format - only allow letters, spaces, hyphens, apostrophes
          const nameRegex = /^[\p{L}\p{M}\s\-']+$/u;
          if (!nameRegex.test(member.fullName.trim())) {
            newErrors[`member_${globalIndex}_name`] = t('booking.step2.errors.fullNameInvalid');
          }
        }
      }
      
      const dobKey = `${memberType}_${index}_dob`;
      if (touchedFields.has(dobKey) && !member.dob) {
        newErrors[dobKey] = t('booking.step2.errors.dobRequired');
      } else if (member.dob) {
        // Skip useEffect validation if field is being validated manually
        if (!validatingFieldsRef.current.has(dobKey)) {
          // Use the same validation logic as manual input and calendar picker
          const normalizedDate = validateDateInput(member.dob);
          if (!normalizedDate) {
            newErrors[dobKey] = t('booking.step2.errors.dobInvalidFormat');
          } else {
            // Use validateMemberAge function for consistent validation
            const validationResult = validateMemberAge(memberType, normalizedDate);
            if (!validationResult.isValid) {
              newErrors[dobKey] = validationResult.error;
            }
          }
        } else {
          // Skipping useEffect validation - being validated manually
        }
      }
      
      const genderKey = `${memberType}_${localIndex}_gender`;
      if (touchedFields.has(genderKey) && !member.gender) {
        newErrors[`member_${globalIndex}_gender`] = t('booking.step2.errors.genderRequired');
      }
      
      const nationalityKey = `${memberType}_${localIndex}_nationality`;
      if (touchedFields.has(nationalityKey) && !member.nationality) {
        newErrors[`member_${globalIndex}_nationality`] = t('booking.step2.errors.nationalityRequired');
      }
      
      // ID validation - always required when field is touched
      // Use globalIndex to match render and handleIdNumberChange
      // For child members: globalIndex = plan.members.adult.length + index
      const idErrorKey = `${memberType}_${globalIndex}_idNumber`;
      const idTouchedKey = `${memberType}_${index}_idNumber`; // Use localIndex for touched key
      
      if (touchedFields.has(idTouchedKey)) {
        // Always validate when field is touched
        // Passport is always required for all nationalities (currently only Korea)
        // Validate regardless of nationality selection to show error message
        if (!member.idNumber || !member.idNumber.trim()) {
          // ID is required but not provided
          newErrors[idErrorKey] = t('booking.step2.validation.passport');
        } else {
          // Validate format - Passport validation: 6-9 characters, letters and numbers
          const passportRegex = /^[A-Z0-9]{6,9}$/i;
          if (!passportRegex.test(member.idNumber)) {
            newErrors[idErrorKey] = t('booking.step2.validation.passport');
          }
        }
      }
    });

    // Validate infant members
    plan.members.infant.forEach((member, index) => {
      // Safety check: skip if member is undefined
      if (!member) { return; }
      
      const memberType = 'infant';
      const globalIndex = plan.members.adult.length + plan.members.child.length + index; // Infant members start after adults and children
      
      // Only validate if field has been touched or has value
      const nameKey = `${memberType}_${index}_fullName`;
      if (touchedFields.has(nameKey)) {
        if (!member.fullName?.trim()) {
          newErrors[`member_${globalIndex}_name`] = t('booking.step2.errors.fullNameRequired');
        } else {
          // Validate full name format - only allow letters, spaces, hyphens, apostrophes
          const nameRegex = /^[\p{L}\p{M}\s\-']+$/u;
          if (!nameRegex.test(member.fullName.trim())) {
            newErrors[`member_${globalIndex}_name`] = t('booking.step2.errors.fullNameInvalid');
          }
        }
      }
      
      const dobKey = `${memberType}_${index}_dob`;
      if (touchedFields.has(dobKey) && !member.dob) {
        newErrors[dobKey] = t('booking.step2.errors.dobRequired');
      } else if (member.dob) {
        // Skip useEffect validation if field is being validated manually
        if (!validatingFieldsRef.current.has(dobKey)) {
          // Use the same validation logic as manual input and calendar picker
          const normalizedDate = validateDateInput(member.dob);
          if (!normalizedDate) {
            newErrors[dobKey] = t('booking.step2.errors.dobInvalidFormat');
          } else {
            // Use validateMemberAge function for consistent validation
            const validationResult = validateMemberAge(memberType, normalizedDate);
            if (!validationResult.isValid) {
              newErrors[dobKey] = validationResult.error;
            }
          }
        } else {
          // Skipping useEffect validation - being validated manually
        }
      }
      
      const genderKey = `${memberType}_${index}_gender`;
      if (touchedFields.has(genderKey) && !member.gender) {
        newErrors[`member_${globalIndex}_gender`] = t('booking.step2.errors.genderRequired');
      }
      
      const nationalityKey = `${memberType}_${index}_nationality`;
      if (touchedFields.has(nationalityKey) && !member.nationality) {
        newErrors[`member_${globalIndex}_nationality`] = t('booking.step2.errors.nationalityRequired');
      }
      
      // ID validation - always required when field is touched
      // Use globalIndex to match render and handleIdNumberChange
      // For infant members: globalIndex = plan.members.adult.length + plan.members.child.length + index
      // All members use the same pattern: {memberType}_{globalIndex}_idNumber for error key
      // and {memberType}_{localIndex}_idNumber for touched key
      const idErrorKey = `${memberType}_${globalIndex}_idNumber`;
      const idTouchedKey = `${memberType}_${index}_idNumber`; // Use localIndex for touched key
      
      if (touchedFields.has(idTouchedKey)) {
        // Always validate when field is touched
        // Passport is always required for all nationalities (currently only Korea)
        // Validate regardless of nationality selection to show error message
        if (!member.idNumber || !member.idNumber.trim()) {
          // ID is required but not provided
          newErrors[idErrorKey] = t('booking.step2.validation.passport');
        } else {
          // Validate format - Passport validation: 6-9 characters, letters and numbers
          const passportRegex = /^[A-Z0-9]{6,9}$/i;
          if (!passportRegex.test(member.idNumber)) {
            newErrors[idErrorKey] = t('booking.step2.validation.passport');
          }
        }
      }
    });

    // Only update errors if not currently being validated manually
    setErrors(prev => {
      const updatedErrors = { ...prev };
      
      // Merge newErrors into updatedErrors (this will add/update errors from useEffect)
      Object.keys(newErrors).forEach(key => {
        if (!validatingFieldsRef.current.has(key)) {
          updatedErrors[key] = newErrors[key];
        }
      });
      
      // Remove errors for fields that are no longer invalid and not being validated manually
      // BUT: Don't remove idNumber errors if field is touched (preserve realtime validation errors)
      Object.keys(updatedErrors).forEach(key => {
        if (!newErrors[key] && !validatingFieldsRef.current.has(key)) {
          // Check if this is an idNumber error and field is touched - preserve it
          const isIdNumberError = key.includes('_idNumber');
          if (isIdNumberError) {
            // Check if corresponding touched field exists
            let shouldPreserve = false;
            // Check if corresponding touched field exists
            // For adult[0], touched key is adult_0_idNumber (not representative_idNumber)
            if (key === 'adult_0_idNumber') {
              shouldPreserve = touchedFields.has('adult_0_idNumber');
            } else {
              // Extract memberType and index from error key (e.g., "adult_1_idNumber" or "child_2_idNumber")
              // Note: error key format is memberType_globalIndex_idNumber
              // touched key format is memberType_localIndex_idNumber
              const match = key.match(/^(adult|child|infant)_(\d+)_idNumber$/);
              if (match) {
                const [, memberType, globalIndexStr] = match;
                const globalIndex = parseInt(globalIndexStr, 10);
                
                // Calculate localIndex from globalIndex
                let localIndex;
                if (memberType === 'adult') {
                  localIndex = globalIndex; // Adult members: globalIndex = localIndex
                } else if (memberType === 'child') {
                  localIndex = globalIndex - plan.members.adult.length;
                } else if (memberType === 'infant') {
                  localIndex = globalIndex - plan.members.adult.length - plan.members.child.length;
                } else {
                  localIndex = globalIndex;
                }
                
                const touchedKey = `${memberType}_${localIndex}_idNumber`;
                shouldPreserve = touchedFields.has(touchedKey);
              }
            }
            
            if (shouldPreserve) {
              // Don't delete - preserve realtime validation error
              return;
            }
          }
          
          delete updatedErrors[key];
        }
      });
      
      return updatedErrors;
    });
  }, [plan.date, plan.members, touchedFields, dateTouched, t, tourMeta.deadlineDays, tourMeta.expirationDate]);

  const handlePaxChange = (type, action) => {
    
    if (action === 'increment') {
      incrementPax(type);
      // Ensure members are rebuilt after incrementing
      setTimeout(() => {
        rebuildMembers();
      }, 0);
    } else if (action === 'decrement') {
      // Prevent adult count from going below 1
      if (type === 'adult' && plan.pax.adult <= 1) {
        return;
      }
      decrementPax(type);
      // Ensure members are rebuilt after decrementing
      setTimeout(() => {
        rebuildMembers();
      }, 0);
    }
  };

  const handleMemberChange = (memberType, index, field, value) => {
    
    let processedValue = value;
    
    // Special handling for full name input - only allow letters, spaces, hyphens, apostrophes
    if (field === 'fullName') {
      // Remove any characters that are not letters, spaces, hyphens, or apostrophes
      // This prevents typing numbers and special characters
      // Supports international names using Unicode properties
      processedValue = value.replace(/[^\p{L}\p{M}\s\-']/gu, '');
      
      // Additional cleanup: remove multiple consecutive spaces (but keep single spaces)
      processedValue = processedValue.replace(/\s+/g, ' ');
    }
    
    setMember(memberType, index, { [field]: processedValue });
    
    // Mark field as touched for real-time validation
    // BUT: Don't set touched for idNumber - it's handled in handleIdNumberBlur
    if (field !== 'idNumber') {
      setTouchedFieldsWithRef(prev => new Set(prev).add(`${memberType}_${index}_${field}`));
    }
    
    // Clear error if input becomes valid
    const globalIndex = getGlobalIndex(memberType, index);
    const errorKey = `member_${globalIndex}_${field === 'fullName' ? 'name' : field}`;
    
    if (errors[errorKey]) {
      // Check if input is now valid
      let isValid = false;
      
      if (field === 'fullName') {
        isValid = processedValue.trim() && /^[\p{L}\p{M}\s\-']+$/u.test(processedValue.trim());
      } else if (field === 'gender') {
        isValid = !!processedValue;
      } else if (field === 'nationality') {
        isValid = !!processedValue;
      }
      
      if (isValid) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[errorKey];
          return newErrors;
        });
      }
    }
  };

  // Special handler for date input to ensure proper validation
  const handleDateChange = (memberType, globalIndex, value) => {
    // No representative anymore, so localIndex = globalIndex for all member types
    const localIndex = globalIndex;
    
    // Always store the value as-is (display format)
    setMember(memberType, localIndex, { dob: value });
    
    // Real-time validation for DOB - use localIndex to match render
    const dobKey = `${memberType}_${localIndex}_dob`;
    setTouchedFieldsWithRef(prev => new Set(prev).add(dobKey));
    
    // Real-time validation: add or clear errors immediately
    if (value) {
      const normalizedDate = validateDateInput(value);
      if (!normalizedDate) {
        // Invalid format
        setErrors(prev => ({
          ...prev,
          [dobKey]: t('booking.step2.errors.dobInvalidFormat')
        }));
      } else {
        // Valid format, check age requirements
        const validationResult = validateMemberAge(memberType, normalizedDate);
        if (!validationResult.isValid) {
          setErrors(prev => ({
            ...prev,
            [dobKey]: validationResult.error
          }));
        } else {
          // Valid - clear any existing error
          setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[dobKey];
            return newErrors;
          });
        }
      }
    } else {
      // Empty value - clear error
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[dobKey];
        return newErrors;
      });
    }
  };

  // Validate member age based on member type
  const validateMemberAge = (memberType, normalizedDate) => {
    
    if (!normalizedDate || !/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
      return { isValid: false, error: t('booking.step2.errors.dobInvalidFormat') };
    }

    const birthDate = new Date(normalizedDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if birth date is in the future
    if (birthDate > today) {
      return { isValid: false, error: t('booking.step2.errors.dobInFuture') };
    }

    // Check if age is too old (sanity check)
    const age = calculateAge(normalizedDate);
    if (age > 120) {
      return { isValid: false, error: t('booking.step2.errors.dobTooOld') };
    }

    // Check age requirements based on member type
    if (memberType === 'adult') {
      // Adults must be at least 12 years old
      
      // Check current age first
      if (age < 12) {
        return { isValid: false, error: t('booking.step2.errors.adultTooYoung') };
      }
      
      // Also check age at departure date if available
      if (plan.date && plan.date.day && plan.date.month && plan.date.year) {
        const departureDate = new Date(plan.date.year, plan.date.month - 1, plan.date.day);
        const ageAtDeparture = calculateAge(normalizedDate, departureDate);
        
        if (ageAtDeparture < 12) {
          return { isValid: false, error: t('booking.step2.errors.adultTooYoung') };
        }
      }
    } else if (memberType === 'child') {
      // Children should be between 2-11 years old (typical definition)
      if (age < 2) {
        return { isValid: false, error: t('booking.step2.errors.childTooYoung') };
      }
      if (age >= 12) {
        return { isValid: false, error: t('booking.step2.errors.childTooOld') };
      }
      
      // Also check age at departure date if available
      if (plan.date && plan.date.day && plan.date.month && plan.date.year) {
        const departureDate = new Date(plan.date.year, plan.date.month - 1, plan.date.day);
        const ageAtDeparture = calculateAge(normalizedDate, departureDate);
        
        if (ageAtDeparture < 2) {
          return { isValid: false, error: t('booking.step2.errors.childTooYoung') };
        }
        if (ageAtDeparture >= 12) {
          return { isValid: false, error: t('booking.step2.errors.childTooOld') };
        }
      }
    } else if (memberType === 'infant') {
      // Infants should be under 2 years old
      if (age >= 2) {
        return { isValid: false, error: t('booking.step2.errors.infantTooOld') };
      }
      
      // Also check age at departure date if available
      if (plan.date && plan.date.day && plan.date.month && plan.date.year) {
        const departureDate = new Date(plan.date.year, plan.date.month - 1, plan.date.day);
        const ageAtDeparture = calculateAge(normalizedDate, departureDate);
        
        if (ageAtDeparture >= 2) {
          return { isValid: false, error: t('booking.step2.errors.infantTooOld') };
        }
      }
    }

    return { isValid: true };
  };

  // Separate function for validating ID number (called on blur)
  const validateIdNumber = (memberType, index, value) => {
    const key = `${memberType}-${index}`;
    const nationality = confirmedNationalities[key];
    
    if (nationality && value.trim()) {
      // Passport validation: 6-9 characters, letters and numbers
      const passportRegex = /^[A-Z0-9]{6,9}$/i;
      if (!passportRegex.test(value)) {
        return { isValid: false, error: t('booking.step2.validation.passport') };
      } else {
        return { isValid: true };
      }
    }
    
    // Return valid if no nationality or empty value
    return { isValid: true };
  };

  // Handle ID number input - with realtime error display
  // Note: For representative, index is localIndex (0). For other members, index is globalIndex.
  const handleIdNumberChange = (memberType, index, value) => {
    // For all nationalities: allow alphanumeric characters (passport format) and limit to 9 characters
    let processedValue = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    // Limit to maximum 9 characters for passport
    if (processedValue.length > 9) {
      processedValue = processedValue.substring(0, 9);
    }
    
    // Determine localIndex and globalIndex
    let localIndex;
    let globalIndex;
    let touchedKey;
    let errorKey;
    
    // All members: index passed from render is globalIndex
    globalIndex = index;
      
    // Calculate localIndex from globalIndex
    if (memberType === 'adult') {
      localIndex = globalIndex; // Adult members: globalIndex = localIndex
    } else if (memberType === 'child') {
      localIndex = globalIndex - plan.members.adult.length;
    } else if (memberType === 'infant') {
      localIndex = globalIndex - plan.members.adult.length - plan.members.child.length;
    } else {
      localIndex = globalIndex;
    }
      
    touchedKey = `${memberType}_${localIndex}_idNumber`;
    errorKey = `${memberType}_${globalIndex}_idNumber`;
    
    // Store the processed value using localIndex
    handleMemberChange(memberType, localIndex, 'idNumber', processedValue);
    
    // Mark field as touched for validation
    setTouchedFieldsWithRef(prev => {
      const newSet = new Set(prev);
      newSet.add(touchedKey);
      touchedFieldsRef.current = newSet;
      return newSet;
    });
    
    // Realtime validation: validate passport format (6-9 characters, letters and numbers)
    if (processedValue && processedValue.trim()) {
      const passportRegex = /^[A-Z0-9]{6,9}$/i;
      const isValid = passportRegex.test(processedValue);
      
      if (!isValid) {
        // Invalid format - show error
        setErrors(prev => {
          const newErrors = {
            ...prev,
            [errorKey]: t('booking.step2.validation.passport')
          };
          return newErrors;
        });
      } else {
        // Valid format (6-9 characters) - clear error
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[errorKey];
          return newErrors;
        });
      }
    } else {
      // Empty value - always set error if field is touched (for realtime feedback)
      // Mark as touched first if not already touched
      if (!touchedFieldsRef.current.has(touchedKey)) {
        setTouchedFieldsWithRef(prev => {
          const newSet = new Set(prev);
          newSet.add(touchedKey);
          touchedFieldsRef.current = newSet;
          return newSet;
        });
      }
      
      setErrors(prev => {
        const newErrors = {
          ...prev,
          [errorKey]: t('booking.step2.validation.passport')
        };
        return newErrors;
      });
    }
  };

  const handleIdNumberBlur = (memberType, index) => {
    // All members: index is globalIndex, calculate localIndex
    let localIndex;
    if (memberType === 'adult') {
      localIndex = index; // Adult members: globalIndex = localIndex
    } else if (memberType === 'child') {
      localIndex = index - plan.members.adult.length;
    } else if (memberType === 'infant') {
      localIndex = index - plan.members.adult.length - plan.members.child.length;
    } else {
      localIndex = index;
    }
    const touchedKey = `${memberType}_${localIndex}_idNumber`;
    
    setTouchedFieldsWithRef(prev => {
      const newSet = new Set(prev);
      newSet.add(touchedKey);
      touchedFieldsRef.current = newSet;
      return newSet;
    });
    
    // Realtime validation is handled in handleIdNumberChange
    // This blur handler just ensures field is marked as touched
  };

  const handleNationalityChange = (memberType, globalIndex, value) => {
    // For adult members, convert globalIndex to localIndex for setMember
    // adult[0] = globalIndex 0, adult[1] = globalIndex 1, etc.
    const localIndex = globalIndex;
    
    handleMemberChange(memberType, localIndex, 'nationality', value);
    
    // Real-time validation for nationality
    const nationalityKey = `${memberType}_${localIndex}_nationality`;
    setTouchedFieldsWithRef(prev => new Set(prev).add(nationalityKey));
    
    // Clear error if nationality becomes valid
    if (value && errors[`member_${globalIndex}_nationality`]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`member_${globalIndex}_nationality`];
        return newErrors;
      });
    }
    
    // Calculate localIndex for confirmedNationalities key
    // Representative uses globalIndex=0, so localIndex=0
    // Adult[0] (first added) uses globalIndex=1, so localIndex=0 (but key should be 'adult-1')
    // Adult[1] (second added) uses globalIndex=2, so localIndex=1 (but key should be 'adult-2')
    const confirmedLocalIndex = memberType === 'adult' && globalIndex === 0 ? 0 : // Representative
                      memberType === 'adult' ? globalIndex - 1 : // Other adults
                      memberType === 'child' ? globalIndex : // Child members start from 0
                      globalIndex; // Infant members start from 0
    
    // Show ID/Passport field for any selected nationality
    // Use globalIndex for key to ensure uniqueness between representative and adult members
    const key = `${memberType}-${globalIndex}`;
    
    if (value && value.trim()) {
      // Show ID/Passport field for any selected nationality
      setConfirmedNationalities(prev => ({
        ...prev,
        [key]: value
      }));
      
      // Validate existing ID when nationality changes
      let currentIdNumber;
      if (memberType === 'adult' && globalIndex === 0) {
        // Representative (adult[0])
        currentIdNumber = plan.members.adult[0]?.idNumber;
      } else if (memberType === 'adult') {
        // Other adult members (adult[1], adult[2], ...)
        const localIndex = globalIndex - 1; // Convert globalIndex to local array index
        currentIdNumber = plan.members.adult[localIndex]?.idNumber;
      } else if (memberType === 'child') {
        // Child members
        currentIdNumber = plan.members.child[globalIndex]?.idNumber;
      } else if (memberType === 'infant') {
        // Infant members
        currentIdNumber = plan.members.infant[globalIndex]?.idNumber;
      }
      
      if (currentIdNumber && currentIdNumber.trim()) {
        // Mark field as touched for validation (but no error display)
        // Calculate localIndex for touched key
        let localIndex;
        if (memberType === 'adult') {
          localIndex = globalIndex; // Adult members: globalIndex = localIndex
        } else if (memberType === 'child') {
          localIndex = globalIndex - plan.members.adult.length;
        } else if (memberType === 'infant') {
          localIndex = globalIndex - plan.members.adult.length - plan.members.child.length;
        } else {
          localIndex = globalIndex;
        }
        const idKey = `${memberType}_${localIndex}_idNumber`;
        setTouchedFieldsWithRef(prev => new Set(prev).add(idKey));
        
        // No error display - validation only happens in useEffect for Next button blocking
      }
    } else {
      // Clear when empty
      setConfirmedNationalities(prev => {
        const newState = { ...prev };
        delete newState[key];
        return newState;
      });
    }
  };

  const handleNationalityConfirm = (memberType, index, value) => {
    const key = `${memberType}-${index}`;
    setConfirmedNationalities(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const getMemberTypeLabel = (type) => {
    switch (type) {
      case 'adult': return t('booking.step2.pax.adult');
      case 'child': return t('booking.step2.pax.child');
      case 'infant': return t('booking.step2.pax.infant');
      default: return type;
    }
  };

  const memberTypeIcons = {
    adult: UserRound,
    child: UsersIcon,
    infant: Baby
  };

  const getMemberTypePrice = (type) => {
    const price = (() => {
      switch (type) {
        case 'adult': return tourPrices.adult;
        case 'child': return tourPrices.child;
        case 'infant': return tourPrices.infant;
        default: return null;
      }
    })();
    
    if (price === null) return 'Chưa có giá';
    if (price === 0) return 'Miễn phí';
    return formatPrice(price);
  };

  const renderRepresentativeForm = () => {
    // Lấy tên từ contact, ngày sinh từ member (bookingGuest)
    const representativeName = contact?.fullName;
    // Prefer member's DOB (kept in Step 2 and converted on language change), fallback to contact
    const representativeDob = plan.members.adult[0]?.dob || contact?.dob;
    
    // Format date for display
    const displayDob = representativeDob ? formatDateForDisplay(representativeDob, 'representative-dob') : '';
    
    // Debug logs removed - issues resolved
    
    // Always show representative form, even if data is missing (will be filled by sync)
    if (!representativeName && !representativeDob) {
      return (
        <div className={styles['member-group']}>
          <h4 className={styles['member-group-title']}>
            {t('booking.step2.representative.title')} - {getMemberTypePrice('adult')}
          </h4>
          <div className={styles['member-card']}>
            <div className={styles['member-title']}>
              {t('booking.step2.representative.label')}
            </div>
            <div className={styles['member-form']}>
              <div className={styles['form-group']}>
                <label className={styles['form-label']}>{t('booking.step2.labels.fullName')}</label>
                <input
                  type="text"
                  value="Loading..."
                  readOnly
                  className={`${styles['form-input']} ${styles['read-only']}`}
                />
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={styles['member-group']}>
        <div className={styles['member-group-title']}>
          <div className={styles['member-group-title-text']}>
            <UserRound className={styles['member-group-icon']} />
            <span>{t('booking.step2.representative.title')}</span>
          </div>
          <span className={styles['member-group-price']}>{getMemberTypePrice('adult')}</span>
        </div>
        <div className={styles['member-card']}>
          <div className={styles['member-title']}>
            {t('booking.step2.representative.label')}
          </div>
          <div className={styles['member-form']}>
            {/* Full Name - Read Only */}
            <div className={styles['form-group']}>
              <div className={styles['label-with-icon']}>
                <PenSquare className={styles['field-icon']} />
                <label className={styles['form-label']}>{t('booking.step2.labels.fullName')}</label>
              </div>
              <input
                type="text"
                value={representativeName || ''}
                readOnly
                className={`${styles['form-input']} ${styles['read-only']}`}
                placeholder={t('booking.step2.placeholders.fullName')}
              />
            </div>

            {/* Date of Birth - Read Only */}
            <div className={styles['form-group']}>
              <div className={styles['label-with-icon']}>
                <CalendarDays className={styles['field-icon']} />
                <label className={styles['form-label']}>{t('booking.step2.labels.dob')}</label>
              </div>
              <input
                type="text"
                value={displayDob}
                readOnly
                className={`${styles['form-input']} ${styles['read-only']}`}
                placeholder={t('booking.step2.placeholders.dateFormat', { format: getDateFormat() })}
              />
            </div>

            {/* Gender - Read Only (from Step 1) */}
            <div className={styles['form-group']}>
              <div className={styles['label-with-icon']}>
                <GenderIcon />
                <label className={`${styles['form-label']} ${styles['required']}`}>{t('booking.step2.labels.gender')}</label>
              </div>
              <input
                type="text"
                value={(() => {
                  const g = plan.members.adult[0]?.gender || contact?.gender || '';
                  if (!g) return '';
                  if (g === 'male') return t('profile.genderOptions.male');
                  if (g === 'female') return t('profile.genderOptions.female');
                  if (g === 'other') return t('profile.genderOptions.other');
                  return g;
                })()}
                readOnly
                className={`${styles['form-input']} ${styles['read-only']}`}
                placeholder={t('booking.step2.placeholders.chooseGender')}
              />
            </div>

            {/* Nationality - Editable */}
            <div className={styles['form-group']}>
              <div className={styles['label-with-icon']}>
                <Globe className={styles['field-icon']} />
                <label htmlFor="representative-nationality" className={`${styles['form-label']} ${styles['required']}`}>{t('booking.step2.labels.nationality')}</label>
              </div>
              <select
                id="representative-nationality"
                value={plan.members.adult[0]?.nationality || ''}
                onChange={(e) => handleNationalityChange('adult', 0, e.target.value)}
                onBlur={() => setTouchedFieldsWithRef(prev => new Set(prev).add('adult_0_nationality'))}
                className={`${styles['form-select']} ${errors['adult_0_nationality'] && touchedFields.has('adult_0_nationality') ? styles['error'] : ''}`}
              >
                <option value="">{t('booking.step2.placeholders.chooseNationality')}</option>
                {countries.map(({code, label}) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </select>
              {errors['adult_0_nationality'] && touchedFields.has('adult_0_nationality') && (
                <span className={styles['form-error']}>{errors['adult_0_nationality']}</span>
              )}
            </div>

            {/* ID Number - Always visible, disabled until nationality is selected */}
            <div className={styles['form-group']}>
              {(() => {
                const nationality = confirmedNationalities['adult-0'] || plan.members.adult[0]?.nationality;
                const departureDate = plan.date.year && plan.date.month && plan.date.day 
                  ? new Date(plan.date.year, plan.date.month - 1, plan.date.day)
                  : null;
                const idRequired = isIdRequired(plan.members.adult[0]?.dob, nationality);
                const age = calculateAge(plan.members.adult[0]?.dob, departureDate);
                
                // Adult[0] always shows ID field (for testing error messages)
                const touchedKey = 'adult_0_idNumber';
                const errorKey = 'adult_0_idNumber';
                const hasError = errors[errorKey] && touchedFields.has(touchedKey);
                const isDisabled = !nationality; // Disable when no nationality selected
                
                return (
                  <>
                    <div className={styles['label-with-icon']}>
                      <BookUser className={styles['field-icon']} />
                      <label htmlFor="representative-idNumber" className={`${styles['form-label']} ${idRequired ? styles['required'] : ''}`}>
                        {t('booking.step2.labels.idNumberPassport')}
                      </label>
                    </div>
                    <input
                      type="text"
                      id="representative-idNumber"
                      value={plan.members.adult[0]?.idNumber || ''}
                      onChange={(e) => handleIdNumberChange('adult', 0, e.target.value)}
                      onBlur={() => handleIdNumberBlur('adult', 0)}
                      disabled={isDisabled}
                      className={`${styles['form-input']} ${hasError ? styles['error'] : ''} ${isDisabled ? styles['disabled'] : ''}`}
                      placeholder={isDisabled ? t('booking.step2.placeholders.selectNationalityFirst') || 'Vui lòng chọn quốc tịch trước' : t('booking.step2.placeholders.idPassport')}
                    />
                    {/* Always show error if exists, regardless of touched state (for debugging) */}
                    {errors[errorKey] && (
                      <span className={styles['form-error']}>{errors[errorKey]}</span>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderMemberForm = (memberType, members) => {
    if (members.length === 0) return null;

    return (
      <div key={memberType} className={styles['member-group']}>
        <div className={styles['member-group-title']}>
          <div className={styles['member-group-title-text']}>
            {memberTypeIcons[memberType] && (
              <span className={styles['member-group-icon-wrapper']}>
                {React.createElement(memberTypeIcons[memberType], { className: styles['member-group-icon'] })}
              </span>
            )}
            <span>{`${getMemberTypeLabel(memberType)} (${members.length})`}</span>
          </div>
          <span className={styles['member-group-price']}>{getMemberTypePrice(memberType)}</span>
        </div>
        {members.map((member, localIndex) => {
          // Safety check: skip if member is undefined
          if (!member) {
            return null;
          }
          
          // Calculate global index to match useEffect validation
          // For adult: globalIndex = localIndex
          // For child: globalIndex = localIndex + adult.length
          // For infant: globalIndex = localIndex + adult.length + child.length
          let globalIndex;
          if (memberType === 'adult') {
            globalIndex = localIndex;
          } else if (memberType === 'child') {
            globalIndex = localIndex + plan.members.adult.length;
          } else if (memberType === 'infant') {
            globalIndex = localIndex + plan.members.adult.length + plan.members.child.length;
          } else {
            globalIndex = localIndex;
          }
          
          
          return (
            <div key={`${memberType}-${localIndex}`} className={styles['member-card']}>
              <div className={styles['member-title']}>
                <div className={styles['label-with-icon']}>
                  {memberTypeIcons[memberType] && (
                    React.createElement(memberTypeIcons[memberType], { className: styles['field-icon'] })
                  )}
                  <span>{`${getMemberTypeLabel(memberType)} ${localIndex + 1}`}</span>
                </div>
              </div>
              <div className={styles['member-form']}>
              <div className={styles['form-group']}>
                <div className={styles['label-with-icon']}>
                  <PenSquare className={styles['field-icon']} />
                  <label
                    htmlFor={`${memberType}-${localIndex}-fullName`}
                    className={`${styles['form-label']} ${styles['required']}`}
                  >
                    {t('booking.step2.labels.fullName')}
                  </label>
                </div>
                <input
                  type="text"
                  id={`${memberType}-${localIndex}-fullName`}
                    value={member.fullName || ''}
                  onChange={(e) => handleMemberChange(memberType, globalIndex, 'fullName', e.target.value)}
                  onBlur={() => setTouchedFieldsWithRef(prev => new Set(prev).add(`${memberType}_${localIndex}_fullName`))}
                  className={`${styles['form-input']} ${errors[`member_${globalIndex}_name`] && touchedFields.has(`${memberType}_${localIndex}_fullName`) ? styles['error'] : ''}`}
                  placeholder={t('booking.step2.placeholders.fullName')}
                />
                {errors[`member_${globalIndex}_name`] && touchedFields.has(`${memberType}_${localIndex}_fullName`) && (
                  <span className={styles['form-error']}>{errors[`member_${globalIndex}_name`]}</span>
                )}
              </div>

              <div className={styles['form-group']}>
                <div className={styles['label-with-icon']}>
                  <CalendarDays className={styles['field-icon']} />
                  <label
                    htmlFor={`${memberType}-${localIndex}-dob`}
                    className={`${styles['form-label']} ${styles['required']}`}
                  >
                    {t('booking.step2.labels.dob')}
                  </label>
                </div>
                <div className={styles['date-input-container']}>
                <input
                     type="text"
                  id={`${memberType}-${localIndex}-dob`}
                     value={formatDateForDisplay(member.dob, `${memberType}-${localIndex}-dob`)}
                     onFocus={(e) => {
                       const fieldKey = `${memberType}-${localIndex}-dob`;
                       setEditingFields(prev => new Set(prev).add(fieldKey));
                       
                       // If there's a normalized date, convert it to display format for editing
                       if (member.dob && /^\d{4}-\d{2}-\d{2}$/.test(member.dob)) {
                         const displayFormat = formatDateFromNormalized(member.dob);
                         handleMemberChange(memberType, globalIndex, 'dob', displayFormat);
                       }
                     }}
                     onKeyDown={(e) => {
                       if (e.key === 'Backspace') {
                         const currentValue = e.target.value;
                         const separator = getDateSeparator();
                         
                         // Mark as deleting for any backspace
                         isDeletingRef.current = true;
                         
                         // Special case: if current value ends with separator, we're deleting separator
                         if (currentValue.endsWith(separator)) {
                           // Allow deletion of separator
                         }
                       } else if (e.key.length === 1) {
                         // If user is typing a character, reset deletion flag
                         isDeletingRef.current = false;
                       }
                       
                       // Trigger validation on Enter key
                       if (e.key === 'Enter') {
                         e.target.blur(); // This will trigger onBlur validation
                       }
                     }}
                     onChange={(e) => {
                       const rawValue = e.target.value;
                       const fieldKey = `${memberType}-${localIndex}-dob`;
                       
                       // Format the input as user types (use separate function for members)
                       const formattedValue = formatMemberDateInput(rawValue, fieldKey);
                       
                       // Store the formatted value
                       handleDateChange(memberType, globalIndex, formattedValue);
                       
                       // Real-time validation during typing
                     }}
                     onBlur={(e) => {
                       const displayValue = e.target.value;
                       const fieldKey = `${memberType}-${localIndex}-dob`;
                       
                       // Remove from editing state
                       setEditingFields(prev => {
                         const newSet = new Set(prev);
                         newSet.delete(fieldKey);
                         return newSet;
                       });
                       
                       // Mark field as touched (already done in handleDateChange)
                       // setTouchedFields(prev => new Set(prev).add(`${memberType}_${localIndex}_dob`));
                       
                       // No need for additional validation here since handleDateChange already handles it
                       // Just ensure the final validation is consistent
                       if (displayValue && displayValue.length >= 8) {
                         const normalizedDate = validateDateInput(displayValue);
                         if (normalizedDate) {
                           // Final validation check to ensure consistency
                           const validationResult = validateMemberAge(memberType, normalizedDate);
                           if (!validationResult.isValid) {
                             setErrors(prev => ({
                               ...prev,
                               [`${memberType}_${localIndex}_dob`]: validationResult.error
                             }));
                           }
                         } else {
                           setErrors(prev => ({
                             ...prev,
                             [`${memberType}_${localIndex}_dob`]: t('booking.step2.errors.dobInvalidFormat')
                           }));
                         }
                       } else if (!displayValue || displayValue.trim() === '') {
                         setErrors(prev => {
                           const newErrors = { ...prev };
                           delete newErrors[`${memberType}_${localIndex}_dob`];
                           return newErrors;
                         });
                       }
                     }}
                     className={`${styles['form-input']} ${styles['date-input']} ${errors[`${memberType}_${localIndex}_dob`] && touchedFields.has(`${memberType}_${localIndex}_dob`) ? styles['error'] : ''}`}
                     placeholder={getDateFormat()}
                     title={t('booking.step2.placeholders.dateFormat', { format: getDateFormat() })}
                   />
                   <div className={styles['date-picker-wrapper']}>
                     <button
                       type="button"
                       className={styles['date-picker-button']}
                       onClick={(e) => {
                         e.preventDefault();
                         e.stopPropagation();
                         // Trigger the hidden DatePicker for this member
                         const wrapper = e.currentTarget.parentElement;
                         const hiddenDatePicker = wrapper?.querySelector('input') || wrapper?.querySelector('button[type="button"]:not(.date-picker-button)');
                         if (hiddenDatePicker && hiddenDatePicker !== e.currentTarget) {
                           hiddenDatePicker.focus();
                           hiddenDatePicker.click();
                         }
                       }}
                       title="Open date picker"
                     >
                       <Calendar className={styles['calendar-icon']} />
                     </button>
                     <div style={{ position: 'absolute', left: '-9999px', opacity: 0, width: '1px', height: '1px', overflow: 'hidden' }}>
                       <DatePicker
                         value={(() => {
                           if (!member.dob) return null;
                           const normalized = validateDateInput(member.dob);
                           return normalized ? new Date(normalized) : null;
                         })()}
                         onChange={(date) => {
                           if (date) {
                             // Use local date components to avoid timezone issues
                             const year = date.getFullYear();
                             const month = String(date.getMonth() + 1).padStart(2, '0');
                             const day = String(date.getDate()).padStart(2, '0');
                             const normalizedDate = `${year}-${month}-${day}`;
                             const displayFormat = formatDateFromNormalized(normalizedDate);
                             
                             // Use handleDateChange for proper validation
                             handleDateChange(memberType, globalIndex, displayFormat);
                             
                             // Remove from editing state to show formatted date
                             const fieldKey = `${memberType}-${localIndex}-dob`;
                             setEditingFields(prev => {
                               const newSet = new Set(prev);
                               newSet.delete(fieldKey);
                               return newSet;
                             });
                             
                             // Set validating flag to prevent useEffect override
                             const calendarFieldKey = `${memberType}_${localIndex}_dob`;
                             const dobKey = `${memberType}_${localIndex}_dob`;
                             setValidatingFields(prev => new Set(prev).add(calendarFieldKey));
                             validatingFieldsRef.current.add(calendarFieldKey);
                             
                             // Validate immediately since user has finished selecting from calendar
                             setTimeout(() => {
                               const validationResult = validateMemberAge(memberType, normalizedDate);
                               
                               // Set error state immediately and persistently
                               setErrors(prev => {
                                 const newErrors = { ...prev };
                                 if (validationResult.isValid) {
                                   delete newErrors[dobKey];
                                 } else {
                                   newErrors[dobKey] = validationResult.error;
                                 }
                                 return newErrors;
                               });
                               
                               // Clear validating flag after delay, but only if no error
                               setTimeout(() => {
                                 // Only clear validating flag if there's no error for this field
                                 setErrors(prev => {
                                   const hasError = prev[dobKey];
                                   if (!hasError) {
                                     setValidatingFields(prev => {
                                       const newSet = new Set(prev);
                                       newSet.delete(calendarFieldKey);
                                       return newSet;
                                     });
                                     validatingFieldsRef.current.delete(calendarFieldKey);
                                   }
                                   return prev;
                                 });
                               }, 500); // 500ms to ensure useEffect doesn't override
                             }, 100); // 100ms delay to avoid conflict
                           }
                         }}
                         maxDate={new Date()}
                         onFocus={() => {}}
                         onBlur={() => {}}
                         onClick={() => {}}
                       />
                     </div>
                   </div>
                 </div>
                {errors[`${memberType}_${localIndex}_dob`] && touchedFields.has(`${memberType}_${localIndex}_dob`) && (
                  <span className={styles['form-error']}>{errors[`${memberType}_${localIndex}_dob`]}</span>
                )}
              </div>

              <div className={styles['form-group']}>
                <div className={styles['label-with-icon']}>
                  <GenderIcon />
                  <label
                    htmlFor={`${memberType}-${localIndex}-gender`}
                    className={`${styles['form-label']} ${styles['required']}`}
                  >
                    {t('booking.step2.labels.gender')}
                  </label>
                </div>
                <select
                  id={`${memberType}-${localIndex}-gender`}
                    value={member.gender || ''}
                  onChange={(e) => handleMemberChange(memberType, globalIndex, 'gender', e.target.value)}
                  onBlur={() => setTouchedFieldsWithRef(prev => new Set(prev).add(`${memberType}_${localIndex}_gender`))}
                  className={`${styles['form-select']} ${errors[`member_${globalIndex}_gender`] && touchedFields.has(`${memberType}_${localIndex}_gender`) ? styles['error'] : ''}`}
                >
                  <option value="">{t('booking.step2.placeholders.chooseGender')}</option>
                  <option value="male">{t('profile.genderOptions.male')}</option>
                  <option value="female">{t('profile.genderOptions.female')}</option>
                  <option value="other">{t('profile.genderOptions.other')}</option>
                </select>
                {errors[`member_${globalIndex}_gender`] && touchedFields.has(`${memberType}_${localIndex}_gender`) && (
                  <span className={styles['form-error']}>{errors[`member_${globalIndex}_gender`]}</span>
                )}
              </div>

              <div className={styles['form-group']}>
                <div className={styles['label-with-icon']}>
                  <Globe className={styles['field-icon']} />
                  <label
                    htmlFor={`${memberType}-${localIndex}-nationality`}
                    className={`${styles['form-label']} ${styles['required']}`}
                  >
                    {t('booking.step2.labels.nationality')}
                  </label>
                </div>
                <select
                  id={`${memberType}-${localIndex}-nationality`}
                    value={member.nationality || ''}
                  onChange={(e) => handleNationalityChange(memberType, globalIndex, e.target.value)}
                  onBlur={() => setTouchedFieldsWithRef(prev => new Set(prev).add(`${memberType}_${localIndex}_nationality`))}
                  className={`${styles['form-select']} ${errors[`member_${globalIndex}_nationality`] && touchedFields.has(`${memberType}_${localIndex}_nationality`) ? styles['error'] : ''}`}
                >
                  <option value="">{t('booking.step2.placeholders.chooseNationality')}</option>
                  {countries.map(({code, label}) => (
                    <option key={code} value={code}>
                      {label}
                    </option>
                  ))}
                </select>
                {errors[`member_${globalIndex}_nationality`] && touchedFields.has(`${memberType}_${localIndex}_nationality`) && (
                  <span className={styles['form-error']}>{errors[`member_${globalIndex}_nationality`]}</span>
                )}
              </div>

              {/* ID/Passport field - Always visible, disabled until nationality is selected */}
              <div className={styles['form-group']}>
                {(() => {
                  // Use globalIndex for key to ensure uniqueness between representative and adult members
                  const key = `${memberType}-${globalIndex}`;
                  const nationality = confirmedNationalities[key] || member.nationality;
                  const departureDate = plan.date.year && plan.date.month && plan.date.day 
                    ? new Date(plan.date.year, plan.date.month - 1, plan.date.day)
                    : null;
                  const idRequired = isIdRequired(member.dob, nationality);
                  const age = calculateAge(member.dob, departureDate);
                  
                  // For all nationalities: show passport field (required)
                  const isIdRequiredForValidation = true; // Always required for passport
                  
                  // Error key and touched key for validation
                  const touchedKey = `${memberType}_${localIndex}_idNumber`;
                  const errorKey = `${memberType}_${globalIndex}_idNumber`;
                  const hasError = errors[errorKey] && touchedFields.has(touchedKey);
                  const isDisabled = !nationality; // Disable when no nationality selected
                  
                  return (
                    <>
                      <div className={styles['label-with-icon']}>
                        <BookUser className={styles['field-icon']} />
                        <label
                          htmlFor={`${memberType}-${localIndex}-idNumber`}
                          className={`${styles['form-label']} ${isIdRequiredForValidation ? styles['required'] : ''}`}
                        >
                          {t('booking.step2.labels.idNumberPassport')}
                        </label>
                      </div>
                      <input
                        type="text"
                        id={`${memberType}-${localIndex}-idNumber`}
                        value={member.idNumber || ''}
                        onChange={(e) => handleIdNumberChange(memberType, globalIndex, e.target.value)}
                        onBlur={() => handleIdNumberBlur(memberType, globalIndex)}
                        disabled={isDisabled}
                        className={`${styles['form-input']} ${hasError ? styles['error'] : ''} ${isDisabled ? styles['disabled'] : ''}`}
                        placeholder={isDisabled ? t('booking.step2.placeholders.selectNationalityFirst') || 'Vui lòng chọn quốc tịch trước' : t('booking.step2.placeholders.idPassport')}
                      />
                      {/* Always show error if exists, regardless of touched state (for debugging) */}
                      {errors[errorKey] && (
                        <span className={styles['form-error']}>{errors[errorKey]}</span>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        );
        })}
      </div>
    );
  };

  // Show loading state while fetching tour prices
  if (loading) {
    return (
      <div className={styles['details-form']}>
        <div className={styles['loading-container']}>
          <div className={styles['loading-spinner']}></div>
          <p>{t('booking.step2.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles['details-form']}>
      {/* Date Selection */}
      <div className={styles['form-section']}>
        <h3 className={styles['section-title']}>
          <CalendarRange className={styles['section-icon']} />
          {t('booking.step2.sections.dateTitle')}
        </h3>
        <div className={styles['date-section']}>
          {/* Deadline notice - show first if tour has deadlineDays requirement */}
          {tourMeta.deadlineDays !== null && !Number.isNaN(tourMeta.deadlineDays) && tourMeta.deadlineDays > 0 && (() => {
            // Calculate minimum date (today + deadlineDays + 1)
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const minDate = new Date(today);
            minDate.setDate(minDate.getDate() + tourMeta.deadlineDays + 1);
            const minDateFormatted = formatDateWithMonthName(toIsoDate(minDate));
            return (
              <div className={`${styles['deadline-notice']} ${styles['deadline-notice--highlight']}`}>
                {t('booking.step2.fields.deadlineNotice', { 
                  days: tourMeta.deadlineDays, 
                  minDate: minDateFormatted 
                })}
              </div>
            );
          })()}
          <div className={styles['date-input-wrapper']}>
            {/* Date Picker Input */}
            <div className={styles['date-picker-group']}>
              <label htmlFor="departureDate" className={`${styles['form-label']} ${styles['required']}`}>{t('booking.step2.fields.date')}</label>
              <div className={styles['date-input-container']}>
                <input
                  type="text"
                  id="departureDate"
                  readOnly
                  value={formatDepartureDateForDisplay()}
                  className={`${styles['form-input']} ${styles['date-input']}`}
                  placeholder={t('booking.step2.placeholders.selectDepartureDate')}
                  title={t('booking.step2.placeholders.dateFormat', { format: getDateFormat() })}
                />
                <div className={styles['date-picker-wrapper']}>
                  <button
                    type="button"
                    className={styles['date-picker-button']}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      // Trigger the hidden DatePicker
                      if (departureDatePickerRef.current) {
                        const input = departureDatePickerRef.current.querySelector('input') || departureDatePickerRef.current.querySelector('button');
                        if (input) {
                          input.focus();
                          input.click();
                        }
                      }
                    }}
                    title="Open date picker"
                  >
                    <Calendar className={styles['calendar-icon']} />
                  </button>
                  <div ref={departureDatePickerRef} style={{ position: 'absolute', left: '-9999px', opacity: 0, width: '1px', height: '1px', overflow: 'hidden' }}>
                    <DatePicker
                      value={plan.date.year && plan.date.month && plan.date.day 
                        ? new Date(plan.date.year, plan.date.month - 1, plan.date.day)
                        : null
                      }
                      onChange={(date) => {
                        if (date) {
                          // Keep original logic: setDate with year, month, day separately
                          setDate({
                            year: date.getFullYear(),
                            month: date.getMonth() + 1,
                            day: date.getDate()
                          });
                        } else {
                          setDate({ day: null, month: null, year: null });
                        }
                        setDateTouched(true);
                      }}
                      minDate={(() => {
                        const minDateStr = computeMinDepartureDate();
                        if (!minDateStr) return null;
                        const [year, month, day] = minDateStr.split('-');
                        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                      })()}
                      maxDate={(() => {
                        const maxDateStr = computeMaxDepartureDate();
                        if (!maxDateStr) return null;
                        const [year, month, day] = maxDateStr.split('-');
                        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                      })()}
                      onFocus={() => {}}
                      onBlur={() => {}}
                      onClick={() => {}}
                    />
                  </div>
                </div>
              </div>
              {errors.date && dateTouched && (
                <span className={styles['form-error']}>{errors.date}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Pax Counter */}
      <div className={styles['form-section']}>
        <h3 className={styles['section-title']}>
          <UsersIcon className={styles['section-icon']} />
          {t('booking.step2.sections.paxTitle')}
        </h3>
        <div className={styles['pax-section']}>
           <div className={styles['pax-card']}>
             <div className={styles['pax-title']}>{t('booking.step2.pax.adult')}</div>
             <div className={styles['pax-price']}>
               {(() => {
                 if (tourPrices.adult === null) return t('booking.step2.common.noPrice');
                 if (tourPrices.adult === 0) return t('booking.step2.common.free');
                 return formatPrice(tourPrices.adult);
               })()}
             </div>
            <div className={styles['pax-counter']}>
              <button
                className={`${styles['pax-button']} ${styles['decrement']}`}
                onClick={() => handlePaxChange('adult', 'decrement')}
                disabled={plan.pax.adult <= 1}
                title={plan.pax.adult <= 1 ? t('booking.step2.pax.adultMinHint') : ""}
              >
                -
              </button>
              <span className={styles['pax-count']}>{plan.pax.adult}</span>
              <button
                className={`${styles['pax-button']} ${styles['increment']}`}
                onClick={() => handlePaxChange('adult', 'increment')}
              >
                +
              </button>
            </div>
          </div>

           <div className={styles['pax-card']}>
             <div className={styles['pax-title']}>{t('booking.step2.pax.child')}</div>
             <div className={styles['pax-price']}>
               {(() => {
                 if (tourPrices.child === null) return t('booking.step2.common.noPrice');
                 if (tourPrices.child === 0) return t('booking.step2.common.free');
                 return formatPrice(tourPrices.child);
               })()}
             </div>
            <div className={styles['pax-counter']}>
              <button
                className={`${styles['pax-button']} ${styles['decrement']}`}
                onClick={() => handlePaxChange('child', 'decrement')}
                disabled={plan.pax.child <= 0}
              >
                -
              </button>
              <span className={styles['pax-count']}>{plan.pax.child}</span>
              <button
                className={`${styles['pax-button']} ${styles['increment']}`}
                onClick={() => handlePaxChange('child', 'increment')}
              >
                +
              </button>
            </div>
          </div>

           <div className={styles['pax-card']}>
             <div className={styles['pax-title']}>{t('booking.step2.pax.infant')}</div>
             <div className={styles['pax-price']}>
               {(() => {
                 if (tourPrices.infant === null) return t('booking.step2.common.noPrice');
                 if (tourPrices.infant === 0) return t('booking.step2.common.free');
                 return formatPrice(tourPrices.infant);
               })()}
             </div>
            <div className={styles['pax-counter']}>
              <button
                className={`${styles['pax-button']} ${styles['decrement']}`}
                onClick={() => handlePaxChange('infant', 'decrement')}
                disabled={plan.pax.infant <= 0}
              >
                -
              </button>
              <span className={styles['pax-count']}>{plan.pax.infant}</span>
              <button
                className={`${styles['pax-button']} ${styles['increment']}`}
                onClick={() => handlePaxChange('infant', 'increment')}
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Members List */}
      <div className={styles['form-section']}>
        <h3 className={styles['section-title']}>
          <IdCard className={styles['section-icon']} />
          {t('booking.step2.sections.membersTitle')}
        </h3>
        <div className={styles['members-section']}>
          {/* All adult members (no representative anymore) */}
          {plan.members.adult.length > 0 && renderMemberForm('adult', plan.members.adult)}
          {plan.members.child.length > 0 && renderMemberForm('child', plan.members.child)}
          {plan.members.infant.length > 0 && renderMemberForm('infant', plan.members.infant)}
        </div>
      </div>

      {/* Navigation is handled by parent component */}
    </div>
  );
};

// No props needed - navigation handled by parent
export default Step2Details;
