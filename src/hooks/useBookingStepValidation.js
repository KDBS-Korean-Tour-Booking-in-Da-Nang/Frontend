import { useMemo } from 'react';

/**
 * Custom hook for validating tour booking wizard steps
 * @param {Object} bookingData - The current booking data (contact, plan)
 * @returns {Object} Validation results and utilities
 */
export const useBookingStepValidation = (bookingData) => {
  const { contact, plan, user } = bookingData;
  
  // Helper function to validate phone format
  const isValidPhone = (phone) => {
    if (!phone?.trim()) return false;
    const vietnameseRegex = /^0\d{9}$/;
    const internationalRegex = /^\+(\d{1,3})\s?\d{6,14}$/;
    return vietnameseRegex.test(phone) || internationalRegex.test(phone);
  };

  // Helper function to validate email format
  const isValidEmail = (email) => {
    if (!email?.trim()) return false;
    const emailRegex = /^\S+@\S+\.\S+$/;
    return emailRegex.test(email);
  };

  // Helper function to validate full name format (letters from all languages, spaces, hyphens, apostrophes)
  const isValidFullName = (fullName) => {
    if (!fullName?.trim()) return false;
    // Supports international names like: José, François, Müller, 李小明, 田中太郎, etc.
    const nameRegex = /^[\p{L}\p{M}\s\-']+$/u;
    return nameRegex.test(fullName.trim());
  };

  // Helper function to calculate age from date of birth at a specific date (same as Step2Details)
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

  // Helper function to validate date of birth format and age
  const isValidDob = (dob, minAge = 18) => {
    if (!dob?.trim()) return false;
    
    const age = calculateAge(dob);
    return age !== null && age >= minAge;
  };

  // Helper function to check if ID is required based on age and nationality
  const isIdRequired = (dob, nationality) => {
    if (!dob || !nationality) return false;
    
    const age = calculateAge(dob);
    if (age === null) return false;
    
    // For Vietnamese nationality (tour nội địa) - use country code VN
    if (nationality === 'VN') {
      // Em bé (0 - dưới 2 tuổi): Không bắt buộc CCCD/CMND
      if (age < 2) return false;
      
      // Trẻ em (2 - dưới 12 tuổi): Không bắt buộc CCCD/CMND
      if (age >= 2 && age < 12) return false;
      
      // Trẻ em (12 - dưới 14 tuổi): Không bắt buộc CCCD/CMND (có thể có hoặc không)
      if (age >= 12 && age < 14) return false;
      
      // Trẻ em (14 - dưới 18 tuổi): Bắt buộc CCCD (vì đã có thể làm CCCD)
      if (age >= 14 && age < 18) return true;
      
      // Người lớn (18 tuổi trở lên): Bắt buộc CCCD/CMND
      if (age >= 18) return true;
    }
    
    // For other nationalities: Always require passport
    return true;
  };

  // Step validation logic
  const stepValidations = useMemo(() => {
    // Get DOB from either contact or plan.members.adult[0]
    const representativeDob = contact?.dob || plan?.members?.adult?.[0]?.dob;
    
    return {
    step1: {
      isValid: !!(
        contact?.fullName?.trim() && 
        contact?.phone?.trim() && 
        contact?.email?.trim() && 
        representativeDob?.trim() &&
        contact?.address?.trim() &&
        contact?.pickupPoint?.trim() &&
        // Check full name format
        isValidFullName(contact?.fullName) &&
        // Check phone format
        isValidPhone(contact?.phone) &&
        // Check email format
        isValidEmail(contact?.email) &&
        // Check DOB format and age (representative must be >= 18)
        isValidDob(representativeDob, 18) &&
        // Check if email matches user's email (if user has email)
        (!user?.email || contact?.email?.trim().toLowerCase() === user.email.toLowerCase())
      ),
      missingFields: [
        !contact?.fullName?.trim() && 'booking.step1.fields.fullName',
        !isValidFullName(contact?.fullName) && contact?.fullName?.trim() && 'booking.step1.fields.fullName',
        !contact?.phone?.trim() && 'booking.step1.fields.phone',
        !isValidPhone(contact?.phone) && contact?.phone?.trim() && 'booking.step1.fields.phone',
        !contact?.email?.trim() && 'booking.step1.fields.email',
        !isValidEmail(contact?.email) && contact?.email?.trim() && 'booking.step1.fields.email',
        (user?.email && contact?.email?.trim() && contact?.email?.trim().toLowerCase() !== user.email.toLowerCase()) && 'booking.step1.fields.email',
        !representativeDob?.trim() && 'booking.step1.fields.dob',
        !isValidDob(representativeDob, 18) && representativeDob?.trim() && 'booking.step1.fields.dob',
        !contact?.address?.trim() && 'booking.step1.fields.address',
        !contact?.pickupPoint?.trim() && 'booking.step1.fields.pickupPoint'
      ].filter(Boolean)
    },
    step2: {
      isValid: (() => {
        const hasDate = plan?.date?.day && plan?.date?.month && plan?.date?.year;
        const hasAdultPax = plan?.pax?.adult > 0;
        
        // Check date is within valid range (today to 1 month from now)
        const dateValid = (() => {
          if (!hasDate) return false;
          const selectedDate = new Date(plan.date.year, plan.date.month - 1, plan.date.day);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const maxDate = new Date(today);
          maxDate.setMonth(maxDate.getMonth() + 1);
          return selectedDate >= today && selectedDate <= maxDate;
        })();
        
        // Check all members have required fields
        const allMembers = [...(plan?.members?.adult || []), ...(plan?.members?.child || []), ...(plan?.members?.infant || [])];
        
        const membersValid = allMembers
          .every((member, index) => {
            // For representative (adult[0]), use contact data as fallback for name and dob
            const isRepresentative = allMembers.indexOf(member) === 0 && plan?.members?.adult?.[0] === member;
            const effectiveFullName = isRepresentative ? (member?.fullName?.trim() || contact?.fullName?.trim()) : member?.fullName?.trim();
            const effectiveDob = isRepresentative ? (member?.dob || contact?.dob) : member?.dob;
            
            const hasBasicInfo = effectiveFullName && effectiveDob && member?.gender && member?.nationality;
            if (!hasBasicInfo) return false;
            
            // Check age requirements based on member type
            if (effectiveDob) {
              // First validate DOB format using the same logic as Step components
              const isValidDobFormat = isValidDob(effectiveDob, 0); // Use 0 as minAge to just check format
              
              if (!isValidDobFormat) {
                return false;
              }
              
              const age = calculateAge(effectiveDob);
              
              if (age === null) {
                return false;
              }
              
              // Check age requirements based on member type (using same logic as Step2Details)
              const actualMemberType = (() => {
                // Find which array this member belongs to
                const adultIndex = plan?.members?.adult?.findIndex(m => m === member);
                const childIndex = plan?.members?.child?.findIndex(m => m === member);
                const infantIndex = plan?.members?.infant?.findIndex(m => m === member);
                
                if (adultIndex !== undefined && adultIndex >= 0) return adultIndex === 0 ? 'representative' : 'adult';
                if (childIndex !== undefined && childIndex >= 0) return 'child';
                if (infantIndex !== undefined && infantIndex >= 0) return 'infant';
                return 'unknown';
              })();
              
              // Validate age requirements using same logic as Step2Details
              if (actualMemberType === 'representative') {
                // Representative must be at least 18 years old
                if (age < 18) {
                  return false;
                }
                
                // Also check age at departure date if available
                if (plan?.date?.day && plan?.date?.month && plan?.date?.year) {
                  const departureDate = new Date(plan.date.year, plan.date.month - 1, plan.date.day);
                  const ageAtDeparture = calculateAge(effectiveDob, departureDate);
                  
                  if (ageAtDeparture === null || ageAtDeparture < 18) {
                    return false;
                  }
                }
              } else if (actualMemberType === 'adult') {
                // Adults must be at least 12 years old
                if (age < 12) {
                  return false;
                }
                
                // Also check age at departure date if available
                if (plan?.date?.day && plan?.date?.month && plan?.date?.year) {
                  const departureDate = new Date(plan.date.year, plan.date.month - 1, plan.date.day);
                  const ageAtDeparture = calculateAge(effectiveDob, departureDate);
                  
                  if (ageAtDeparture === null || ageAtDeparture < 12) {
                    return false;
                  }
                }
              } else if (actualMemberType === 'child') {
                // Children must be 2-11 years old
                if (age < 2 || age >= 12) {
                  return false;
                }
                
                // Also check age at departure date if available
                if (plan?.date?.day && plan?.date?.month && plan?.date?.year) {
                  const departureDate = new Date(plan.date.year, plan.date.month - 1, plan.date.day);
                  const ageAtDeparture = calculateAge(effectiveDob, departureDate);
                  
                  if (ageAtDeparture === null || ageAtDeparture < 2 || ageAtDeparture >= 12) {
                    return false;
                  }
                }
              } else if (actualMemberType === 'infant') {
                // Infants must be under 2 years old
                if (age >= 2) {
                  return false;
                }
                
                // Also check age at departure date if available
                if (plan?.date?.day && plan?.date?.month && plan?.date?.year) {
                  const departureDate = new Date(plan.date.year, plan.date.month - 1, plan.date.day);
                  const ageAtDeparture = calculateAge(effectiveDob, departureDate);
                  
                  if (ageAtDeparture === null || ageAtDeparture >= 2) {
                    return false;
                  }
                }
              }
            }
            
            // Check if ID is required based on age and nationality
            const memberIdRequired = isIdRequired(member.dob, member.nationality);
            
            // If ID is required, check if it's provided and valid format
            if (memberIdRequired) {
              if (!member?.idNumber?.trim()) return false;
              
              // Validate format based on nationality
              if (member.nationality === 'VN') {
                // Vietnamese ID validation: 12 digits (CCCD) or 9 digits (CMND/CMT)
                const vietnameseIdRegex = /^(?:\d{12}|\d{9})$/;
                return vietnameseIdRegex.test(member.idNumber);
              } else {
                // Passport validation: 6-9 characters, letters and numbers
                const passportRegex = /^[A-Z0-9]{6,9}$/i;
                return passportRegex.test(member.idNumber);
              }
            }
            
            return true;
          });
        
        return hasDate && hasAdultPax && dateValid && membersValid;
      })(),
      missingFields: [
        // Check basic requirements
        (!plan?.date?.day || !plan?.date?.month || !plan?.date?.year) && 'booking.step2.toast.dateRequired',
        !plan?.pax?.adult && 'booking.step2.toast.adultPaxRequired',
        
        // Check representative (adult[0]) - use contact data as fallback
        (!(plan?.members?.adult?.[0]?.fullName?.trim() || contact?.fullName?.trim())) && 'booking.step2.toast.representativeNameRequired',
        (!(plan?.members?.adult?.[0]?.dob || contact?.dob)) && 'booking.step2.toast.representativeDobRequired',
        ((plan?.members?.adult?.[0]?.dob || contact?.dob) && !isValidDob(plan?.members?.adult?.[0]?.dob || contact?.dob, 0)) && 'booking.step2.toast.representativeDobInvalidFormat',
        (!(plan?.members?.adult?.[0]?.gender || contact?.gender)) && 'booking.step2.toast.representativeGenderRequired',
        (!(plan?.members?.adult?.[0]?.nationality || contact?.nationality)) && 'booking.step2.toast.representativeNationalityRequired',
        
        // Check representative ID validation
        ...(plan?.members?.adult?.[0]?.dob || contact?.dob ? (() => {
          const dob = plan?.members?.adult?.[0]?.dob || contact?.dob;
          const nationality = plan?.members?.adult?.[0]?.nationality || contact?.nationality;
          const idNumber = plan?.members?.adult?.[0]?.idNumber || contact?.idNumber;
          
          if (!isIdRequired(dob, nationality)) return [];
          
          const missingFields = [];
          if (!idNumber?.trim()) {
            if (nationality === 'VN') {
              missingFields.push('booking.step2.toast.representativeIdRequired');
            } else {
              missingFields.push('booking.step2.toast.representativeIdRequiredPassport');
            }
          } else if (nationality === 'VN') {
            // Vietnamese ID validation: 12 digits (CCCD) or 9 digits (CMND/CMT)
            const vietnameseIdRegex = /^(?:\d{12}|\d{9})$/;
            if (!vietnameseIdRegex.test(idNumber)) {
              missingFields.push('booking.step2.toast.representativeIdInvalidFormat');
            }
          } else {
            // Passport validation: 6-9 characters, letters and numbers
            const passportRegex = /^[A-Z0-9]{6,9}$/i;
            if (!passportRegex.test(idNumber)) {
              missingFields.push('booking.step2.toast.representativeIdInvalidFormatPassport');
            }
          }
          
          return missingFields;
        })() : []),
        
        // Check representative age validation
        ...(plan?.members?.adult?.[0]?.dob || contact?.dob ? (() => {
          const dob = plan?.members?.adult?.[0]?.dob || contact?.dob;
          if (!isValidDob(dob, 0)) return [];
          
          const age = calculateAge(dob);
          if (age === null) return [];
          
          const ageErrors = [];
          if (age < 18) {
            ageErrors.push('booking.step2.toast.representativeTooYoung');
          }
          
          // Check age at departure date if available
          if (plan?.date?.day && plan?.date?.month && plan?.date?.year) {
            const departureDate = new Date(plan.date.year, plan.date.month - 1, plan.date.day);
            const ageAtDeparture = calculateAge(dob, departureDate);
            
            if (ageAtDeparture === null || ageAtDeparture < 18) {
              ageErrors.push('booking.step2.toast.representativeTooYoung');
            }
          }
          
          return ageErrors;
        })() : []),
        
        // Check additional adults (adult[1] onwards)
        ...(plan?.members?.adult?.slice(1) || []).map((member, index) => {
          const adultNumber = index + 1;
          const missingFields = [];
          
          if (!member?.fullName?.trim()) missingFields.push(`booking.step2.toast.adultNameRequiredGeneric`);
          if (!member?.dob) missingFields.push(`booking.step2.toast.adultDobRequiredGeneric`);
          if (member?.dob && !isValidDob(member.dob, 0)) missingFields.push(`booking.step2.toast.adultDobInvalidFormatGeneric`);
          if (!member?.gender) missingFields.push(`booking.step2.toast.adultGenderRequiredGeneric`);
          if (!member?.nationality) missingFields.push(`booking.step2.toast.adultNationalityRequiredGeneric`);
          
          // Check adult age validation
          if (member?.dob && isValidDob(member.dob, 0)) {
            const age = calculateAge(member.dob);
            if (age !== null && age < 12) {
              missingFields.push('booking.step2.toast.adultTooYoung');
            }
            
            // Check age at departure date if available
            if (plan?.date?.day && plan?.date?.month && plan?.date?.year) {
              const departureDate = new Date(plan.date.year, plan.date.month - 1, plan.date.day);
              const ageAtDeparture = calculateAge(member.dob, departureDate);
              
              if (ageAtDeparture !== null && ageAtDeparture < 12) {
                missingFields.push('booking.step2.toast.adultTooYoung');
              }
            }
          }
          
          // Check adult ID validation
          if (member?.dob && member?.nationality && isIdRequired(member.dob, member.nationality)) {
            if (!member?.idNumber?.trim()) {
              if (member.nationality === 'VN') {
                missingFields.push('booking.step2.toast.adultIdRequiredGeneric');
              } else {
                missingFields.push('booking.step2.toast.adultIdRequiredGenericPassport');
              }
            } else if (member.nationality === 'VN') {
              // Vietnamese ID validation: 12 digits (CCCD) or 9 digits (CMND/CMT)
              const vietnameseIdRegex = /^(?:\d{12}|\d{9})$/;
              if (!vietnameseIdRegex.test(member.idNumber)) {
                missingFields.push('booking.step2.toast.adultIdInvalidFormatGeneric');
              }
            } else {
              // Passport validation: 6-9 characters, letters and numbers
              const passportRegex = /^[A-Z0-9]{6,9}$/i;
              if (!passportRegex.test(member.idNumber)) {
                missingFields.push('booking.step2.toast.adultIdInvalidFormatGenericPassport');
              }
            }
          }
          
          return missingFields;
        }).flat(),
        
        // Check children
        ...(plan?.members?.child || []).map((member, index) => {
          const childNumber = index + 1;
          const missingFields = [];
          
          if (!member?.fullName?.trim()) missingFields.push(`booking.step2.toast.childNameRequiredGeneric`);
          if (!member?.dob) missingFields.push(`booking.step2.toast.childDobRequiredGeneric`);
          if (member?.dob && !isValidDob(member.dob, 0)) missingFields.push(`booking.step2.toast.childDobInvalidFormatGeneric`);
          if (!member?.gender) missingFields.push(`booking.step2.toast.childGenderRequiredGeneric`);
          if (!member?.nationality) missingFields.push(`booking.step2.toast.childNationalityRequiredGeneric`);
          
          // Check child age validation
          if (member?.dob && isValidDob(member.dob, 0)) {
            const age = calculateAge(member.dob);
            if (age !== null) {
              if (age < 2) {
                missingFields.push('booking.step2.toast.childTooYoung');
              }
              if (age >= 12) {
                missingFields.push('booking.step2.toast.childTooOld');
              }
            }
            
            // Check age at departure date if available
            if (plan?.date?.day && plan?.date?.month && plan?.date?.year) {
              const departureDate = new Date(plan.date.year, plan.date.month - 1, plan.date.day);
              const ageAtDeparture = calculateAge(member.dob, departureDate);
              
              if (ageAtDeparture !== null) {
                if (ageAtDeparture < 2) {
                  missingFields.push('booking.step2.toast.childTooYoung');
                }
                if (ageAtDeparture >= 12) {
                  missingFields.push('booking.step2.toast.childTooOld');
                }
              }
            }
          }
          
          // Check child ID validation
          if (member?.dob && member?.nationality && isIdRequired(member.dob, member.nationality)) {
            if (!member?.idNumber?.trim()) {
              if (member.nationality === 'VN') {
                missingFields.push('booking.step2.toast.childIdRequiredGeneric');
              } else {
                missingFields.push('booking.step2.toast.childIdRequiredGenericPassport');
              }
            } else if (member.nationality === 'VN') {
              // Vietnamese ID validation: 12 digits (CCCD) or 9 digits (CMND/CMT)
              const vietnameseIdRegex = /^(?:\d{12}|\d{9})$/;
              if (!vietnameseIdRegex.test(member.idNumber)) {
                missingFields.push('booking.step2.toast.childIdInvalidFormatGeneric');
              }
            } else {
              // Passport validation: 6-9 characters, letters and numbers
              const passportRegex = /^[A-Z0-9]{6,9}$/i;
              if (!passportRegex.test(member.idNumber)) {
                missingFields.push('booking.step2.toast.childIdInvalidFormatGenericPassport');
              }
            }
          }
          
          return missingFields;
        }).flat(),
        
        // Check infants
        ...(plan?.members?.infant || []).map((member, index) => {
          const infantNumber = index + 1;
          const missingFields = [];
          
          if (!member?.fullName?.trim()) missingFields.push(`booking.step2.toast.infantNameRequiredGeneric`);
          if (!member?.dob) missingFields.push(`booking.step2.toast.infantDobRequiredGeneric`);
          if (member?.dob && !isValidDob(member.dob, 0)) missingFields.push(`booking.step2.toast.infantDobInvalidFormatGeneric`);
          if (!member?.gender) missingFields.push(`booking.step2.toast.infantGenderRequiredGeneric`);
          if (!member?.nationality) missingFields.push(`booking.step2.toast.infantNationalityRequiredGeneric`);
          
          // Check infant age validation
          if (member?.dob && isValidDob(member.dob, 0)) {
            const age = calculateAge(member.dob);
            if (age !== null && age >= 2) {
              missingFields.push('booking.step2.toast.infantTooOld');
            }
            
            // Check age at departure date if available
            if (plan?.date?.day && plan?.date?.month && plan?.date?.year) {
              const departureDate = new Date(plan.date.year, plan.date.month - 1, plan.date.day);
              const ageAtDeparture = calculateAge(member.dob, departureDate);
              
              if (ageAtDeparture !== null && ageAtDeparture >= 2) {
                missingFields.push('booking.step2.toast.infantTooOld');
              }
            }
          }
          
          // Check infant ID validation
          if (member?.dob && member?.nationality && isIdRequired(member.dob, member.nationality)) {
            if (!member?.idNumber?.trim()) {
              if (member.nationality === 'VN') {
                missingFields.push('booking.step2.toast.infantIdRequiredGeneric');
              } else {
                missingFields.push('booking.step2.toast.infantIdRequiredGenericPassport');
              }
            } else if (member.nationality === 'VN') {
              // Vietnamese ID validation: 12 digits (CCCD) or 9 digits (CMND/CMT)
              const vietnameseIdRegex = /^(?:\d{12}|\d{9})$/;
              if (!vietnameseIdRegex.test(member.idNumber)) {
                missingFields.push('booking.step2.toast.infantIdInvalidFormatGeneric');
              }
            } else {
              // Passport validation: 6-9 characters, letters and numbers
              const passportRegex = /^[A-Z0-9]{6,9}$/i;
              if (!passportRegex.test(member.idNumber)) {
                missingFields.push('booking.step2.toast.infantIdInvalidFormatGenericPassport');
              }
            }
          }
          
          return missingFields;
        }).flat()
      ].filter(Boolean)
    },
    step3: {
      isValid: (() => {
        // Step 3 is only valid if previous steps are completed
        const step1Valid = !!(
          contact?.fullName?.trim() && 
          contact?.phone?.trim() && 
          contact?.email?.trim() && 
          (contact?.dob || plan?.members?.adult?.[0]?.dob)?.trim() &&
          contact?.address?.trim() &&
          contact?.pickupPoint?.trim() &&
          isValidFullName(contact?.fullName) &&
          isValidPhone(contact?.phone) &&
          isValidEmail(contact?.email) &&
          isValidDob(contact?.dob || plan?.members?.adult?.[0]?.dob, 18) &&
          (!user?.email || contact?.email?.trim().toLowerCase() === user.email.toLowerCase())
        );
        
        const step2Valid = !!(
          plan?.date?.day && 
          plan?.date?.month && 
          plan?.date?.year &&
          plan?.pax?.adult > 0 &&
          (() => {
            if (!plan?.date?.day || !plan?.date?.month || !plan?.date?.year) return false;
            const selectedDate = new Date(plan.date.year, plan.date.month - 1, plan.date.day);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const maxDate = new Date(today);
            maxDate.setMonth(maxDate.getMonth() + 1);
            return selectedDate >= today && selectedDate <= maxDate;
          })() &&
          [...(plan?.members?.adult || []), ...(plan?.members?.child || []), ...(plan?.members?.infant || [])]
            .every(member => {
              const hasBasicInfo = member?.fullName?.trim() && member?.dob && member?.gender && member?.nationality;
              if (!hasBasicInfo) return false;
              
              if (member?.dob) {
                const today = new Date();
                const birthDate = new Date(member.dob);
                let age = today.getFullYear() - birthDate.getFullYear();
                const monthDiff = today.getMonth() - birthDate.getMonth();
                if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                  age--;
                }
                
                const memberType = (() => {
                  if (age < 2) return 'infant';
                  if (age >= 2 && age < 12) return 'child';
                  if (age >= 12) return 'adult';
                  return 'unknown';
                })();
                
                const actualMemberType = (() => {
                  const adultIndex = plan?.members?.adult?.findIndex(m => m === member);
                  const childIndex = plan?.members?.child?.findIndex(m => m === member);
                  const infantIndex = plan?.members?.infant?.findIndex(m => m === member);
                  
                  if (adultIndex !== undefined && adultIndex >= 0) return 'adult';
                  if (childIndex !== undefined && childIndex >= 0) return 'child';
                  if (infantIndex !== undefined && infantIndex >= 0) return 'infant';
                  return 'unknown';
                })();
                
                if (actualMemberType === 'adult') {
                  const adultIndex = plan?.members?.adult?.findIndex(m => m === member);
                  if (adultIndex === 0) {
                    if (age < 18) return false;
                  } else {
                    if (age < 12) return false;
                  }
                }
                if (actualMemberType === 'child') {
                  if (age < 2 || age >= 12) return false;
                }
                if (actualMemberType === 'infant') {
                  if (age >= 2) return false;
                }
              }
              
              return true;
            })
        );
        
        return step1Valid && step2Valid;
      })(),
      missingFields: []
    }
    };
  }, [contact, plan]);

  // Overall completion percentage
  const completionPercentage = useMemo(() => {
    const completedSteps = Object.values(stepValidations).filter(step => step.isValid).length;
    return (completedSteps / 3) * 100;
  }, [stepValidations]);

  // Check if specific step is completed
  const isStepCompleted = (stepId) => {
    const stepKey = `step${stepId}`;
    return stepValidations[stepKey]?.isValid || false;
  };

  // Get validation errors for a specific step
  const getStepErrors = (stepId) => {
    const stepKey = `step${stepId}`;
    return stepValidations[stepKey]?.missingFields || [];
  };

  // Check if all steps are completed
  const isAllStepsCompleted = useMemo(() => {
    return Object.values(stepValidations).every(step => step.isValid);
  }, [stepValidations]);

  return {
    stepValidations,
    completionPercentage,
    isStepCompleted,
    getStepErrors,
    isAllStepsCompleted
  };
};

export default useBookingStepValidation;
