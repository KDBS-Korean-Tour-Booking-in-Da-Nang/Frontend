import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useBooking } from '../../../../../contexts/TourBookingContext';
import { formatPrice } from '../../../../../utils/priceRules';
import styles from './Step2Details.module.css';

const Step2Details = () => {
  const { id: tourId } = useParams();
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language || 'vi';
  const { 
    plan, 
    setDate, 
    incrementPax, 
    decrementPax, 
    setMember, 
    rebuildMembers, 
    recalcTotal 
  } = useBooking();

  const [errors, setErrors] = useState({});
  const [confirmedNationalities, setConfirmedNationalities] = useState({});
  const [touchedFields, setTouchedFields] = useState(new Set());
  const [dateTouched, setDateTouched] = useState(false);
  const [editingFields, setEditingFields] = useState(new Set()); // Track which fields are being edited
  const [validatingFields, setValidatingFields] = useState(new Set()); // Track fields being validated manually
  const validatingFieldsRef = useRef(new Set()); // Ref to avoid useEffect dependency
  const [tourPrices, setTourPrices] = useState({
    adult: null,
    child: null,
    infant: null
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

  const formatDateForDisplay = (dateString, fieldKey) => {
    if (!dateString) return '';
    
    // If field is being edited, return as-is to allow editing
    if (editingFields.has(fieldKey)) {
      return dateString;
    }
    
    // If it's already a display format (contains separator), return as is
    const separator = getDateSeparator();
    if (dateString.includes(separator) || dateString.includes('/') || dateString.includes('.')) {
      return dateString; // Return as-is for any display format
    }
    
    // If it's a normalized date (YYYY-MM-DD), format it
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-');
      
      switch (currentLanguage) {
        case 'vi': return `${day}${separator}${month}${separator}${year}`;
        case 'en': return `${month}${separator}${day}${separator}${year}`;
        case 'ko': return `${year}${separator}${month}${separator}${day}`;
        default: return `${year}-${month}-${day}`;
      }
    }
    
    // For any other input, return as-is to allow editing
    return dateString;
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

    console.log('🔍 validateDateInput - Input:', inputValue, 'Language:', currentLanguage);

    // First try to parse using language-specific format
    const parsedDate = parseDateFromDisplay(inputValue);
    console.log('📅 Parsed date:', parsedDate);
    
    if (parsedDate) {
      return parsedDate;
    }
    
    // Don't use fallback new Date() as it can cause issues
    // Just return null for invalid input
    console.log('❌ Invalid date format');
    return null;
  };

  // Helper function to calculate age from date of birth at a specific date
  const calculateAge = (dob, referenceDate = null) => {
    if (!dob) return null;
    const refDate = referenceDate ? new Date(referenceDate) : new Date();
    const birthDate = new Date(dob);
    let age = refDate.getFullYear() - birthDate.getFullYear();
    const monthDiff = refDate.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && refDate.getDate() < birthDate.getDate())) {
      age--;
    }
    console.log('🔍 calculateAge - dob:', dob, 'refDate:', refDate, 'birthDate:', birthDate, 'age:', age);
    return age;
  };

  // Helper function to determine if ID is required based on age and nationality
  const isIdRequired = (dob, nationality) => {
    if (!dob || !nationality) return false;
    
    const age = calculateAge(dob);
    if (age === null) return false;
    
    // For Vietnamese nationality (tour nội địa) - compare with country code VN
    if (nationality === 'VN') {
      // Em bé (0 - dưới 2 tuổi): Không bắt buộc CCCD/CMND
      if (age < 2) return false;
      
      // Trẻ em (2 - dưới 14 tuổi): Không bắt buộc CCCD/CMND
      if (age >= 2 && age < 14) return false;
      
      // Trẻ em (14 - dưới 16 tuổi): Có thể có CCCD, không bắt buộc
      if (age >= 14 && age < 16) return false;
      
      // Người lớn (16 tuổi trở lên): Bắt buộc CCCD/CMND
      if (age >= 16) return true;
    }
    
    // For other nationalities: Always require passport
    return true;
  };

  // List of countries (codes) with i18n labels
  const countries = [
    'VN','KR','JP','CN','US','GB','FR','DE','TH','SG','MY','PH','ID','LA','KH','AU','CA'
  ].map(code => ({ code, label: t(`booking.step2.countries.${code}`) }))
   .sort((a,b) => a.label.localeCompare(b.label));

  // Fetch tour data and prices
  const loadTourPrices = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch tour data directly (public endpoint)
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
      
      const response = await fetch(`${API_BASE_URL}/api/tour/${tourId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const tourData = await response.json();
      console.log('Raw tour data from API:', tourData); // Debug log
      
       // Extract prices from tour data - only use real prices from database
       const prices = {
         adult: tourData.adultPrice !== null && tourData.adultPrice !== undefined ? Number(tourData.adultPrice) : null,
         child: tourData.childrenPrice !== null && tourData.childrenPrice !== undefined ? Number(tourData.childrenPrice) : null,
         infant: tourData.babyPrice !== null && tourData.babyPrice !== undefined ? Number(tourData.babyPrice) : null
       };
      
      console.log('Extracted prices:', {
        adultPrice: tourData.adultPrice,
        childrenPrice: tourData.childrenPrice,
        babyPrice: tourData.babyPrice,
        processed: prices
      }); // Debug log
      
       // Check if prices are null or 0
       if (tourData.adultPrice === null || tourData.adultPrice === undefined) {
         console.warn('⚠️ Adult price is null:', tourData.adultPrice);
       } else if (tourData.adultPrice === 0) {
         console.info('ℹ️ Adult price is 0 (Miễn phí):', tourData.adultPrice);
       }
       if (tourData.childrenPrice === null || tourData.childrenPrice === undefined) {
         console.warn('⚠️ Children price is null:', tourData.childrenPrice);
       } else if (tourData.childrenPrice === 0) {
         console.info('ℹ️ Children price is 0 (Miễn phí):', tourData.childrenPrice);
       }
       if (tourData.babyPrice === null || tourData.babyPrice === undefined) {
         console.warn('⚠️ Baby price is null:', tourData.babyPrice);
       } else if (tourData.babyPrice === 0) {
         console.info('ℹ️ Baby price is 0 (Miễn phí):', tourData.babyPrice);
       }
      
      setTourPrices(prices);
      console.log('Tour prices loaded:', prices); // Debug log
    } catch (error) {
      console.error('Error loading tour prices:', error);
      
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

  // Validate form
  useEffect(() => {
    const newErrors = {};

    // Check date
    if (!plan.date.day || !plan.date.month || !plan.date.year) {
      newErrors.date = t('booking.step2.errors.dateRequired');
    } else {
      const selectedDate = new Date(plan.date.year, plan.date.month - 1, plan.date.day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Calculate max date (1 month from today)
      const maxDate = new Date(today);
      maxDate.setMonth(maxDate.getMonth() + 1);
      
      if (selectedDate < today) {
        newErrors.date = t('booking.step2.errors.dateInPast');
      } else if (selectedDate > maxDate) {
        newErrors.date = t('booking.step2.errors.dateOverOneMonth');
      } else {
        delete newErrors.date;
      }
    }

    // Check members
    const allMembers = [
      ...plan.members.adult,
      ...plan.members.child,
      ...plan.members.infant
    ];

    allMembers.forEach((member, index) => {
      const memberType = index < plan.members.adult.length ? 'adult' : 
                        index < plan.members.adult.length + plan.members.child.length ? 'child' : 'infant';
      const memberIndex = memberType === 'adult' ? index : 
                         memberType === 'child' ? index - plan.members.adult.length : 
                         index - plan.members.adult.length - plan.members.child.length;
      
      // Only validate if field has been touched or has value
      const nameKey = `${memberType}_${memberIndex}_fullName`;
      if (touchedFields.has(nameKey) && !member.fullName.trim()) {
        newErrors[`member_${index}_name`] = t('booking.step2.errors.fullNameRequired');
      }
      
      const dobKey = `member_${index}_dob`;
      if (touchedFields.has(dobKey) && !member.dob) {
        newErrors[`member_${index}_dob`] = t('booking.step2.errors.dobRequired');
      } else if (member.dob) {
        // Skip useEffect validation if field is being validated manually
        if (!validatingFieldsRef.current.has(dobKey)) {
          console.log('🔄 useEffect validation for:', member.dob, 'member type:', memberType);
          // Use the same validation logic as manual input and calendar picker
          const normalizedDate = validateDateInput(member.dob);
          if (!normalizedDate) {
            newErrors[`member_${index}_dob`] = t('booking.step2.errors.dobInvalidFormat');
          } else {
            // Use validateMemberAge function for consistent validation
            const validationResult = validateMemberAge(memberType, normalizedDate);
            console.log('🔄 useEffect validation result:', validationResult);
            if (!validationResult.isValid) {
              newErrors[`member_${index}_dob`] = validationResult.error;
            }
          }
        } else {
          console.log('🔄 Skipping useEffect validation for', dobKey, '- being validated manually');
        }
      }
      
      const genderKey = `${memberType}_${memberIndex}_gender`;
      if (touchedFields.has(genderKey) && !member.gender) {
        newErrors[`member_${index}_gender`] = t('booking.step2.errors.genderRequired');
      }
      
      const nationalityKey = `${memberType}_${memberIndex}_nationality`;
      if (touchedFields.has(nationalityKey) && !member.nationality) {
        newErrors[`member_${index}_nationality`] = t('booking.step2.errors.nationalityRequired');
      }
      
      // Check if ID is required based on age and nationality
      const idKey = `${memberType}_${memberIndex}_idNumber`;
      const idRequired = isIdRequired(member.dob, member.nationality);
      if (touchedFields.has(idKey) && idRequired && !member.idNumber?.trim()) {
        newErrors[`member_${index}_idNumber`] = t('booking.step2.errors.idRequired');
      }
      // Note: Format validation for ID number is handled separately in validateIdNumber function
    });

    setErrors(newErrors);
  }, [plan.date, plan.members, touchedFields, t]);

  const handlePaxChange = (type, action) => {
    if (action === 'increment') {
      incrementPax(type);
    } else if (action === 'decrement') {
      // Prevent adult count from going below 1
      if (type === 'adult' && plan.pax.adult <= 1) {
        return;
      }
      decrementPax(type);
    }
  };

  const handleMemberChange = (memberType, index, field, value) => {
    setMember(memberType, index, { [field]: value });
    
    // Mark field as touched
    // do not mark touched here; mark on blur handlers instead
  };

  // Special handler for date input to ensure proper validation
  const handleDateChange = (memberType, index, value) => {
    console.log('📝 handleDateChange - Value:', value);
    
    // Always store the value as-is (display format)
    // Validation will happen in the validation function
    console.log('✅ Storing display value:', value);
    handleMemberChange(memberType, index, 'dob', value);
  };

  // Validate member age based on member type
  const validateMemberAge = (memberType, normalizedDate) => {
    console.log('🔍 validateMemberAge called with:', { memberType, normalizedDate });
    console.log('🔍 validateMemberAge call stack:', new Error().stack);
    
    if (!normalizedDate || !/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
      console.log('❌ Invalid date format');
      return { isValid: false, error: t('booking.step2.errors.dobInvalidFormat') };
    }

    const birthDate = new Date(normalizedDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    console.log('🔍 Birth date:', birthDate, 'Today:', today);
    
    // Check if birth date is in the future
    if (birthDate > today) {
      console.log('❌ Birth date is in future');
      return { isValid: false, error: t('booking.step2.errors.dobInFuture') };
    }

    // Check if age is too old (sanity check)
    const age = calculateAge(normalizedDate);
    console.log('🔍 Current age:', age);
    if (age > 120) {
      console.log('❌ Age too old');
      return { isValid: false, error: t('booking.step2.errors.dobTooOld') };
    }

    // Check age requirements based on member type
    console.log('🔍 Checking age requirements for member type:', memberType);
    
    if (memberType === 'adult') {
      // Adults must be at least 12 years old
      console.log('🔍 Adult validation - birth date:', normalizedDate, 'current age:', age);
      console.log('🔍 Adult validation - age < 12?', age < 12);
      
      // Check current age first
      if (age < 12) {
        console.log('❌ Adult too young (current age):', age);
        return { isValid: false, error: t('booking.step2.errors.adultTooYoung') };
      }
      console.log('✅ Adult current age check passed:', age);
      
      // Also check age at departure date if available
      if (plan.date && plan.date.day && plan.date.month && plan.date.year) {
        const departureDate = new Date(plan.date.year, plan.date.month - 1, plan.date.day);
        const ageAtDeparture = calculateAge(normalizedDate, departureDate);
        console.log('🔍 Adult age at departure:', ageAtDeparture, 'departure date:', departureDate);
        
        if (ageAtDeparture < 12) {
          console.log('❌ Adult too young at departure:', ageAtDeparture);
          return { isValid: false, error: t('booking.step2.errors.adultTooYoung') };
        }
        console.log('✅ Adult departure age check passed:', ageAtDeparture);
      } else {
        console.log('🔍 No departure date, skipping departure age check');
      }
    } else if (memberType === 'child') {
      // Children should be between 2-11 years old (typical definition)
      console.log('🔍 Child current age:', age);
      if (age < 2) {
        console.log('❌ Child too young (current age)');
        return { isValid: false, error: t('booking.step2.errors.childTooYoung') };
      }
      if (age >= 12) {
        console.log('❌ Child too old (current age)');
        return { isValid: false, error: t('booking.step2.errors.childTooOld') };
      }
      
      // Also check age at departure date if available
      if (plan.date && plan.date.day && plan.date.month && plan.date.year) {
        const departureDate = new Date(plan.date.year, plan.date.month - 1, plan.date.day);
        const ageAtDeparture = calculateAge(normalizedDate, departureDate);
        console.log('🔍 Child age at departure:', ageAtDeparture);
        
        if (ageAtDeparture < 2) {
          console.log('❌ Child too young at departure');
          return { isValid: false, error: t('booking.step2.errors.childTooYoung') };
        }
        if (ageAtDeparture >= 12) {
          console.log('❌ Child too old at departure');
          return { isValid: false, error: t('booking.step2.errors.childTooOld') };
        }
      }
    } else if (memberType === 'infant') {
      // Infants should be under 2 years old
      console.log('🔍 Infant current age:', age);
      if (age >= 2) {
        console.log('❌ Infant too old (current age)');
        return { isValid: false, error: t('booking.step2.errors.infantTooOld') };
      }
      
      // Also check age at departure date if available
      if (plan.date && plan.date.day && plan.date.month && plan.date.year) {
        const departureDate = new Date(plan.date.year, plan.date.month - 1, plan.date.day);
        const ageAtDeparture = calculateAge(normalizedDate, departureDate);
        console.log('🔍 Infant age at departure:', ageAtDeparture);
        
        if (ageAtDeparture >= 2) {
          console.log('❌ Infant too old at departure');
          return { isValid: false, error: t('booking.step2.errors.infantTooOld') };
        }
      }
    }

    console.log('✅ Validation passed for member type:', memberType);
    return { isValid: true };
  };

  // Separate function for validating ID number (called on blur)
  const validateIdNumber = (memberType, index, value) => {
    const key = `${memberType}-${index}`;
    const nationality = confirmedNationalities[key];
    
    if (nationality && value.trim()) {
      const isVietnamese = nationality === 'VN';
      
      if (isVietnamese) {
        // Vietnamese ID validation: exactly 12 digits (CCCD) or exactly 9 digits (CMND/CMT)
        const vietnameseIdRegex = /^(?:\d{12}|\d{9})$/;
        if (!vietnameseIdRegex.test(value)) {
          setErrors(prev => ({
            ...prev,
            [`${memberType}_${index}_idNumber`]: t('booking.step2.validation.vietnameseId')
          }));
        } else {
          setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[`${memberType}_${index}_idNumber`];
            return newErrors;
          });
        }
      } else {
        // Passport validation: 6-9 characters, letters and numbers
        const passportRegex = /^[A-Z0-9]{6,9}$/i;
        if (!passportRegex.test(value)) {
          setErrors(prev => ({
            ...prev,
            [`${memberType}_${index}_idNumber`]: t('booking.step2.validation.passport')
          }));
        } else {
          setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[`${memberType}_${index}_idNumber`];
            return newErrors;
          });
        }
      }
    }
  };

  // Handle ID number input with blur validation
  const handleIdNumberChange = (memberType, index, value) => {
    // Check nationality to determine input filtering
    const key = `${memberType}-${index}`;
    const nationality = confirmedNationalities[key];
    
    let processedValue = value;
    
    if (nationality === 'VN') {
      // For Vietnamese nationality: only allow digits (0-9) and limit to 12 characters
      processedValue = value.replace(/[^0-9]/g, '');
      // Limit to maximum 12 digits for CCCD
      if (processedValue.length > 12) {
        processedValue = processedValue.substring(0, 12);
      }
    } else {
      // For other nationalities: allow alphanumeric characters (passport format) and limit to 9 characters
      processedValue = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      // Limit to maximum 9 characters for passport
      if (processedValue.length > 9) {
        processedValue = processedValue.substring(0, 9);
      }
    }
    
    handleMemberChange(memberType, index, 'idNumber', processedValue);
  };

  const handleIdNumberBlur = (memberType, index, value) => {
    // Mark field as touched
    const fieldKey = `${memberType}_${index}_idNumber`;
    setTouchedFields(prev => new Set(prev).add(fieldKey));
    
    // Validate ID number only on blur
    validateIdNumber(memberType, index, value);
  };

  const handleNationalityChange = (memberType, index, value) => {
    handleMemberChange(memberType, index, 'nationality', value);
    
    // Auto-detect Vietnamese nationality and show ID field
    const key = `${memberType}-${index}`;
    const isVietnamese = value === 'VN';
    
    if (value && value.trim()) {
      // Show ID/Passport field for any selected nationality
      setConfirmedNationalities(prev => ({
        ...prev,
        [key]: value
      }));
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

  const getMemberTypePrice = (type) => {
    const price = (() => {
      switch (type) {
        case 'adult': return tourPrices.adult;
        case 'child': return tourPrices.child;
        case 'infant': return tourPrices.infant;
        default: return null;
      }
    })();
    
    const formattedPrice = (() => {
      if (price === null) return 'Chưa có giá';
      if (price === 0) return 'Miễn phí';
      return formatPrice(price);
    })();
    console.log(`Price for ${type}:`, price, 'Formatted:', formattedPrice); // Debug log
    
    if (price === null) return 'Chưa có giá';
    if (price === 0) return 'Miễn phí';
    return formatPrice(price);
  };

  const renderMemberForm = (memberType, members) => {
    if (members.length === 0) return null;

    return (
      <div key={memberType} className={styles['member-group']}>
        <h4 className={styles['member-group-title']}>
          {`${getMemberTypeLabel(memberType)} (${members.length} người) - ${getMemberTypePrice(memberType)}`}
        </h4>
        {members.map((member, index) => (
          <div key={`${memberType}-${index}`} className={styles['member-card']}>
            <div className={styles['member-title']}>
              {`${getMemberTypeLabel(memberType)} ${index + 1}`}
            </div>
            <div className={styles['member-form']}>
              <div className={styles['form-group']}>
                <label htmlFor={`${memberType}-${index}-fullName`} className={`${styles['form-label']} ${styles['required']}`}>{t('booking.step2.labels.fullName')}</label>
                <input
                  type="text"
                  id={`${memberType}-${index}-fullName`}
                  value={member.fullName}
                  onChange={(e) => handleMemberChange(memberType, index, 'fullName', e.target.value)}
                  onBlur={() => setTouchedFields(prev => new Set(prev).add(`${memberType}_${index}_fullName`))}
                  className={`${styles['form-input']} ${errors[`member_${index}_name`] && touchedFields.has(`${memberType}_${index}_fullName`) ? styles['error'] : ''}`}
                  placeholder={t('booking.step2.placeholders.fullName')}
                />
                {errors[`member_${index}_name`] && touchedFields.has(`${memberType}_${index}_fullName`) && (
                  <span className={styles['form-error']}>{errors[`member_${index}_name`]}</span>
                )}
              </div>

              <div className={styles['form-group']}>
                <label htmlFor={`${memberType}-${index}-dob`} className={`${styles['form-label']} ${styles['required']}`}>{t('booking.step2.labels.dob')}</label>
                 <div className={styles['date-input-container']}>
                <input
                     type="text"
                  id={`${memberType}-${index}-dob`}
                     value={formatDateForDisplay(member.dob, `${memberType}-${index}-dob`)}
                     onFocus={(e) => {
                       const fieldKey = `${memberType}-${index}-dob`;
                       console.log('📝 Input focused, adding to editing fields:', fieldKey);
                       setEditingFields(prev => new Set(prev).add(fieldKey));
                       
                       // If there's a normalized date, convert it to display format for editing
                       if (member.dob && /^\d{4}-\d{2}-\d{2}$/.test(member.dob)) {
                         const displayFormat = formatDateFromNormalized(member.dob);
                         console.log('📝 Converting normalized date to display format for editing:', displayFormat);
                         handleDateChange(memberType, index, displayFormat);
                       }
                     }}
                     onChange={(e) => {
                       const rawValue = e.target.value;
                       const fieldKey = `${memberType}-${index}-dob`;
                       
                       // Format the input as user types
                       const formattedValue = formatDateInput(rawValue, fieldKey);
                       
                       // Store the formatted value
                       handleMemberChange(memberType, index, 'dob', formattedValue);
                       
                       // Don't validate during typing - only format input
                       console.log('🔍 Manual input - formattedValue:', formattedValue, 'length:', formattedValue?.length);
                     }}
                     onBlur={(e) => {
                       const displayValue = e.target.value;
                       const fieldKey = `${memberType}-${index}-dob`;
                       
                       // Remove from editing state
                       setEditingFields(prev => {
                         const newSet = new Set(prev);
                         newSet.delete(fieldKey);
                         return newSet;
                       });
                       
                       // Mark field as touched
                       setTouchedFields(prev => new Set(prev).add(`member_${index}_dob`));
                       
                       // Validate when user finishes typing (onBlur)
                       console.log('📝 onBlur - validating:', displayValue);
                       if (displayValue && displayValue.length >= 8) {
                         const normalizedDate = validateDateInput(displayValue);
                         console.log('📝 onBlur - normalizedDate:', normalizedDate);
                         if (normalizedDate) {
                           // Set validating flag to prevent useEffect override
                           const dobKey = `member_${index}_dob`;
                           setValidatingFields(prev => new Set(prev).add(dobKey));
                           validatingFieldsRef.current.add(dobKey);
                           
                           // Validate with delay
                           setTimeout(() => {
                             console.log('📝 onBlur validation for:', normalizedDate, 'member type:', memberType);
                             const validationResult = validateMemberAge(memberType, normalizedDate);
                             console.log('📝 onBlur validation result:', validationResult);
                             
                             // Set error state immediately and persistently
                             setErrors(prev => {
                               const newErrors = { ...prev };
                               if (validationResult.isValid) {
                                 console.log('✅ onBlur validation passed, clearing error');
                                 delete newErrors[dobKey];
                               } else {
                                 console.log('❌ onBlur validation failed:', validationResult.error);
                                 newErrors[dobKey] = validationResult.error;
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
                           console.log('📝 onBlur - invalid date format');
                           setErrors(prev => ({
                             ...prev,
                             [`member_${index}_dob`]: t('booking.step2.errors.dobInvalidFormat')
                           }));
                         }
                       } else if (!displayValue || displayValue.trim() === '') {
                         console.log('📝 onBlur - clearing error for empty field');
                         setErrors(prev => {
                           const newErrors = { ...prev };
                           delete newErrors[`member_${index}_dob`];
                           return newErrors;
                         });
                       }
                     }}
                     onKeyDown={(e) => {
                       // Trigger validation on Enter key
                       if (e.key === 'Enter') {
                         console.log('📝 Enter key pressed - triggering validation');
                         e.target.blur(); // This will trigger onBlur validation
                       }
                     }}
                     className={`${styles['form-input']} ${styles['date-input']} ${errors[`member_${index}_dob`] && touchedFields.has(`member_${index}_dob`) ? styles['error'] : ''}`}
                     placeholder={getDateFormat()}
                     title={t('booking.step2.placeholders.dateFormat', { format: getDateFormat() })}
                   />
                   {/* Hidden date input for calendar picker - positioned over the text input */}
                   <input
                     type="date"
                     id={`${memberType}-${index}-dob-hidden`}
                     style={{ 
                       position: 'absolute',
                       left: '0',
                       top: '0',
                       width: '100%',
                       height: '100%',
                       opacity: '0',
                       pointerEvents: 'none',
                       border: 'none',
                       outline: 'none',
                       zIndex: '10'
                     }}
                     max={new Date().toISOString().split('T')[0]}
                     onChange={(e) => {
                       if (e.target.value) {
                         console.log('🗓️ Date selected from native picker:', e.target.value);
                         
                         // Convert to display format and update
                         const normalizedDate = e.target.value;
                         const displayFormat = formatDateFromNormalized(normalizedDate);
                         console.log('🗓️ Date selected from picker - normalized:', normalizedDate, 'display:', displayFormat);
                         
                         // Always update the input first (so user can see what they selected)
                         handleDateChange(memberType, index, displayFormat);
                         
                         // Remove from editing state to show formatted date
                         const fieldKey = `${memberType}-${index}-dob`;
                         setEditingFields(prev => {
                           const newSet = new Set(prev);
                           newSet.delete(fieldKey);
                           console.log('🗓️ Removed from editing fields:', fieldKey);
                           return newSet;
                         });
                         
                         // Mark field as touched
                         setTouchedFields(prev => new Set(prev).add(`member_${index}_dob`));
                         
                   // Set validating flag to prevent useEffect override
                   const calendarFieldKey = `member_${index}_dob`;
                   setValidatingFields(prev => new Set(prev).add(calendarFieldKey));
                   validatingFieldsRef.current.add(calendarFieldKey);
                   
                   // Validate immediately since user has finished selecting from calendar
                   setTimeout(() => {
                     console.log('🗓️ Calendar picker validation for:', normalizedDate, 'member type:', memberType);
                     console.log('🗓️ About to call validateMemberAge...');
                     const validationResult = validateMemberAge(memberType, normalizedDate);
                     console.log('🗓️ Calendar validation result:', validationResult);
                     
                     // Set error state immediately and persistently
                     setErrors(prev => {
                       const newErrors = { ...prev };
                       if (validationResult.isValid) {
                         console.log('🗓️ ✅ Calendar validation passed, clearing error');
                         delete newErrors[`member_${index}_dob`];
                       } else {
                         console.log('🗓️ ❌ Calendar validation failed:', validationResult.error);
                         newErrors[`member_${index}_dob`] = validationResult.error;
                       }
                       return newErrors;
                     });
                     
                     // Clear validating flag after delay
                     setTimeout(() => {
                       setValidatingFields(prev => {
                         const newSet = new Set(prev);
                         newSet.delete(calendarFieldKey);
                         return newSet;
                       });
                       validatingFieldsRef.current.delete(calendarFieldKey);
                     }, 500); // 500ms to ensure useEffect doesn't override
                   }, 100); // 100ms delay to avoid conflict
                       } else {
                         console.log('🗓️ No date selected from picker');
                       }
                     }}
                   />
                   <button
                     type="button"
                     className={styles['date-picker-button']}
                     onClick={(e) => {
                       e.preventDefault();
                       e.stopPropagation();
                       console.log('🗓️ Calendar button clicked!');
                       
                       // Trigger the hidden date input
                       const hiddenInput = document.getElementById(`${memberType}-${index}-dob-hidden`);
                       console.log('🗓️ Hidden input found:', hiddenInput);
                       if (hiddenInput) {
                         // Focus the input first, then trigger click
                         hiddenInput.focus();
                         console.log('🗓️ Hidden input focused');
                         
                         // Use a small delay to ensure focus is set
                         setTimeout(() => {
                           // Use showPicker if available, otherwise click
                           if (hiddenInput.showPicker) {
                             try {
                               console.log('🗓️ Using showPicker()');
                               const showPickerResult = hiddenInput.showPicker();
                               // If showPicker returns a promise, handle it
                               if (showPickerResult && typeof showPickerResult.catch === 'function') {
                                 showPickerResult.catch(() => {
                                   // Fallback to click if showPicker fails
                                   console.log('🗓️ showPicker failed, using click fallback');
                                   hiddenInput.click();
                                 });
                               }
                             } catch (error) {
                               // Fallback to click if showPicker throws error
                               console.log('🗓️ showPicker failed, using click fallback:', error);
                               hiddenInput.click();
                             }
                           } else {
                             console.log('🗓️ showPicker not available, using click()');
                             hiddenInput.click();
                           }
                         }, 10);
                       } else {
                         console.log('🗓️ Hidden input not found!');
                       }
                     }}
                     title="Open date picker"
                   >
                     📅
                   </button>
                 </div>
                {errors[`member_${index}_dob`] && touchedFields.has(`member_${index}_dob`) && (
                  <span className={styles['form-error']}>{errors[`member_${index}_dob`]}</span>
                )}
              </div>

              <div className={styles['form-group']}>
                <label htmlFor={`${memberType}-${index}-gender`} className={`${styles['form-label']} ${styles['required']}`}>{t('booking.step2.labels.gender')}</label>
                <select
                  id={`${memberType}-${index}-gender`}
                  value={member.gender}
                  onChange={(e) => handleMemberChange(memberType, index, 'gender', e.target.value)}
                  onBlur={() => setTouchedFields(prev => new Set(prev).add(`${memberType}_${index}_gender`))}
                  className={`${styles['form-select']} ${errors[`member_${index}_gender`] && touchedFields.has(`${memberType}_${index}_gender`) ? styles['error'] : ''}`}
                >
                  <option value="">{t('booking.step2.placeholders.chooseGender')}</option>
                  <option value="male">{t('profile.genderOptions.male')}</option>
                  <option value="female">{t('profile.genderOptions.female')}</option>
                  <option value="other">{t('profile.genderOptions.other')}</option>
                </select>
                {errors[`member_${index}_gender`] && touchedFields.has(`${memberType}_${index}_gender`) && (
                  <span className={styles['form-error']}>{errors[`member_${index}_gender`]}</span>
                )}
              </div>

              <div className={styles['form-group']}>
                <label htmlFor={`${memberType}-${index}-nationality`} className={`${styles['form-label']} ${styles['required']}`}>{t('booking.step2.labels.nationality')}</label>
                <select
                  id={`${memberType}-${index}-nationality`}
                  value={member.nationality}
                  onChange={(e) => handleNationalityChange(memberType, index, e.target.value)}
                  onBlur={() => setTouchedFields(prev => new Set(prev).add(`${memberType}_${index}_nationality`))}
                  className={`${styles['form-select']} ${errors[`member_${index}_nationality`] && touchedFields.has(`${memberType}_${index}_nationality`) ? styles['error'] : ''}`}
                >
                  <option value="">{t('booking.step2.placeholders.chooseNationality')}</option>
                  {countries.map(({code, label}) => (
                    <option key={code} value={code}>
                      {label}
                    </option>
                  ))}
                </select>
                {errors[`member_${index}_nationality`] && touchedFields.has(`${memberType}_${index}_nationality`) && (
                  <span className={styles['form-error']}>{errors[`member_${index}_nationality`]}</span>
                )}
              </div>

              {/* Dynamic ID/Passport field based on confirmed nationality and age */}
              {confirmedNationalities[`${memberType}-${index}`] && (
                <div className={styles['form-group']}>
                  {(() => {
                        const nationality = confirmedNationalities[`${memberType}-${index}`];
                    const departureDate = plan.date.year && plan.date.month && plan.date.day 
                      ? new Date(plan.date.year, plan.date.month - 1, plan.date.day)
                      : null;
                    const idRequired = isIdRequired(member.dob, nationality);
                    const age = calculateAge(member.dob, departureDate);
                    
                    if (!idRequired && nationality === 'VN') {
                      // Show information message for Vietnamese who don't need ID
                      return (
                        <div className={styles['id-info-message']}>
                          <div className={styles['info-icon']}>ℹ️</div>
                          <div className={styles['info-text']}>
                            {age < 2 && t('booking.step2.idInfo.baby')}
                            {age >= 2 && age < 14 && t('booking.step2.idInfo.child')}
                            {age >= 14 && age < 16 && t('booking.step2.idInfo.teen')}
                          </div>
                        </div>
                      );
                    }
                    
                    // Show ID/Passport field for those who need it
                    return (
                      <>
                        <label htmlFor={`${memberType}-${index}-idNumber`} className={`${styles['form-label']} ${idRequired ? styles['required'] : ''}`}>
                          {nationality === 'VN' ? t('booking.step2.labels.idNumberCCCD') : t('booking.step2.labels.idNumberPassport')}
                        </label>
                        {nationality === 'VN' && (
                          <div className={styles['id-input-notice']}>
                            <span className={styles['notice-text']}>💡 {
                              currentLanguage === 'ko' ? '숫자만 입력: 12자리 (CCCD) 또는 9자리 (CMND/CMT)' :
                              currentLanguage === 'en' ? 'Numbers only: 12 digits (CCCD) or 9 digits (CMND/CMT)' :
                              'Chỉ nhập số: 12 số (CCCD) hoặc 9 số (CMND/CMT)'
                            }</span>
                          </div>
                        )}
                        <input
                          type="text"
                          id={`${memberType}-${index}-idNumber`}
                          value={member.idNumber}
                          onChange={(e) => handleIdNumberChange(memberType, index, e.target.value)}
                          onBlur={(e) => handleIdNumberBlur(memberType, index, e.target.value)}
                          className={`${styles['form-input']} ${errors[`${memberType}_${index}_idNumber`] && touchedFields.has(`${memberType}_${index}_idNumber`) ? styles['error'] : ''}`}
                          placeholder={nationality === 'VN' ? 
                            (currentLanguage === 'ko' ? '숫자만 입력: 12자리 (CCCD) 또는 9자리 (CMND/CMT)' : 
                             currentLanguage === 'en' ? 'Numbers only: 12 digits (CCCD) or 9 digits (CMND/CMT)' :
                             'Chỉ nhập số: 12 số (CCCD) hoặc 9 số (CMND/CMT)') : 
                            t('booking.step2.placeholders.idPassport')}
                        />
                        {errors[`${memberType}_${index}_idNumber`] && touchedFields.has(`${memberType}_${index}_idNumber`) && (
                          <span className={styles['form-error']}>{errors[`${memberType}_${index}_idNumber`]}</span>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        ))}
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
        <h3 className={styles['section-title']}>{t('booking.step2.sections.dateTitle')}</h3>
        <div className={styles['date-section']}>
          {/* Date Picker Input */}
          <div className={styles['date-picker-group']}>
            <label htmlFor="departureDate" className={`${styles['form-label']} ${styles['required']}`}>{t('booking.step2.fields.date')}</label>
            <input
              type="date"
              id="departureDate"
              value={plan.date.year && plan.date.month && plan.date.day 
                ? `${plan.date.year}-${plan.date.month.toString().padStart(2, '0')}-${plan.date.day.toString().padStart(2, '0')}`
                : ''
              }
              onChange={(e) => {
                const dateValue = e.target.value;
                if (dateValue) {
                  const [year, month, day] = dateValue.split('-');
                  setDate({
                    year: parseInt(year),
                    month: parseInt(month),
                    day: parseInt(day)
                  });
                } else {
                  setDate({ day: null, month: null, year: null });
                }
              }}
              min={new Date().toISOString().split('T')[0]} // Không cho chọn ngày trong quá khứ
              max={(() => {
                const maxDate = new Date();
                maxDate.setMonth(maxDate.getMonth() + 1);
                return maxDate.toISOString().split('T')[0];
              })()} // Giới hạn chọn trong vòng 1 tháng
              className={`${styles['form-input']} ${errors.date && dateTouched ? styles['error'] : ''}`}
              onBlur={() => setDateTouched(true)}
            />
          </div>

          {/* Display Selected Date in 3 separate boxes */}
          {plan.date.day && plan.date.month && plan.date.year && (
            <div className={styles['date-display-section']}>
              <div className={styles['date-display-group']}>
                <div className={`${styles['form-label']} ${styles['required']}`}>{t('booking.step2.dateDisplay.day')}</div>
                <div className={styles['date-display-box']}>
                  {plan.date.day}
                </div>
              </div>

              <div className={styles['date-display-group']}>
                <div className={`${styles['form-label']} ${styles['required']}`}>{t('booking.step2.dateDisplay.month')}</div>
                <div className={styles['date-display-box']}>
                  {plan.date.month}
                </div>
              </div>

              <div className={styles['date-display-group']}>
                <div className={`${styles['form-label']} ${styles['required']}`}>{t('booking.step2.dateDisplay.year')}</div>
                <div className={styles['date-display-box']}>
                  {plan.date.year}
                </div>
              </div>
            </div>
          )}

          {errors.date && (
            <span className={styles['form-error']}>{errors.date}</span>
          )}
        </div>
      </div>

      {/* Pax Counter */}
      <div className={styles['form-section']}>
        <h3 className={styles['section-title']}>{t('booking.step2.sections.paxTitle')}</h3>
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
             {/* Debug: {console.log('Adult price in render:', tourPrices.adult)} */}
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
        <h3 className={styles['section-title']}>{t('booking.step2.sections.membersTitle')}</h3>
        <div className={styles['members-section']}>
          {renderMemberForm('adult', plan.members.adult)}
          {renderMemberForm('child', plan.members.child)}
          {renderMemberForm('infant', plan.members.infant)}
        </div>
      </div>

      {/* Price Summary */}
      <div className={styles['price-summary']}>
        <div className={styles['price-breakdown']}>
          {plan.pax.adult > 0 && (
            <div className={styles['price-item']}>
              <span className={styles['price-label']}>{t('booking.step2.pax.adult')} ({plan.pax.adult})</span>
              <span className={styles['price-value']}>{formatPrice(plan.price.adult)}</span>
            </div>
          )}
          {plan.pax.child > 0 && (
            <div className={styles['price-item']}>
              <span className={styles['price-label']}>{t('booking.step2.pax.child')} ({plan.pax.child})</span>
              <span className={styles['price-value']}>{formatPrice(plan.price.child)}</span>
            </div>
          )}
          {plan.pax.infant > 0 && (
            <div className={styles['price-item']}>
              <span className={styles['price-label']}>{t('booking.step2.pax.infant')} ({plan.pax.infant})</span>
              <span className={styles['price-value']}>{formatPrice(plan.price.infant)}</span>
            </div>
          )}
        </div>
        <div className={styles['price-total']}>
          <span className={styles['price-total-label']}>{t('booking.step2.summary.totalLabel')}</span>
          <span className={styles['price-total-value']}>{formatPrice(plan.price.total)}</span>
        </div>
      </div>

      {/* Navigation is handled by parent component */}
    </div>
  );
};

// No props needed - navigation handled by parent

export default Step2Details;
