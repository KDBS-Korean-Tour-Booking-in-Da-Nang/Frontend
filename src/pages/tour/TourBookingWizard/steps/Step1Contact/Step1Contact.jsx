import React, { useState, useEffect, useRef } from 'react';
import { useTourBooking } from '../../../../../hooks/useTourBooking';
import { useAuth } from '../../../../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { DatePicker } from 'react-rainbow-components';
import {
  Calendar,
  UserRound,
  Phone,
  Mail,
  Home,
  MapPin,
  PenSquare,
  CalendarDays,
  StickyNote,
  UserCheck,
  Info
} from 'lucide-react';
import styles from './Step1Contact.module.css';

const Step1Contact = () => {
  const { contact, setContact } = useTourBooking();
  const { user, refreshUser, loading: authLoading } = useAuth();
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language || 'vi';
  const [errors, setErrors] = useState({});
  const [isValid, setIsValid] = useState(false);
  const [usePersonalInfo, setUsePersonalInfo] = useState(false);
  const [autoFilledFields, setAutoFilledFields] = useState(new Set());
  const [touchedFields, setTouchedFields] = useState(new Set());
  const touchedFieldsRef = useRef(new Set()); // Ref to track touched fields for event handler
  const [editingFields, setEditingFields] = useState(new Set()); // Track which fields are being edited
  const [validatingFields, setValidatingFields] = useState(new Set()); // Track fields being validated manually
  const validatingFieldsRef = useRef(new Set()); // Ref to avoid useEffect dependency
  const [isDeleting, setIsDeleting] = useState(false); // Track if user is deleting
  const previousValueRef = useRef(''); // Track previous value to detect deletion
  const isDeletingRef = useRef(false); // Ref to track deletion state without causing re-renders
  const originalAutoFilledNameRef = useRef(null); // Track original auto-filled name with special characters
  const [hasUserInStorage, setHasUserInStorage] = useState(false); // Track if user exists in storage
  const datePickerRef = useRef(null); // Ref for DatePicker to trigger programmatically
  
  // Helper function to set touched fields and sync with ref
  const setTouchedFieldsWithRef = (updater) => {
    setTouchedFields(prev => {
      const newValue = typeof updater === 'function' ? updater(prev) : updater;
      touchedFieldsRef.current = newValue;
      return newValue;
    });
  };
  
  // Date formatting helpers (copied from Step2Details)
  const getDateSeparator = () => {
    switch (currentLanguage) {
      case 'vi': return '/';
      case 'en': return '/';
      case 'ko': return '.';
      default: return '/';
    }
  };

  const formatDateInput = (value, fieldKey) => {
    if (!value) return '';
    
    // Only allow numbers and separators
    const cleanValue = value.replace(/[^\d\/\.]/g, '');
    
    const separator = getDateSeparator();
    let parts = cleanValue.split(separator);
    
    // Detect if user is deleting by comparing with previous value
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
    
    
    
    // Helper function to check if year is leap year
    const isLeapYear = (year) => {
      return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    };
    
    // Helper function to get days in month
    const getDaysInMonth = (month, year) => {
      const monthNum = parseInt(month);
      const yearNum = parseInt(year);
      
      // Months with 31 days: 1, 3, 5, 7, 8, 10, 12
      if ([1, 3, 5, 7, 8, 10, 12].includes(monthNum)) {
        return 31;
      }
      // Months with 30 days: 4, 6, 9, 11
      else if ([4, 6, 9, 11].includes(monthNum)) {
        return 30;
      }
      // February: 28 days (29 in leap year)
      else if (monthNum === 2) {
        return isLeapYear(yearNum) ? 29 : 28;
      }
      
      return 31; // Default fallback
    };
    
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
    
    // If any part is empty, don't add separators automatically - just return the clean value
    // This allows free deletion during incomplete input
    const hasEmptyParts = parts.some(part => part === '');
    if (hasEmptyParts) {
      return cleanValue;
    }
    
    // Allow deletion of partial input without forcing separators
    // Check if user is in the middle of typing (incomplete parts)
    const hasIncompleteParts = parts.some(part => {
      if (currentLanguage === 'ko') {
        // For Korean (YYYY.MM.DD): year should be 4 digits, month/day should be 2 digits
        return part.length > 0 && (
          (part === parts[0] && part.length < 4) || // year incomplete
          (part !== parts[0] && part.length < 2)    // month/day incomplete
        );
      } else {
        // For Vietnamese (DD/MM/YYYY) and English (MM/DD/YYYY): month/day should be 2 digits
        return part.length > 0 && part.length < 2;
      }
    });
    
    if (hasIncompleteParts) {
      return cleanValue;
    }
    
    // Handle different language formats
    switch (currentLanguage) {
      case 'vi': // DD/MM/YYYY
        if (parts.length === 1) {
          let day = parts[0];
          if (day.length > 2) day = day.substring(0, 2);
          if (parseInt(day) > 31) day = '31';
          if (parseInt(day) > 3 && day.length === 1) day = '0' + day;
          
          // Only add separator automatically if day is complete and valid
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
          
          // Only add separator after month if month is complete (2 digits) and valid
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
          
          // Only add separator automatically if month is complete and valid
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
          
          // Only add separator after day if day is complete (2 digits) and valid
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
          
          // Only add separator automatically if year is complete (4 digits)
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
          
          // Only add separator after month if month is complete (2 digits) and valid
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

  const getDateFormat = () => {
    switch (currentLanguage) {
      case 'vi': return 'DD/MM/YYYY';
      case 'en': return 'MM/DD/YYYY';
      case 'ko': return 'YYYY.MM.DD';
      default: return 'MM/DD/YYYY';
    }
  };

  // Helper function to normalize date to standard format (YYYY-MM-DD)
  const normalizeDateToStandard = (dateString, fromLanguage) => {
    if (!dateString) return '';
    
    try {
      let day, month, year;
      
      // Parse based on source language
      switch (fromLanguage) {
        case 'vi': // DD/MM/YYYY
          const viParts = dateString.split('/');
          if (viParts.length === 3) {
            day = viParts[0];
            month = viParts[1];
            year = viParts[2];
          }
          break;
        case 'en': // MM/DD/YYYY
          const enParts = dateString.split('/');
          if (enParts.length === 3) {
            month = enParts[0];
            day = enParts[1];
            year = enParts[2];
          }
          break;
        case 'ko': // YYYY.MM.DD
          const koParts = dateString.split('.');
          if (koParts.length === 3) {
            year = koParts[0];
            month = koParts[1];
            day = koParts[2];
          }
          break;
      }
      
      if (!day || !month || !year) return dateString;
      
      // Normalize to standard format (YYYY-MM-DD)
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    } catch (error) {
      return dateString;
    }
  };

  // Helper function to parse date from any format and convert to target format
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

  const parseDateFromDisplay = (displayValue) => {
    if (!displayValue || displayValue.trim() === '') {
      return null;
    }

    const separator = getDateSeparator();
    const parts = displayValue.split(separator);
    
    if (parts.length !== 3) {
      return null;
    }

    let day, month, year;
    
    switch (currentLanguage) {
      case 'vi': // DD/MM/YYYY
        day = parts[0];
        month = parts[1];
        year = parts[2];
        break;
      case 'ko': // YYYY.MM.DD
        year = parts[0];
        month = parts[1];
        day = parts[2];
        break;
      default: // MM/DD/YYYY
        month = parts[0];
        day = parts[1];
        year = parts[2];
        break;
    }
    
    const date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
  };

  const validateDateInput = (inputValue) => {
    if (!inputValue || inputValue.trim() === '') {
      return null;
    }

    // First try to parse using language-specific format
    const parsedDate = parseDateFromDisplay(inputValue);
    
    if (parsedDate) {
      return parsedDate;
    }
    
      // If parsing failed, return null
      return null;
  };

  // Date display function that actively converts to current language format
  const formatDateForDisplay = (dateString, fieldKey) => {
    if (!dateString || dateString === '') return '';
    
    // If field is being edited, do not transform user input
    if (editingFields.has(fieldKey)) {
      return dateString;
    }
    
    // If normalized YYYY-MM-DD, format directly for current language
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
    
    // Otherwise, try to parse existing string and convert to current language
    try {
      const converted = parseAndConvertDate(dateString, null, currentLanguage);
      return converted || dateString;
    } catch (_) {
      return dateString;
    }
  };

  const formatDateFromNormalized = (dateString) => {
    if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return '';
    }

    const [year, month, day] = dateString.split('-');
    const separator = getDateSeparator();
    
    switch (currentLanguage) {
      case 'vi': return `${day}${separator}${month}${separator}${year}`;
      case 'en': return `${month}${separator}${day}${separator}${year}`;
      case 'ko': return `${year}${separator}${month}${separator}${day}`;
      default: return `${day}${separator}${month}${separator}${year}`;
    }
  };

  // Simple date change handler
  const handleDateChange = (value) => {
    // Update only contact data (merge manually; setContact expects plain object)
    setContact({ ...contact, dob: value });
  };
  
  // Handle auto-fill from user personal info
  const handleUsePersonalInfo = async (checked) => {
    setUsePersonalInfo(checked);
    
    if (checked) {
      // Get user data - try context first, then storage as fallback (for refresh scenarios)
      let currentUser = user;
      
      // If user is not loaded from context yet, try to get from storage
      if (!currentUser && !authLoading) {
        try {
          const savedUser = sessionStorage.getItem('user') || localStorage.getItem('user');
          if (savedUser) {
            currentUser = JSON.parse(savedUser);
          }
        } catch (error) {
          // Error parsing user from storage
        }
      }
      
      // Wait for auth to finish loading if still loading
      if (!currentUser && authLoading) {
        // Wait a bit for auth to finish loading
        await new Promise(resolve => setTimeout(resolve, 100));
        currentUser = user;
        // If still not available, try storage again
        if (!currentUser) {
          try {
            const savedUser = sessionStorage.getItem('user') || localStorage.getItem('user');
            if (savedUser) {
              currentUser = JSON.parse(savedUser);
            }
          } catch (error) {
            // Error parsing user from storage
          }
        }
      }
      
      if (!currentUser) {
        return;
      }
      
      // Refresh user data from server to ensure we have the latest information
      // Only refresh if context user is available (refreshUser requires context user)
      if (user && user.email) {
        try {
          const refreshedUser = await refreshUser();
          if (refreshedUser) {
            currentUser = refreshedUser;
          }
        } catch (error) {
          // Continue with existing user data if refresh fails
        }
      }
      // If user was loaded from storage but context hasn't updated yet,
      // use the stored user data directly (it will be refreshed next time when context loads)
      
      const newContact = { ...contact };
      const newAutoFilledFields = new Set();
      
      // Map user data to contact fields (use currentUser which may be refreshed)
      const profileName = currentUser.username || currentUser.name || currentUser.fullName;
      if (profileName) {
        // Clean the name to allow letters, numbers, spaces, and common special characters
        // Allowed special characters: parentheses (), hyphens -, apostrophes ', dots .
        const hasLetter = /[\p{L}\p{M}]/u.test(profileName);
        const cleanedName = profileName.split('').filter(char => {
          const isLetter = /[\p{L}\p{M}]/u.test(char);
          const isDigit = /\d/u.test(char);
          const isSpace = /\s/u.test(char);
          const isAllowedSpecialChar = /[()\-'.]/u.test(char);
          if (isLetter || isSpace || isAllowedSpecialChar) return true;
          if (isDigit && hasLetter) return true;
          return false;
        }).join('').replace(/\s+/g, ' ');
        
        if (cleanedName.trim()) {
          newContact.fullName = cleanedName;
          newAutoFilledFields.add('fullName');
        }
      }
      if (currentUser.email) {
        newContact.email = currentUser.email;
        newAutoFilledFields.add('email');
      }
      if (currentUser.phone) {
        newContact.phone = currentUser.phone;
        newAutoFilledFields.add('phone');
      }
      if (currentUser.address) {
        newContact.address = currentUser.address;
        newAutoFilledFields.add('address');
      }
      // Map gender from user profile (handle M/F/O, MALE/FEMALE/OTHER, and lowercase)
      if (currentUser.gender) {
        const mappedGender = (g => {
          const u = String(g).trim().toUpperCase();
          if (u === 'M' || u === 'MALE') return 'male';
          if (u === 'F' || u === 'FEMALE') return 'female';
          if (u === 'O' || u === 'OTHER') return 'other';
          if (u === 'NAM') return 'male';
          if (u === 'NỮ' || u === 'NU') return 'female';
          if (u === 'KHÁC' || u === 'KHAC') return 'other';
          if (u === 'MALE' || u === 'FEMALE' || u === 'OTHER') return u.toLowerCase();
          return '';
        })(currentUser.gender);
                  if (mappedGender) {
            newContact.gender = mappedGender;
            newAutoFilledFields.add('gender');
          }
      }
      // Date of birth: if available in profile, normalize and put directly into contact
      if (currentUser.dob) {
        try {
          let iso = '';
          if (/^\d{4}-\d{2}-\d{2}$/.test(currentUser.dob)) {
            iso = currentUser.dob;
          } else {
            const d = new Date(currentUser.dob);
            if (!isNaN(d.getTime())) {
              iso = d.toISOString().slice(0, 10);
            }
          }
          if (iso) {
            const displayDob = formatDateFromNormalized(iso);
            if (displayDob) {
              // set dob into contact object before committing state
              newContact.dob = displayDob;
              // mark as touched so error shows
              setTouchedFieldsWithRef(prev => new Set(prev).add('dob'));
              // validate 18+
              const normalized = validateDateInput(displayDob);
              if (normalized) {
                const birth = new Date(normalized);
                const today = new Date();
                let age = today.getFullYear() - birth.getFullYear();
                const md = today.getMonth() - birth.getMonth();
                if (md < 0 || (md === 0 && today.getDate() < birth.getDate())) age--;
                setErrors(prev => {
                  const ne = { ...prev };
                  if (age < 18) ne.dob = t('booking.errors.representativeTooYoung'); else delete ne.dob;
                  return ne;
                });
              } else {
                setErrors(prev => ({ ...prev, dob: t('booking.errors.dobInvalidFormat') }));
              }
            }
          }
        } catch (_) {}
      }

      // Clear any existing errors before auto-filling to prevent showing errors
      setErrors({});
      
      // commit new contact after composing all fields (including dob if any)
      setContact(newContact);
      setAutoFilledFields(newAutoFilledFields);
      
      // Don't mark auto-filled fields as touched to prevent showing errors
      // Only mark fields that need validation feedback (like dob for age check)
      const newTouchedFields = new Set();
      // Only mark dob as touched if it was auto-filled and needs age validation
      if (newContact.dob) {
        newTouchedFields.add('dob');
      }
      setTouchedFieldsWithRef(newTouchedFields);
      
      // Validate auto-filled fields to ensure they're valid (but don't show errors)
      // Use setTimeout to ensure state updates are processed first
      setTimeout(() => {
        Object.keys(newContact).forEach(fieldName => {
          if (newContact[fieldName]) {
            // Validate silently (errors won't show because fields aren't touched)
            validateField(fieldName, newContact[fieldName]);
          }
        });
      }, 0);
    } else {
      // Clear auto-filled fields when unchecked
      setAutoFilledFields(new Set());
      // Note: We don't clear the contact data when unchecked to preserve user input
      // The user can manually edit the fields if they want to change them
    }
  };

  // Expose isValid to parent component for navigation validation
  // Handle language change - re-format dates and update displays
  useEffect(() => {
    // When language changes, we need to update the display format of dates
    // but keep the actual stored values unchanged
    
    // Force re-render of date field by clearing editing state
    setIsDeleting(false);
    previousValueRef.current = '';
    
    // Re-validate all fields with new language-specific error messages
    if (Object.keys(errors).length > 0) {
      setErrors({});
      // Trigger validation on next tick to ensure UI updates
      setTimeout(() => {
        // This will trigger the validation useEffect
      }, 0);
    }
  }, [currentLanguage]);

  useEffect(() => {
    // This could be used by parent component if needed
    window.bookingStep1Valid = isValid;
  }, [isValid]);

  // Sync touchedFieldsRef with touchedFields state
  useEffect(() => {
    touchedFieldsRef.current = touchedFields;
  }, [touchedFields]);

  // Validation rules
  const validateField = (name, value) => {
    // Use functional updater to avoid race conditions when validating multiple fields
    setErrors(prevErrors => {
      const newErrors = { ...prevErrors };

      switch (name) {
      case 'fullName': {
        // Regex to allow letters, numbers, spaces, and common special characters: parentheses, hyphens, apostrophes, dots
        // Supports international names like: José, François, Müller, 李小明, 田中太郎, etc.
        // Also allows numbers and special chars like: John123, Mary2, Tran Viet Tinh (K17 DN), etc.
        const nameRegex = /^[\p{L}\p{M}\d\s()\-'.]+$/u;
        
        if (!value.trim()) {
          newErrors.fullName = t('booking.errors.fullNameRequired');
        } else {
          // Check if there's at least one letter (required)
          const hasLetter = /[\p{L}\p{M}]/u.test(value.trim());
          
          if (!hasLetter) {
            // No letter found, invalid name
            newErrors.fullName = t('booking.errors.fullNameInvalid');
          } else {
            // Validate that name contains letters, numbers, spaces, and allowed special characters
            if (!nameRegex.test(value.trim())) {
              newErrors.fullName = t('booking.errors.fullNameInvalid');
            } else {
              delete newErrors.fullName;
            }
          }
        }
        break;
      }

      case 'phone': {
        // Updated regex: Vietnamese format (0xxxxxxxxx) or international formats with space
        const vietnameseRegex = /^0\d{9}$/;
        const internationalRegex = /^\+(\d{1,3})\s?\d{6,14}$/;
        
        if (!value.trim()) {
          newErrors.phone = t('booking.errors.phoneRequired');
        } else if (!vietnameseRegex.test(value) && !internationalRegex.test(value)) {
          newErrors.phone = t('booking.errors.phoneInvalid');
        } else {
          delete newErrors.phone;
        }
        break;
      }

      case 'email': {
        const emailRegex = /^\S+@\S+\.\S+$/;
        if (!value.trim()) {
          newErrors.email = t('booking.errors.emailRequired');
        } else if (!emailRegex.test(value)) {
          newErrors.email = t('booking.errors.emailInvalid');
        } else {
          delete newErrors.email;
        }
        break;
      }

      case 'dob': {
        if (!value.trim()) {
          newErrors.dob = t('booking.errors.dobRequired');
        } else {
          // Validate date format using helper function
          const normalizedDate = validateDateInput(value);
          if (!normalizedDate) {
            newErrors.dob = t('booking.errors.dobInvalidFormat');
          } else {
            // Validate age (≥18 for representative)
            const birthDate = new Date(normalizedDate);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
              age--;
            }
            
            if (age < 18) {
              newErrors.dob = t('booking.errors.representativeTooYoung');
            } else {
              delete newErrors.dob;
            }
          }
        }
        break;
      }

      case 'address': {
        if (!value.trim()) {
          newErrors.address = t('booking.errors.addressRequired');
        } else {
          delete newErrors.address;
        }
        break;
      }

      case 'pickupPoint': {
        if (!value.trim()) {
          newErrors.pickupPoint = t('booking.errors.pickupPointRequired');
        } else {
          delete newErrors.pickupPoint;
        }
        break;
      }

      default:
        break;
      }

      return newErrors;
    });
  };

  // Listen for validation trigger from parent component (when Next is clicked)
  useEffect(() => {
    const handleValidateAll = () => {
      // Only validate and mark touched for fields that haven't been touched yet
      // This preserves the realtime validation logic for fields that user has already interacted with
      const requiredFields = ['fullName', 'phone', 'email', 'dob', 'address', 'pickupPoint'];
      
      // Get current touched fields from ref (to avoid closure issues)
      const currentTouchedFields = touchedFieldsRef.current;
      const fieldsToValidate = [];
      
      // Identify fields that haven't been touched yet
      requiredFields.forEach(fieldName => {
        if (!currentTouchedFields.has(fieldName)) {
          fieldsToValidate.push(fieldName);
        }
      });
      
      // Mark untouched fields as touched and validate them
      if (fieldsToValidate.length > 0) {
        // First, mark all untouched fields as touched
        setTouchedFieldsWithRef(prev => {
          const newTouchedFields = new Set(prev);
          fieldsToValidate.forEach(fieldName => {
            newTouchedFields.add(fieldName);
          });
          return newTouchedFields;
        });
        
        // Then validate all untouched fields immediately (don't wait for state update)
        // This ensures errors are set right away
        fieldsToValidate.forEach(fieldName => {
          const value = contact[fieldName];
          validateField(fieldName, value || '');
        });
      }
    };
    
    // Listen for custom event from parent component
    window.addEventListener('validateStep1', handleValidateAll);
    
    return () => {
      window.removeEventListener('validateStep1', handleValidateAll);
    };
  }, [contact, validateField]);

  // Handle language change and convert date format
  useEffect(() => {
    // Check contact.dob only
    const currentDob = contact.dob;
    
    if (currentDob && currentDob.trim() !== '') {
      // Always try to convert when language changes, regardless of current format
      // This ensures proper conversion between Vietnamese and English formats
      
      // Detect source language by separator and structure (same as Step2Details)
      let fromLang = null;
      if (currentDob.includes('.')) {
        fromLang = 'ko';
      } else if (currentDob.includes('/')) {
        const parts = currentDob.split('/');
        if (parts.length === 3) {
          const first = parseInt(parts[0], 10);
          const second = parseInt(parts[1], 10);
          fromLang = (first > 12) ? 'vi' : 'en';
        }
      }
      
      const convertedDate = parseAndConvertDate(currentDob, fromLang, currentLanguage);
      
      if (convertedDate && convertedDate !== currentDob) {
        handleDateChange(convertedDate);
      }
    }
  }, [currentLanguage]); // Only trigger when language changes

  // Check if user exists in storage (for refresh scenarios)
  useEffect(() => {
    const checkUserInStorage = () => {
      try {
        const savedUser = sessionStorage.getItem('user') || localStorage.getItem('user');
        setHasUserInStorage(!!savedUser);
      } catch (error) {
        setHasUserInStorage(false);
      }
    };
    
    checkUserInStorage();
    
    // Also check when auth loading completes
    if (!authLoading) {
      checkUserInStorage();
    }
  }, [authLoading, user]);

  // Update error messages when language changes
  useEffect(() => {
    // If there are existing errors, re-translate them
    if (Object.keys(errors).length > 0) {
      const updatedErrors = {};
      
      Object.keys(errors).forEach(fieldName => {
        const errorValue = errors[fieldName];
        
        // Re-translate error messages based on field and current error type
        switch (fieldName) {
          case 'fullName':
            if (!contact.fullName?.trim()) {
              updatedErrors.fullName = t('booking.errors.fullNameRequired');
            } else {
              updatedErrors.fullName = t('booking.errors.fullNameInvalid');
            }
            break;
          case 'phone':
            if (!contact.phone?.trim()) {
              updatedErrors.phone = t('booking.errors.phoneRequired');
            } else {
              updatedErrors.phone = t('booking.errors.phoneInvalid');
            }
            break;
          case 'email':
            if (!contact.email?.trim()) {
              updatedErrors.email = t('booking.errors.emailRequired');
            } else if (errorValue.includes('không khớp') || errorValue.includes('does not match') || errorValue.includes('일치하지')) {
              updatedErrors.email = t('booking.errors.emailMismatch');
            } else {
              updatedErrors.email = t('booking.errors.emailInvalid');
            }
            break;
          case 'dob':
            if (!contact.dob?.trim()) {
              updatedErrors.dob = t('booking.errors.dobRequired');
            } else if (errorValue.includes('18 tuổi') || errorValue.includes('18 years') || errorValue.includes('18세')) {
              updatedErrors.dob = t('booking.errors.representativeTooYoung');
            } else {
              updatedErrors.dob = t('booking.errors.dobInvalidFormat');
            }
            break;
          case 'address':
            updatedErrors.address = t('booking.errors.addressRequired');
            break;
          case 'pickupPoint':
            updatedErrors.pickupPoint = t('booking.errors.pickupPointRequired');
            break;
          default:
            // Keep original error if we don't know how to translate it
            updatedErrors[fieldName] = errorValue;
        }
      });
      
      setErrors(updatedErrors);
    }
  }, [currentLanguage, t]); // Trigger when language or translation function changes

  // Check if all required fields are valid
  useEffect(() => {
    const requiredFields = ['fullName', 'phone', 'email', 'dob', 'address', 'pickupPoint'];
    const allValid = requiredFields.every(field => {
      const value = contact[field];
      // Always check validation for real-time feedback
      return value?.trim() && !errors[field];
    });
    setIsValid(allValid);
  }, [contact, errors]);


  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Special handling for full name input - allow letters, numbers, spaces, and common special characters
    // Supports: parentheses (), hyphens -, apostrophes ', dots .
    // But require at least one letter before allowing numbers
    let processedValue = value;
    if (name === 'fullName') {
      // Check if there's at least one letter in the current value
      const hasLetter = /[\p{L}\p{M}]/u.test(value);
      
      // Filter characters: allow letters, spaces, and allowed special characters always
      // Allow digits only if there's at least one letter
      // Allowed special characters: parentheses (), hyphens -, apostrophes ', dots .
      processedValue = value.split('').filter(char => {
        const isLetter = /[\p{L}\p{M}]/u.test(char);
        const isDigit = /\d/u.test(char);
        const isSpace = /\s/u.test(char);
        const isAllowedSpecialChar = /[()\-'.]/u.test(char);
        
        // Always allow letters, spaces, and allowed special characters
        if (isLetter || isSpace || isAllowedSpecialChar) {
          return true;
        }
        // Allow digits only if there's at least one letter in the value
        if (isDigit && hasLetter) {
          return true;
        }
        return false;
      }).join('');
      
      // Additional cleanup: remove multiple consecutive spaces (but keep single spaces)
      processedValue = processedValue.replace(/\s+/g, ' ');
    }
    // Special handling for phone number input
    else if (name === 'phone') {
      // Allow only digits and + at the beginning
      // Remove any non-digit characters except + at the start
      if (value.startsWith('+')) {
        // Keep + at the beginning and allow only digits after
        let digits = value.slice(1).replace(/[^0-9]/g, '');
        
        // Handle different country codes
        if (value.startsWith('+84')) {
          // Vietnam: Remove leading 0 and country code from digits
          digits = digits.replace(/^84/, '').replace(/^0+/, '');
          processedValue = '+84' + (digits ? ' ' + digits : '');
        } else if (value.startsWith('+1')) {
          // US/Canada: Remove leading 0 and country code from digits
          digits = digits.replace(/^1/, '').replace(/^0+/, '');
          processedValue = '+1' + (digits ? ' ' + digits : '');
        } else if (value.startsWith('+86')) {
          // China: Remove leading 0 and country code from digits
          digits = digits.replace(/^86/, '').replace(/^0+/, '');
          processedValue = '+86' + (digits ? ' ' + digits : '');
        } else if (value.startsWith('+82')) {
          // South Korea: Remove leading 0 and country code from digits
          digits = digits.replace(/^82/, '').replace(/^0+/, '');
          processedValue = '+82' + (digits ? ' ' + digits : '');
        } else if (value.startsWith('+81')) {
          // Japan: Remove leading 0 and country code from digits
          digits = digits.replace(/^81/, '').replace(/^0+/, '');
          processedValue = '+81' + (digits ? ' ' + digits : '');
        } else if (value.startsWith('+66')) {
          // Thailand: Remove leading 0 and country code from digits
          digits = digits.replace(/^66/, '').replace(/^0+/, '');
          processedValue = '+66' + (digits ? ' ' + digits : '');
        } else if (value.startsWith('+65')) {
          // Singapore: Remove leading 0 and country code from digits
          digits = digits.replace(/^65/, '').replace(/^0+/, '');
          processedValue = '+65' + (digits ? ' ' + digits : '');
        } else if (value.startsWith('+60')) {
          // Malaysia: Remove leading 0 and country code from digits
          digits = digits.replace(/^60/, '').replace(/^0+/, '');
          processedValue = '+60' + (digits ? ' ' + digits : '');
        } else if (value.startsWith('+63')) {
          // Philippines: Remove leading 0 and country code from digits
          digits = digits.replace(/^63/, '').replace(/^0+/, '');
          processedValue = '+63' + (digits ? ' ' + digits : '');
        } else if (value.startsWith('+44')) {
          // UK: Remove leading 0 and country code from digits
          digits = digits.replace(/^44/, '').replace(/^0+/, '');
          processedValue = '+44' + (digits ? ' ' + digits : '');
        } else if (value.startsWith('+33')) {
          // France: Remove leading 0 and country code from digits
          digits = digits.replace(/^33/, '').replace(/^0+/, '');
          processedValue = '+33' + (digits ? ' ' + digits : '');
        } else if (value.startsWith('+49')) {
          // Germany: Remove leading 0 and country code from digits
          digits = digits.replace(/^49/, '').replace(/^0+/, '');
          processedValue = '+49' + (digits ? ' ' + digits : '');
        } else if (value.startsWith('+39')) {
          // Italy: Remove leading 0 and country code from digits
          digits = digits.replace(/^39/, '').replace(/^0+/, '');
          processedValue = '+39' + (digits ? ' ' + digits : '');
        } else if (value.startsWith('+34')) {
          // Spain: Remove leading 0 and country code from digits
          digits = digits.replace(/^34/, '').replace(/^0+/, '');
          processedValue = '+34' + (digits ? ' ' + digits : '');
        } else if (value.startsWith('+7')) {
          // Russia/Kazakhstan: Remove leading 0 and country code from digits
          digits = digits.replace(/^7/, '').replace(/^0+/, '');
          processedValue = '+7' + (digits ? ' ' + digits : '');
        } else if (value.startsWith('+91')) {
          // India: Remove leading 0 and country code from digits
          digits = digits.replace(/^91/, '').replace(/^0+/, '');
          processedValue = '+91' + (digits ? ' ' + digits : '');
        } else if (value.startsWith('+61')) {
          // Australia: Remove leading 0 and country code from digits
          digits = digits.replace(/^61/, '').replace(/^0+/, '');
          processedValue = '+61' + (digits ? ' ' + digits : '');
        } else {
          // For other countries, keep digits as is with space
          processedValue = '+' + (digits ? digits.replace(/(\d{2,3})(\d+)/, '$1 $2') : '');
        }
      } else {
        // Allow only digits if no + at the beginning
        processedValue = value.replace(/[^0-9]/g, '');
      }
    }
    
    // Merge manually; avoid functional updater to match setContact API
    setContact({ ...contact, [name]: processedValue });
    
    // Mark field as touched
    setTouchedFieldsWithRef(prev => new Set(prev).add(name));
    
    // Always validate on change for real-time feedback
    validateField(name, processedValue);
    
    // If user manually edits an auto-filled field, remove it from auto-filled set
    if (autoFilledFields.has(name)) {
      const newAutoFilledFields = new Set(autoFilledFields);
      newAutoFilledFields.delete(name);
      setAutoFilledFields(newAutoFilledFields);
    }
  };

  const handleInputBlur = (e) => {
    const { name, value } = e.target;
    setTouchedFieldsWithRef(prev => new Set(prev).add(name));
    validateField(name, value);
  };


  // Navigation is handled by parent component

  return (
    <div className={styles['contact-form']}>
      {/* Personal Info Auto-fill Option */}
      {(user || hasUserInStorage) && (
        <div className={styles['personal-info-option']}>
          <label className={styles['checkbox-label']}>
            <input
              type="checkbox"
              className={styles['checkbox-input']}
              checked={usePersonalInfo}
              onChange={(e) => handleUsePersonalInfo(e.target.checked)}
            />
            <span className={styles['checkbox-text']}>
              <UserCheck className={styles['personal-info-icon']} />
              {t('booking.step1.usePersonalInfo')}
            </span>
          </label>
          
          {usePersonalInfo && (
            <div className={styles['auto-fill-notice']}>
              <span className={styles['notice-icon']}>
                <Info className={styles['notice-icon-svg']} />
              </span>
              <span className={styles['notice-text']}>
                {t('booking.step1.autoFillNotice')}
              </span>
            </div>
          )}
        </div>
      )}

      <div className={styles['form-section']}>
        <h3 className={styles['section-title']}>
          <UserRound className={styles['section-icon']} />
          {t('booking.step1.sectionTitle')}
        </h3>
        
        <div className={styles['form-grid']}>
          <div className={styles['form-group']}>
            <div className={styles['label-with-icon']}>
              <PenSquare className={styles['field-icon']} />
              <label htmlFor="fullName" className={`${styles['form-label']} ${styles['required']}`}>
                {t('booking.step1.fields.fullName')}
              </label>
            </div>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={contact.fullName}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              className={`${styles['form-input']} ${errors.fullName ? styles['error'] : ''} ${autoFilledFields.has('fullName') ? styles['auto-filled'] : ''}`}
              placeholder={t('booking.step1.placeholders.fullName')}
              required
            />
            {errors.fullName && (
              <span className={styles['form-error']}>{errors.fullName}</span>
            )}
          </div>

          <div className={styles['form-group']}>
            <div className={styles['label-with-icon']}>
              <Phone className={styles['field-icon']} />
              <label htmlFor="phone" className={`${styles['form-label']} ${styles['required']}`}>
                {t('booking.step1.fields.phone')}
              </label>
            </div>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={contact.phone}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              className={`${styles['form-input']} ${errors.phone ? styles['error'] : ''} ${autoFilledFields.has('phone') ? styles['auto-filled'] : ''}`}
              placeholder={t('booking.step1.placeholders.phone')}
              required
            />
            {errors.phone && (
              <span className={styles['form-error']}>{errors.phone}</span>
            )}
          </div>

          <div className={styles['form-group']}>
            <div className={styles['label-with-icon']}>
              <Mail className={styles['field-icon']} />
              <label htmlFor="email" className={`${styles['form-label']} ${styles['required']}`}>
                Email
              </label>
            </div>
            <input
              type="email"
              id="email"
              name="email"
              value={contact.email}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              className={`${styles['form-input']} ${errors.email ? styles['error'] : ''} ${autoFilledFields.has('email') ? styles['auto-filled'] : ''}`}
              placeholder="example@email.com"
              required
            />
            {errors.email && (
              <span className={styles['form-error']}>{errors.email}</span>
            )}
          </div>

          <div className={styles['form-group']}>
            <div className={styles['label-with-icon']}>
              <CalendarDays className={styles['field-icon']} />
              <label htmlFor="dob" className={`${styles['form-label']} ${styles['required']}`}>
                {t('booking.step1.fields.dob')}
              </label>
            </div>
            <div className={styles['date-input-container']}>
              <input
                type="text"
                id="dob"
                value={formatDateForDisplay(contact.dob || '', 'dob')}
                onFocus={(e) => {
                  const fieldKey = 'dob';
                  setEditingFields(prev => new Set(prev).add(fieldKey));
                  
                  // Clear any existing error when user starts editing
                  setErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.dob;
                    return newErrors;
                  });
                }}
                onChange={(e) => {
                  const rawValue = e.target.value;
                  const fieldKey = 'dob';
                  
                  // Only allow numbers and separators
                  const cleanValue = rawValue.replace(/[^\d\/\.]/g, '');
                  
                  // Format the input as user types
                  const formattedValue = formatDateInput(cleanValue, fieldKey);
                  
                  // Store the formatted value
                  handleDateChange(formattedValue);
                  
                  // Don't validate during typing - only format input
                }}
                onKeyDown={(e) => {
                  // Detect backspace key to help with deletion logic
                  if (e.key === 'Backspace') {
                    const currentValue = e.target.value;
                    const separator = getDateSeparator();
                    
                    // Mark as deleting for any backspace
                    isDeletingRef.current = true;
                    
                    
                    // Special case: if current value ends with separator, we're deleting separator
                    
                  } else if (e.key.length === 1) {
                    // If user is typing a character, reset deletion flag
                    isDeletingRef.current = false;
                    
                  }
                  
                  // Trigger validation on Enter key
                  if (e.key === 'Enter') {
                    e.target.blur(); // This will trigger onBlur validation
                  }
                }}
                onBlur={(e) => {
                  const displayValue = e.target.value;
                  const fieldKey = 'dob';
                  
                  // Remove from editing state
                  setEditingFields(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(fieldKey);
                    return newSet;
                  });
                  
                  // Mark field as touched
                  setTouchedFieldsWithRef(prev => new Set(prev).add('dob'));
                  
                  // Validate when user finishes typing (onBlur)
                  if (displayValue && displayValue.length >= 8) {
                    const normalizedDate = validateDateInput(displayValue);
                    if (normalizedDate) {
                      // Set validating flag to prevent useEffect override
                      const dobKey = 'dob';
                      setValidatingFields(prev => new Set(prev).add(dobKey));
                      validatingFieldsRef.current.add(dobKey);
                      
                      // Validate with delay
                      setTimeout(() => {
                        // Validate age (≥18 for representative)
                        const birthDate = new Date(normalizedDate);
                        const today = new Date();
                        let age = today.getFullYear() - birthDate.getFullYear();
                        const monthDiff = today.getMonth() - birthDate.getMonth();
                        
                        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                          age--;
                        }
                        
                        // Set error state immediately and persistently
                        setErrors(prev => {
                          const newErrors = { ...prev };
                          if (age >= 18) {
                            delete newErrors[dobKey];
                          } else {
                            newErrors[dobKey] = t('booking.errors.representativeTooYoung');
                          }
                          return newErrors;
                        });
                        
                        // Clear validating flag after delay
                        setTimeout(() => {
                          setValidatingFields(prev => {
                            const newSet = new Set(prev);
                            newSet.delete(dobKey);
                            return newSet;
                          });
                          validatingFieldsRef.current.delete(dobKey);
                        }, 500); // 500ms to ensure useEffect doesn't override
                      }, 100); // 100ms delay
                    } else {
                      setErrors(prev => ({
                        ...prev,
                        dob: t('booking.errors.dobInvalidFormat')
                      }));
                    }
                  } else if (!displayValue || displayValue.trim() === '') {
                    setErrors(prev => ({
                      ...prev,
                      dob: t('booking.errors.dobRequired')
                    }));
                  }
                  
                  // Trigger validation on Enter key
                  if (e.key === 'Enter') {
                    e.target.blur(); // This will trigger onBlur validation
                  }
                }}
                className={`${styles['form-input']} ${styles['date-input']} ${errors.dob && touchedFields.has('dob') ? styles['error'] : ''}`}
                placeholder={getDateFormat()}
              />
              <div className={styles['date-picker-wrapper']}>
                <button
                  type="button"
                  className={styles['calendar-button']}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // Trigger the hidden DatePicker via exposed handlers
                    if (datePickerRef.current) {
                      datePickerRef.current.focus?.();
                      datePickerRef.current.click?.();
                    }
                  }}
                  title="Open date picker"
                >
                  <Calendar className={styles['calendar-icon']} />
                </button>
                <div style={{ position: 'absolute', left: '-9999px', opacity: 0, width: '1px', height: '1px', overflow: 'hidden' }}>
                  <DatePicker
                    ref={datePickerRef}
                    value={(() => {
                      if (!contact.dob) return null;
                      const normalized = validateDateInput(contact.dob);
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
                        
                        // Always update the input first (so user can see what they selected)
                        handleDateChange(displayFormat);
                        
                        // Remove from editing state to show formatted date
                        const fieldKey = 'dob';
                        setEditingFields(prev => {
                          const newSet = new Set(prev);
                          newSet.delete(fieldKey);
                          return newSet;
                        });
                        
                        // Mark field as touched
                        setTouchedFields(prev => new Set(prev).add('dob'));
                        
                        // Set validating flag to prevent useEffect override
                        const dobKey = 'dob';
                        setValidatingFields(prev => new Set(prev).add(dobKey));
                        validatingFieldsRef.current.add(dobKey);
                        
                        // Validate immediately since user has finished selecting from calendar
                        setTimeout(() => {
                          const validationResult = validateDateInput(displayFormat);
                          
                          // Validate age (≥18 for representative)
                          const birthDate = new Date(normalizedDate);
                          const today = new Date();
                          let age = today.getFullYear() - birthDate.getFullYear();
                          const monthDiff = today.getMonth() - birthDate.getMonth();
                          
                          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                            age--;
                          }
                          
                          // Set error state immediately and persistently
                          setErrors(prev => {
                            const newErrors = { ...prev };
                            if (age >= 18) {
                              delete newErrors[dobKey];
                            } else {
                              newErrors[dobKey] = t('booking.errors.representativeTooYoung');
                            }
                            return newErrors;
                          });
                          
                          // Clear validating flag after delay
                          setTimeout(() => {
                            setValidatingFields(prev => {
                              const newSet = new Set(prev);
                              newSet.delete(dobKey);
                              return newSet;
                            });
                            validatingFieldsRef.current.delete(dobKey);
                          }, 500); // 500ms to ensure useEffect doesn't override
                        }, 100); // 100ms delay
                      }
                    }}
                    minDate={new Date('1900-01-01')}
                    maxDate={(() => {
                      const maxDate = new Date();
                      maxDate.setMonth(maxDate.getMonth() + 1);
                      return maxDate;
                    })()}
                    onFocus={() => {}}
                    onBlur={() => {}}
                    onClick={() => {}}
                  />
                </div>
              </div>
            </div>
            {errors.dob && touchedFields.has('dob') && (
              <span className={styles['form-error']}>{errors.dob}</span>
            )}
          </div>

          <div className={styles['form-group']}>
            <div className={styles['label-with-icon']}>
              <Home className={styles['field-icon']} />
              <label htmlFor="address" className={`${styles['form-label']} ${styles['required']}`}>
                {t('booking.step1.fields.address')}
              </label>
            </div>
            <input
              type="text"
              id="address"
              name="address"
              value={contact.address}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              className={`${styles['form-input']} ${errors.address ? styles['error'] : ''} ${autoFilledFields.has('address') ? styles['auto-filled'] : ''}`}
              placeholder={t('booking.step1.placeholders.address')}
              required
            />
            {errors.address && (
              <span className={styles['form-error']}>{errors.address}</span>
            )}
          </div>

          <div className={styles['form-group']}>
            <div className={styles['label-with-icon']}>
              <MapPin className={styles['field-icon']} />
              <label htmlFor="pickupPoint" className={`${styles['form-label']} ${styles['required']}`}>
                {t('booking.step1.fields.pickupPoint')}
              </label>
            </div>
            <input
              type="text"
              id="pickupPoint"
              name="pickupPoint"
              value={contact.pickupPoint}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              className={`${styles['form-input']} ${errors.pickupPoint ? styles['error'] : ''}`}
              placeholder={t('booking.step1.placeholders.pickupPoint')}
              required
            />
            {errors.pickupPoint && (
              <span className={styles['form-error']}>{errors.pickupPoint}</span>
            )}
          </div>

          <div className={styles['form-group']} style={{ gridColumn: '1 / -1' }}>
            <div className={styles['label-with-icon']}>
              <StickyNote className={styles['field-icon']} />
              <label htmlFor="note" className={styles['form-label']}>
                {t('booking.step1.fields.note')}
              </label>
            </div>
            <textarea
              id="note"
              name="note"
              value={contact.note}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              className={styles['form-textarea']}
              placeholder={t('booking.step1.placeholders.note')}
              rows="3"
            />
          </div>
        </div>
      </div>

      {/* Navigation is handled by parent component */}
    </div>
  );
};

// No props needed - navigation handled by parent

export default Step1Contact;
