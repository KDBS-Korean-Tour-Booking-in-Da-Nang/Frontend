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
 * Format booking data from frontend context to backend API format
 * @param {Object} bookingContext - Frontend booking context data
 * @param {number} tourId - Tour ID
 * @returns {Object} - Formatted booking data for API
 */
export const formatBookingData = (bookingContext, tourId) => {
  const { contact, plan } = bookingContext;
  
  // Validate required fields
  if (!contact.fullName || !contact.phone || !contact.email || !contact.address) {
    throw new Error('Missing required contact information');
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
    if (member.fullName && member.dob) {
      guests.push({
        fullName: member.fullName.trim(),
        birthDate: member.dob, // Already in YYYY-MM-DD format from date input
        gender: formatGender(member.gender),
        idNumber: member.idNumber || '',
        nationality: formatNationality(member.nationality),
        guestType: 'ADULT'
      });
    }
  });
  
  // Add child guests
  plan.members.child.forEach((member, index) => {
    if (member.fullName && member.dob) {
      guests.push({
        fullName: member.fullName.trim(),
        birthDate: member.dob,
        gender: formatGender(member.gender),
        idNumber: member.idNumber || '',
        nationality: formatNationality(member.nationality),
        guestType: 'CHILD'
      });
    }
  });
  
  // Add baby guests
  plan.members.infant.forEach((member, index) => {
    if (member.fullName && member.dob) {
      guests.push({
        fullName: member.fullName.trim(),
        birthDate: member.dob,
        gender: formatGender(member.gender),
        idNumber: member.idNumber || '',
        nationality: formatNationality(member.nationality),
        guestType: 'BABY'
      });
    }
  });
  
  // Validate that all guests have required information
  const totalExpectedGuests = plan.pax.adult + plan.pax.child + plan.pax.infant;
  if (guests.length !== totalExpectedGuests) {
    throw new Error('Some guests are missing required information (name and birth date)');
  }
  
  // Format the final booking data
  const bookingData = {
    tourId: parseInt(tourId),
    contactName: contact.fullName.trim(),
    contactAddress: contact.address.trim(),
    contactPhone: contact.phone.trim(),
    contactEmail: contact.email.trim(),
    pickupPoint: contact.pickupPoint?.trim() || '',
    note: contact.note?.trim() || '',
    departureDate: formatDate(plan.date),
    adultsCount: plan.pax.adult,
    childrenCount: plan.pax.child,
    babiesCount: plan.pax.infant,
    guests: guests
  };
  
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
    const departureDate = new Date(bookingData.departureDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (departureDate < today) {
      errors.push('Departure date cannot be in the past');
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
  
  // Validate guests array
  if (!bookingData.guests || bookingData.guests.length === 0) {
    errors.push('At least one guest is required');
  } else {
    const expectedTotal = bookingData.adultsCount + bookingData.childrenCount + bookingData.babiesCount;
    if (bookingData.guests.length !== expectedTotal) {
      errors.push('Guest count mismatch');
    }
    
    // Validate each guest
    bookingData.guests.forEach((guest, index) => {
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
      
      if (!guest.guestType) {
        errors.push(`Guest ${index + 1}: Guest type is required`);
      }
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
};
