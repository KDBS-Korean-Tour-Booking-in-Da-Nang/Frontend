/**
 * Utility functions for formatting booking data
 */

/**
 * Format gender from frontend format to backend format
 * @param {string} gender - Frontend gender (male, female, other)
 * @returns {string} - Backend gender (MALE, FEMALE, OTHER)
 */
export const formatGender = (gender) => {
  switch (gender?.toLowerCase()) {
    case 'male':
      return 'MALE';
    case 'female':
      return 'FEMALE';
    case 'other':
      return 'OTHER';
    default:
      return 'MALE'; // Default fallback
  }
};

/**
 * Format guest type from frontend format to backend format
 * @param {string} memberType - Frontend member type (adult, child, infant)
 * @returns {string} - Backend guest type (ADULT, CHILD, BABY)
 */
export const formatGuestType = (memberType) => {
  switch (memberType?.toLowerCase()) {
    case 'adult':
      return 'ADULT';
    case 'child':
      return 'CHILD';
    case 'infant':
      return 'BABY';
    default:
      return 'ADULT'; // Default fallback
  }
};

/**
 * Format date from frontend format (YYYY-MM-DD) to backend format
 * @param {Object} dateObj - Frontend date object {day, month, year}
 * @returns {string} - Backend date format (YYYY-MM-DD)
 */
export const formatDate = (dateObj) => {
  if (!dateObj?.day || !dateObj?.month || !dateObj?.year) {
    throw new Error('Invalid date object');
  }
  
  const year = dateObj.year;
  const month = dateObj.month.toString().padStart(2, '0');
  const day = dateObj.day.toString().padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Format nationality to proper case
 * @param {string} nationality - Raw nationality string
 * @returns {string} - Formatted nationality
 */
export const formatNationality = (nationality) => {
  if (!nationality) return 'Vietnamese';
  
  // Handle Vietnamese nationality variations
  const lowerNationality = nationality.toLowerCase();
  if (lowerNationality === 'việt nam' || lowerNationality === 'vietnam') {
    return 'Vietnamese';
  }
  
  // Capitalize first letter of each word
  return nationality
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Convert display date format to YYYY-MM-DD for API
 * @param {string} displayDate - Date in display format (DD/MM/YYYY, MM/DD/YYYY, or YYYY.MM.DD)
 * @param {string} language - Language context ('vi', 'en', 'ko') to determine format
 * @returns {string} - Date in YYYY-MM-DD format for API
 */
export const formatDateForAPI = (displayDate, language = 'vi') => {
  if (!displayDate) return '';
  
  // If already in YYYY-MM-DD format, return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(displayDate)) {
    return displayDate;
  }
  
  // Parse different display formats
  let year, month, day;
  
  // Check for DD/MM/YYYY or MM/DD/YYYY format
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(displayDate)) {
    const [firstPart, secondPart, yearPart] = displayDate.split('/');
    const firstNum = parseInt(firstPart);
    const secondNum = parseInt(secondPart);
    
    // If first part > 12, it's definitely DD/MM/YYYY (Vietnamese format)
    if (firstNum > 12) {
      day = firstPart.padStart(2, '0');
      month = secondPart.padStart(2, '0');
      year = yearPart;
    }
    // If second part > 12, it's definitely MM/DD/YYYY (English format)
    else if (secondNum > 12) {
      month = firstPart.padStart(2, '0');
      day = secondPart.padStart(2, '0');
      year = yearPart;
    }
    // If both parts <= 12, determine based on language context
    else {
      if (language === 'en') {
        // English format: MM/DD/YYYY
        month = firstPart.padStart(2, '0');
        day = secondPart.padStart(2, '0');
        year = yearPart;
      } else {
        // Vietnamese format: DD/MM/YYYY (default)
        day = firstPart.padStart(2, '0');
        month = secondPart.padStart(2, '0');
        year = yearPart;
      }
    }
  }
  // Check for YYYY.MM.DD format (Korean)
  else if (/^\d{4}\.\d{1,2}\.\d{1,2}$/.test(displayDate)) {
    const [yearPart, monthPart, dayPart] = displayDate.split('.');
    year = yearPart;
    month = monthPart.padStart(2, '0');
    day = dayPart.padStart(2, '0');
  }
  // If format is not recognized, try to parse as is
  else {
    return displayDate;
  }
  
  // Validate date components
  if (!year || !month || !day) {
    return displayDate;
  }
  
  // Return in YYYY-MM-DD format
  return `${year}-${month}-${day}`;
};

/**
 * Format booking data from frontend context to backend API format
 * @param {Object} bookingContext - Frontend booking context data
 * @param {number} tourId - Tour ID
 * @param {string} language - Current language context ('vi', 'en', 'ko')
 * @param {string} userEmail - Email of the user making the booking
 * @returns {Object} - Formatted booking data for API
 */
export const formatBookingData = (bookingContext, tourId, language = 'vi', userEmail = '') => {
  const { contact, plan } = bookingContext;
  
  // Validate required fields
  if (!contact.fullName || !contact.phone || !contact.email) {
    throw new Error('Missing required contact information');
  }
  
  // contactAddress is optional in backend (no @NotBlank), but we'll ensure it's not null
  if (!contact.address) {
    console.warn('Contact address is missing, using empty string');
  }
  
  if (!plan.date.day || !plan.date.month || !plan.date.year) {
    throw new Error('Missing departure date');
  }
  
  if (plan.pax.adult < 1) {
    throw new Error('At least 1 adult is required');
  }
  
  // Format guests array
  const guests = [];
  
  // Add adult guests
  plan.members.adult.forEach((member, index) => {
    // For representative (index 0), use contact data as fallback for name and dob
    const isRepresentative = index === 0;
    const effectiveFullName = isRepresentative ? (member.fullName?.trim() || contact.fullName?.trim()) : member.fullName?.trim();
    const effectiveDob = isRepresentative ? (member.dob || contact.dob) : member.dob;
    
    if (effectiveFullName && effectiveDob) {
      try {
        const formattedBirthDate = formatDateForAPI(effectiveDob, language);
        // Validate birthDate format
        if (!formattedBirthDate || !/^\d{4}-\d{2}-\d{2}$/.test(formattedBirthDate)) {
          throw new Error(`Invalid birth date format for adult ${index + 1}: ${effectiveDob}`);
        }
        
        guests.push({
          fullName: effectiveFullName,
          birthDate: formattedBirthDate,
          gender: formatGender(member.gender),
          idNumber: (member.idNumber || '').trim(),
          nationality: formatNationality(member.nationality),
          bookingGuestType: 'ADULT'
        });
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error(`[formatBookingData] Error formatting adult ${index + 1} birth date:`, error, effectiveDob);
        }
        throw new Error(`Invalid birth date for adult ${index + 1}. Please check the date format.`);
      }
    }
  });
  
  // Add child guests
  plan.members.child.forEach((member, index) => {
    if (member.fullName && member.dob) {
      try {
        const formattedBirthDate = formatDateForAPI(member.dob, language);
        // Validate birthDate format
        if (!formattedBirthDate || !/^\d{4}-\d{2}-\d{2}$/.test(formattedBirthDate)) {
          throw new Error(`Invalid birth date format for child ${index + 1}: ${member.dob}`);
        }
        
        guests.push({
          fullName: member.fullName.trim(),
          birthDate: formattedBirthDate,
          gender: formatGender(member.gender),
          idNumber: (member.idNumber || '').trim(),
          nationality: formatNationality(member.nationality),
          bookingGuestType: 'CHILD'
        });
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error(`[formatBookingData] Error formatting child ${index + 1} birth date:`, error, member.dob);
        }
        throw new Error(`Invalid birth date for child ${index + 1}. Please check the date format.`);
      }
    }
  });
  
  // Add baby guests
  plan.members.infant.forEach((member, index) => {
    if (member.fullName && member.dob) {
      try {
        const formattedBirthDate = formatDateForAPI(member.dob, language);
        // Validate birthDate format
        if (!formattedBirthDate || !/^\d{4}-\d{2}-\d{2}$/.test(formattedBirthDate)) {
          throw new Error(`Invalid birth date format for infant ${index + 1}: ${member.dob}`);
        }
        
        guests.push({
          fullName: member.fullName.trim(),
          birthDate: formattedBirthDate,
          gender: formatGender(member.gender),
          idNumber: (member.idNumber || '').trim(),
          nationality: formatNationality(member.nationality),
          bookingGuestType: 'BABY'
        });
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error(`[formatBookingData] Error formatting infant ${index + 1} birth date:`, error, member.dob);
        }
        throw new Error(`Invalid birth date for infant ${index + 1}. Please check the date format.`);
      }
    }
  });
  
  // Validate that all guests have required information
  const totalExpectedGuests = plan.pax.adult + plan.pax.child + plan.pax.infant;
  if (guests.length !== totalExpectedGuests) {
    throw new Error('Some guests are missing required information (name and birth date)');
  }
  
  // Determine departure date format from plan.date (supports object or string)
  let formattedDepartureDate = '';
  try {
    if (typeof plan?.date === 'string') {
      formattedDepartureDate = formatDateForAPI(plan.date, language);
    } else if (plan?.date && typeof plan.date === 'object' && plan.date.day && plan.date.month && plan.date.year) {
      formattedDepartureDate = formatDate(plan.date);
    } else {
      throw new Error('Invalid date format');
    }
    
    // Validate that formatted date is not empty and is in correct format (YYYY-MM-DD)
    if (!formattedDepartureDate || !/^\d{4}-\d{2}-\d{2}$/.test(formattedDepartureDate)) {
      throw new Error('Invalid departure date format');
    }
  } catch (error) {
    // Log error in development mode
    if (import.meta.env.DEV) {
      console.error('[formatBookingData] Error formatting departure date:', error, plan?.date);
    }
    throw new Error('Invalid departure date. Please select a valid departure date.');
  }

  // Validate tourId
  const parsedTourId = parseInt(tourId, 10);
  if (!parsedTourId || isNaN(parsedTourId) || parsedTourId <= 0) {
    throw new Error('Invalid tour ID');
  }

  // Final validation: ensure departure date is set
  if (!formattedDepartureDate || formattedDepartureDate.trim() === '') {
    throw new Error('Departure date is required and must be in valid format (YYYY-MM-DD)');
  }

  // Format the final booking data
  // Note: bookingStatus is automatically set by BE @PrePersist to PENDING_PAYMENT
  const bookingData = {
    tourId: parsedTourId,
    userEmail: (userEmail || contact.email.trim()).trim(), // Use user email or fallback to contact email
    contactName: contact.fullName.trim(),
    contactAddress: (contact.address || '').trim(), // Ensure it's never null/undefined
    contactPhone: contact.phone.trim(),
    contactEmail: contact.email.trim(),
    pickupPoint: (contact.pickupPoint || '').trim(), // Ensure it's never null/undefined
    note: (contact.note || '').trim(), // Ensure it's never null/undefined
    departureDate: formattedDepartureDate.trim(),
    adultsCount: plan.pax.adult || 1, // Ensure at least 1 adult
    childrenCount: plan.pax.child || 0,
    babiesCount: plan.pax.infant || 0,
    bookingGuestRequests: guests
  };

  // Add voucherCode if provided (from bookingContext or separate parameter)
  if (bookingContext.voucherCode) {
    bookingData.voucherCode = bookingContext.voucherCode.trim();
  }
  
  // Log final booking data in development mode
  if (import.meta.env.DEV) {
    console.log('[formatBookingData] Final booking data:', {
      tourId: bookingData.tourId,
      departureDate: bookingData.departureDate,
      adultsCount: bookingData.adultsCount,
      childrenCount: bookingData.childrenCount,
      babiesCount: bookingData.babiesCount,
      guestsCount: bookingData.bookingGuestRequests.length,
      contactName: bookingData.contactName,
      contactEmail: bookingData.contactEmail,
      voucherCode: bookingData.voucherCode || 'none'
    });
  }
  
  return bookingData;
};

/**
 * Validate booking data before sending to API
 * @param {Object} bookingData - Formatted booking data
 * @returns {Object} - Validation result {isValid: boolean, errors: string[]}
 */
export const validateBookingData = (bookingData) => {
  const errors = [];
  
  // Validate tour ID
  if (!bookingData.tourId || bookingData.tourId <= 0) {
    errors.push('Invalid tour ID');
  }
  
  // Validate contact information
  if (!bookingData.contactName?.trim()) {
    errors.push('Contact name is required');
  }
  
  if (!bookingData.contactPhone?.trim()) {
    errors.push('Contact phone is required');
  }
  
  if (!bookingData.contactEmail?.trim()) {
    errors.push('Contact email is required');
  }
  
  if (!bookingData.contactAddress?.trim()) {
    errors.push('Contact address is required');
  }
  
  // Validate departure date
  if (!bookingData.departureDate) {
    errors.push('Departure date is required');
  } else {
    // Validate date format first
    if (!/^\d{4}-\d{2}-\d{2}$/.test(bookingData.departureDate)) {
      errors.push('Departure date must be in YYYY-MM-DD format');
    } else {
      // Parse departure date (should be in YYYY-MM-DD format)
      // Use UTC to avoid timezone issues
      const [year, month, day] = bookingData.departureDate.split('-').map(Number);
      const departureDate = new Date(Date.UTC(year, month - 1, day));
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      
      // Backend requires @Future, so date must be strictly in the future (not today)
      if (departureDate <= today) {
        errors.push('Departure date must be in the future (at least tomorrow)');
      }
    }
  }
  
  // Validate guest counts
  if (bookingData.adultsCount < 1) {
    errors.push('At least 1 adult is required');
  }
  
  if (bookingData.childrenCount < 0) {
    errors.push('Children count cannot be negative');
  }
  
  if (bookingData.babiesCount < 0) {
    errors.push('Babies count cannot be negative');
  }
  
  // Validate bookingGuestRequests array
  if (!bookingData.bookingGuestRequests || bookingData.bookingGuestRequests.length === 0) {
    errors.push('At least one guest is required');
  } else {
    const expectedTotal = bookingData.adultsCount + bookingData.childrenCount + bookingData.babiesCount;
    if (bookingData.bookingGuestRequests.length !== expectedTotal) {
      errors.push('Guest count mismatch');
    }
    
    // Validate each guest
    bookingData.bookingGuestRequests.forEach((guest, index) => {
      if (!guest.fullName?.trim()) {
        errors.push(`Guest ${index + 1}: Full name is required`);
      }
      
      if (!guest.birthDate) {
        errors.push(`Guest ${index + 1}: Birth date is required`);
      }
      
      if (!guest.gender) {
        errors.push(`Guest ${index + 1}: Gender is required`);
      }
      
      if (!guest.nationality?.trim()) {
        errors.push(`Guest ${index + 1}: Nationality is required`);
      }
      
      if (!guest.bookingGuestType) {
        errors.push(`Guest ${index + 1}: Guest type is required`);
      }
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
};
