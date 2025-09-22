import { useMemo } from 'react';

/**
 * Custom hook for validating tour booking wizard steps
 * @param {Object} bookingData - The current booking data (contact, plan)
 * @returns {Object} Validation results and utilities
 */
export const useBookingStepValidation = (bookingData) => {
  const { contact, plan, user } = bookingData;
  
  // Step validation logic
  const stepValidations = useMemo(() => ({
    step1: {
      isValid: !!(
        contact?.fullName?.trim() && 
        contact?.phone?.trim() && 
        contact?.email?.trim() && 
        contact?.address?.trim() &&
        contact?.pickupPoint?.trim() &&
        // Check if email matches user's email
        (!user?.email || contact?.email?.trim().toLowerCase() === user.email.toLowerCase())
      ),
      missingFields: [
        !contact?.fullName?.trim() && 'booking.step1.fields.fullName',
        !contact?.phone?.trim() && 'booking.step1.fields.phone',
        !contact?.email?.trim() && 'booking.step1.fields.email',
        !contact?.address?.trim() && 'booking.step1.fields.address',
        !contact?.pickupPoint?.trim() && 'booking.step1.fields.pickupPoint'
      ].filter(Boolean)
    },
    step2: {
      isValid: !!(
        plan?.date?.day && 
        plan?.date?.month && 
        plan?.date?.year &&
        plan?.pax?.adult > 0 &&
        // Check date is within valid range (today to 1 month from now)
        (() => {
          if (!plan?.date?.day || !plan?.date?.month || !plan?.date?.year) return false;
          const selectedDate = new Date(plan.date.year, plan.date.month - 1, plan.date.day);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const maxDate = new Date(today);
          maxDate.setMonth(maxDate.getMonth() + 1);
          return selectedDate >= today && selectedDate <= maxDate;
        })() &&
        // Check all members have required fields
        [...(plan?.members?.adult || []), ...(plan?.members?.child || []), ...(plan?.members?.infant || [])]
          .every(member => {
            const hasBasicInfo = member?.fullName?.trim() && member?.dob && member?.gender && member?.nationality;
            if (!hasBasicInfo) return false;
            
            // Check if ID is required based on age and nationality
            const isIdRequired = (() => {
              if (!member.dob || !member.nationality) return false;
              
              const today = new Date();
              const birthDate = new Date(member.dob);
              let age = today.getFullYear() - birthDate.getFullYear();
              const monthDiff = today.getMonth() - birthDate.getMonth();
              if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
              }
              
              // For Vietnamese nationality (tour nội địa)
              if (member.nationality === 'Việt Nam') {
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
            })();
            
            // If ID is required, check if it's provided and valid format
            if (isIdRequired) {
              if (!member?.idNumber?.trim()) return false;
              
              // Validate format based on nationality
              if (member.nationality === 'Việt Nam') {
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
          })
      ),
      missingFields: [
        (!plan?.date?.day || !plan?.date?.month || !plan?.date?.year) && 'booking.step2.fields.date',
        !plan?.pax?.adult && 'booking.step2.fields.adultPax',
        // Check for missing member information
        ...(plan?.members?.adult || []).map((member, index) => 
          !member?.fullName?.trim() ? `booking.step2.fields.adultName${index + 1}` : null
        ).filter(Boolean),
        ...(plan?.members?.adult || []).map((member, index) => 
          !member?.dob ? `booking.step2.fields.adultDob${index + 1}` : null
        ).filter(Boolean),
        ...(plan?.members?.adult || []).map((member, index) => 
          !member?.gender ? `booking.step2.fields.adultGender${index + 1}` : null
        ).filter(Boolean),
        ...(plan?.members?.adult || []).map((member, index) => 
          !member?.nationality ? `booking.step2.fields.adultNationality${index + 1}` : null
        ).filter(Boolean),
        ...(plan?.members?.adult || []).map((member, index) => {
          // Check if ID is required for this adult
          if (!member?.dob || !member?.nationality) return null;
          
          const today = new Date();
          const birthDate = new Date(member.dob);
          let age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
          
          const isIdRequired = member.nationality === 'Việt Nam' ? age >= 16 : true;
          return (isIdRequired && !member?.idNumber?.trim()) ? `booking.step2.fields.adultIdNumber${index + 1}` : null;
        }).filter(Boolean),
        ...(plan?.members?.child || []).map((member, index) => 
          !member?.fullName?.trim() ? `booking.step2.fields.childName${index + 1}` : null
        ).filter(Boolean),
        ...(plan?.members?.child || []).map((member, index) => 
          !member?.dob ? `booking.step2.fields.childDob${index + 1}` : null
        ).filter(Boolean),
        ...(plan?.members?.child || []).map((member, index) => 
          !member?.gender ? `booking.step2.fields.childGender${index + 1}` : null
        ).filter(Boolean),
        ...(plan?.members?.child || []).map((member, index) => 
          !member?.nationality ? `booking.step2.fields.childNationality${index + 1}` : null
        ).filter(Boolean),
        ...(plan?.members?.child || []).map((member, index) => {
          // Check if ID is required for this child
          if (!member?.dob || !member?.nationality) return null;
          
          const today = new Date();
          const birthDate = new Date(member.dob);
          let age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
          
          const isIdRequired = member.nationality === 'Việt Nam' ? age >= 16 : true;
          return (isIdRequired && !member?.idNumber?.trim()) ? `booking.step2.fields.childIdNumber${index + 1}` : null;
        }).filter(Boolean),
        ...(plan?.members?.infant || []).map((member, index) => 
          !member?.fullName?.trim() ? `booking.step2.fields.infantName${index + 1}` : null
        ).filter(Boolean),
        ...(plan?.members?.infant || []).map((member, index) => 
          !member?.dob ? `booking.step2.fields.infantDob${index + 1}` : null
        ).filter(Boolean),
        ...(plan?.members?.infant || []).map((member, index) => 
          !member?.gender ? `booking.step2.fields.infantGender${index + 1}` : null
        ).filter(Boolean),
        ...(plan?.members?.infant || []).map((member, index) => 
          !member?.nationality ? `booking.step2.fields.infantNationality${index + 1}` : null
        ).filter(Boolean),
        ...(plan?.members?.infant || []).map((member, index) => {
          // Check if ID is required for this infant
          if (!member?.dob || !member?.nationality) return null;
          
          const today = new Date();
          const birthDate = new Date(member.dob);
          let age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
          
          const isIdRequired = member.nationality === 'Việt Nam' ? age >= 16 : true;
          return (isIdRequired && !member?.idNumber?.trim()) ? `booking.step2.fields.infantIdNumber${index + 1}` : null;
        }).filter(Boolean)
      ].filter(Boolean)
    },
    step3: {
      isValid: true, // Step 3 is review, no validation needed
      missingFields: []
    }
  }), [contact, plan]);

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
