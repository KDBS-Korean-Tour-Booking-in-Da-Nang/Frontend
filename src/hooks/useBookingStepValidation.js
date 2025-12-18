import { useMemo } from 'react';

// Custom hook để validate tour booking wizard steps: validate step1 (contact info với format checks), step2 (date, pax, members với age requirements và ID validation), step3 (chỉ valid nếu step1 và step2 valid), trả về stepValidations, completionPercentage, isStepCompleted, getStepErrors, isAllStepsCompleted
export const useBookingStepValidation = (bookingData) => {
  const { contact, plan, user } = bookingData;
  
  // Validate phone format: kiểm tra Vietnamese format (0xxxxxxxxx) hoặc international format (+country code + digits)
  const isValidPhone = (phone) => {
    if (!phone?.trim()) return false;
    const vietnameseRegex = /^0\d{9}$/;
    const internationalRegex = /^\+(\d{1,3})\s?\d{6,14}$/;
    return vietnameseRegex.test(phone) || internationalRegex.test(phone);
  };

  // Validate email format: kiểm tra format cơ bản với regex
  const isValidEmail = (email) => {
    if (!email?.trim()) return false;
    const emailRegex = /^\S+@\S+\.\S+$/;
    return emailRegex.test(email);
  };

  // Validate full name format: hỗ trợ international names (José, François, Müller, 李小明, 田中太郎), cho phép numbers (John123, Mary2), yêu cầu ít nhất một chữ cái, regex hỗ trợ Unicode letters, marks, digits, spaces, hyphens, apostrophes, parentheses, dots
  const isValidFullName = (fullName) => {
    if (!fullName?.trim()) return false;
    const nameRegex = /^[\p{L}\p{M}\d\s()\-'.]+$/u;
    const trimmed = fullName.trim();
    return nameRegex.test(trimmed) && /[\p{L}\p{M}]/u.test(trimmed);
  };

  // Tính age từ date of birth tại referenceDate (giống logic Step2Details): xử lý DD/MM/YYYY và YYYY-MM-DD format, tính age dựa trên year, month, day difference
  const calculateAge = (dob, referenceDate = null) => {
    if (!dob) return null;
    
    const refDate = referenceDate ? new Date(referenceDate) : new Date();
    
    let birthDate;
    if (typeof dob === 'string') {
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(dob)) {
        const [day, month, year] = dob.split('/');
        birthDate = new Date(year, month - 1, day);
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
        birthDate = new Date(dob);
      } else {
        birthDate = new Date(dob);
      }
    } else {
      birthDate = new Date(dob);
    }
    
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

  // Validate date of birth format và age: kiểm tra format và age >= minAge (mặc định 18)
  const isValidDob = (dob, minAge = 18) => {
    if (!dob?.trim()) return false;
    
    const age = calculateAge(dob);
    return age !== null && age >= minAge;
  };

  // Kiểm tra ID có bắt buộc không dựa trên age và nationality: VN: <2 tuổi không cần, 2-<12 không cần, 12-<14 không cần, 14-<18 cần CCCD, >=18 cần CCCD/CMND; các nationality khác: luôn cần passport
  const isIdRequired = (dob, nationality) => {
    if (!dob || !nationality) return false;
    
    const age = calculateAge(dob);
    if (age === null) return false;
    
    if (nationality === 'VN') {
      if (age < 2) return false;
      if (age >= 2 && age < 12) return false;
      if (age >= 12 && age < 14) return false;
      if (age >= 14 && age < 18) return true;
      if (age >= 18) return true;
    }
    
    return true;
  };

  // Step validation logic: step1 kiểm tra contact info (fullName với format, phone với format, email với format, dob với age >= 18, address, pickupPoint), step2 kiểm tra date (trong range today đến 1 tháng), pax (adult > 0), members (tất cả có basic info, age requirements theo member type, ID validation), step3 chỉ valid nếu step1 và step2 valid
  const stepValidations = useMemo(() => {
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
        isValidFullName(contact?.fullName) &&
        isValidPhone(contact?.phone) &&
        isValidEmail(contact?.email) &&
        isValidDob(representativeDob, 18)
      ),
      missingFields: [
        !contact?.fullName?.trim() && 'booking.step1.fields.fullName',
        !isValidFullName(contact?.fullName) && contact?.fullName?.trim() && 'booking.step1.fields.fullName',
        !contact?.phone?.trim() && 'booking.step1.fields.phone',
        !isValidPhone(contact?.phone) && contact?.phone?.trim() && 'booking.step1.fields.phone',
        !contact?.email?.trim() && 'booking.step1.fields.email',
        !isValidEmail(contact?.email) && contact?.email?.trim() && 'booking.step1.fields.email',
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
        
        const dateValid = (() => {
          if (!hasDate) return false;
          const selectedDate = new Date(plan.date.year, plan.date.month - 1, plan.date.day);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const maxDate = new Date(today);
          maxDate.setMonth(maxDate.getMonth() + 1);
          return selectedDate >= today && selectedDate <= maxDate;
        })();
        
        const allMembers = [...(plan?.members?.adult || []), ...(plan?.members?.child || []), ...(plan?.members?.infant || [])];
        
        const membersValid = allMembers
          .every((member, index) => {
            const isRepresentative = allMembers.indexOf(member) === 0 && plan?.members?.adult?.[0] === member;
            const effectiveFullName = isRepresentative ? (member?.fullName?.trim() || contact?.fullName?.trim()) : member?.fullName?.trim();
            const effectiveDob = isRepresentative ? (member?.dob || contact?.dob) : member?.dob;
            
            const hasBasicInfo = effectiveFullName && effectiveDob && member?.gender && member?.nationality;
            if (!hasBasicInfo) return false;
            
            if (effectiveDob) {
              const isValidDobFormat = isValidDob(effectiveDob, 0);
              
              if (!isValidDobFormat) {
                return false;
              }
              
              const age = calculateAge(effectiveDob);
              
              if (age === null) {
                return false;
              }
              
              const actualMemberType = (() => {
                const adultIndex = plan?.members?.adult?.findIndex(m => m === member);
                const childIndex = plan?.members?.child?.findIndex(m => m === member);
                const infantIndex = plan?.members?.infant?.findIndex(m => m === member);
                
                if (adultIndex !== undefined && adultIndex >= 0) return adultIndex === 0 ? 'representative' : 'adult';
                if (childIndex !== undefined && childIndex >= 0) return 'child';
                if (infantIndex !== undefined && infantIndex >= 0) return 'infant';
                return 'unknown';
              })();
              
              if (actualMemberType === 'representative') {
                if (age < 18) {
                  return false;
                }
                
                if (plan?.date?.day && plan?.date?.month && plan?.date?.year) {
                  const departureDate = new Date(plan.date.year, plan.date.month - 1, plan.date.day);
                  const ageAtDeparture = calculateAge(effectiveDob, departureDate);
                  
                  if (ageAtDeparture === null || ageAtDeparture < 18) {
                    return false;
                  }
                }
              } else if (actualMemberType === 'adult') {
                if (age < 18) {
                  return false;
                }
                
                if (plan?.date?.day && plan?.date?.month && plan?.date?.year) {
                  const departureDate = new Date(plan.date.year, plan.date.month - 1, plan.date.day);
                  const ageAtDeparture = calculateAge(effectiveDob, departureDate);
                  
                  if (ageAtDeparture === null || ageAtDeparture < 18) {
                    return false;
                  }
                }
              } else if (actualMemberType === 'child') {
                if (age < 2 || age >= 18) {
                  return false;
                }
                
                if (plan?.date?.day && plan?.date?.month && plan?.date?.year) {
                  const departureDate = new Date(plan.date.year, plan.date.month - 1, plan.date.day);
                  const ageAtDeparture = calculateAge(effectiveDob, departureDate);
                  
                  if (ageAtDeparture === null || ageAtDeparture < 2 || ageAtDeparture >= 18) {
                    return false;
                  }
                }
              } else if (actualMemberType === 'infant') {
                if (age >= 2) {
                  return false;
                }
                
                if (plan?.date?.day && plan?.date?.month && plan?.date?.year) {
                  const departureDate = new Date(plan.date.year, plan.date.month - 1, plan.date.day);
                  const ageAtDeparture = calculateAge(effectiveDob, departureDate);
                  
                  if (ageAtDeparture === null || ageAtDeparture >= 2) {
                    return false;
                  }
                }
              }
            }
            
            const memberIdRequired = isIdRequired(member.dob, member.nationality);
            
            if (memberIdRequired) {
              if (!member?.idNumber?.trim()) return false;
              
              if (member.nationality === 'VN') {
                const vietnameseIdRegex = /^(?:\d{12}|\d{9})$/;
                return vietnameseIdRegex.test(member.idNumber);
              } else {
                const passportRegex = /^[A-Z0-9]{6,9}$/i;
                return passportRegex.test(member.idNumber);
              }
            } else if (member?.idNumber?.trim()) {
              if (member.nationality === 'VN') {
                const vietnameseIdRegex = /^(?:\d{12}|\d{9})$/;
                return vietnameseIdRegex.test(member.idNumber);
              } else {
                const passportRegex = /^[A-Z0-9]{6,9}$/i;
                return passportRegex.test(member.idNumber);
              }
            }
            
            return true;
          });
        
        return hasDate && hasAdultPax && dateValid && membersValid;
      })(),
      missingFields: [
        (!plan?.date?.day || !plan?.date?.month || !plan?.date?.year) && 'booking.step2.toast.dateRequired',
        !plan?.pax?.adult && 'booking.step2.toast.adultPaxRequired',
        (!(plan?.members?.adult?.[0]?.fullName?.trim() || contact?.fullName?.trim())) && 'booking.step2.toast.representativeNameRequired',
        (!(plan?.members?.adult?.[0]?.dob || contact?.dob)) && 'booking.step2.toast.representativeDobRequired',
        ((plan?.members?.adult?.[0]?.dob || contact?.dob) && !isValidDob(plan?.members?.adult?.[0]?.dob || contact?.dob, 0)) && 'booking.step2.toast.representativeDobInvalidFormat',
        (!(plan?.members?.adult?.[0]?.gender || contact?.gender)) && 'booking.step2.toast.representativeGenderRequired',
        (!(plan?.members?.adult?.[0]?.nationality || contact?.nationality)) && 'booking.step2.toast.representativeNationalityRequired',
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
            const vietnameseIdRegex = /^(?:\d{12}|\d{9})$/;
            if (!vietnameseIdRegex.test(idNumber)) {
              missingFields.push('booking.step2.toast.representativeIdInvalidFormat');
            }
          } else {
            const passportRegex = /^[A-Z0-9]{6,9}$/i;
            if (!passportRegex.test(idNumber)) {
              missingFields.push('booking.step2.toast.representativeIdInvalidFormatPassport');
            }
          }
          
          return missingFields;
        })() : []),
        ...(plan?.members?.adult?.[0]?.dob || contact?.dob ? (() => {
          const dob = plan?.members?.adult?.[0]?.dob || contact?.dob;
          if (!isValidDob(dob, 0)) return [];
          
          const age = calculateAge(dob);
          if (age === null) return [];
          
          const ageErrors = [];
          if (age < 18) {
            ageErrors.push('booking.step2.toast.representativeTooYoung');
          }
          
          if (plan?.date?.day && plan?.date?.month && plan?.date?.year) {
            const departureDate = new Date(plan.date.year, plan.date.month - 1, plan.date.day);
            const ageAtDeparture = calculateAge(dob, departureDate);
            
            if (ageAtDeparture === null || ageAtDeparture < 18) {
              ageErrors.push('booking.step2.toast.representativeTooYoung');
            }
          }
          
          return ageErrors;
        })() : []),
        ...(plan?.members?.adult?.slice(1) || []).map((member, index) => {
          const adultNumber = index + 1;
          const missingFields = [];
          
          if (!member?.fullName?.trim()) missingFields.push(`booking.step2.toast.adultNameRequiredGeneric`);
          if (!member?.dob) missingFields.push(`booking.step2.toast.adultDobRequiredGeneric`);
          if (member?.dob && !isValidDob(member.dob, 0)) missingFields.push(`booking.step2.toast.adultDobInvalidFormatGeneric`);
          if (!member?.gender) missingFields.push(`booking.step2.toast.adultGenderRequiredGeneric`);
          if (!member?.nationality) missingFields.push(`booking.step2.toast.adultNationalityRequiredGeneric`);
          
          if (member?.dob && isValidDob(member.dob, 0)) {
            const age = calculateAge(member.dob);
            if (age !== null && age < 12) {
              missingFields.push('booking.step2.toast.adultTooYoung');
            }
            
            if (plan?.date?.day && plan?.date?.month && plan?.date?.year) {
              const departureDate = new Date(plan.date.year, plan.date.month - 1, plan.date.day);
              const ageAtDeparture = calculateAge(member.dob, departureDate);
              
              if (ageAtDeparture !== null && ageAtDeparture < 12) {
                missingFields.push('booking.step2.toast.adultTooYoung');
              }
            }
          }
          
          // Kiểm tra ID validation: nếu required theo age/nationality thì require và validate, nếu không required nhưng user đã nhập thì vẫn validate format để block proceed
          if (member?.dob && member?.nationality) {
            const required = isIdRequired(member.dob, member.nationality);
            const hasId = !!member?.idNumber?.trim();

            if (required) {
              if (!hasId) {
                if (member.nationality === 'VN') {
                  missingFields.push('booking.step2.toast.adultIdRequiredGeneric');
                } else {
                  missingFields.push('booking.step2.toast.adultIdRequiredGenericPassport');
                }
              } else if (member.nationality === 'VN') {
                const vietnameseIdRegex = /^(?:\d{12}|\d{9})$/;
                if (!vietnameseIdRegex.test(member.idNumber)) {
                  missingFields.push('booking.step2.toast.adultIdInvalidFormatGeneric');
                }
              } else {
                const passportRegex = /^[A-Z0-9]{6,9}$/i;
                if (!passportRegex.test(member.idNumber)) {
                  missingFields.push('booking.step2.toast.adultIdInvalidFormatGenericPassport');
                }
              }
            } else if (hasId) {
              if (member.nationality === 'VN') {
                const vietnameseIdRegex = /^(?:\d{12}|\d{9})$/;
                if (!vietnameseIdRegex.test(member.idNumber)) {
                  missingFields.push('booking.step2.toast.adultIdInvalidFormatGeneric');
                }
              } else {
                const passportRegex = /^[A-Z0-9]{6,9}$/i;
                if (!passportRegex.test(member.idNumber)) {
                  missingFields.push('booking.step2.toast.adultIdInvalidFormatGenericPassport');
                }
              }
            }
          }
          
          return missingFields;
        }).flat(),
        ...(plan?.members?.child || []).map((member, index) => {
          const childNumber = index + 1;
          const missingFields = [];
          
          if (!member?.fullName?.trim()) missingFields.push(`booking.step2.toast.childNameRequiredGeneric`);
          if (!member?.dob) missingFields.push(`booking.step2.toast.childDobRequiredGeneric`);
          if (member?.dob && !isValidDob(member.dob, 0)) missingFields.push(`booking.step2.toast.childDobInvalidFormatGeneric`);
          if (!member?.gender) missingFields.push(`booking.step2.toast.childGenderRequiredGeneric`);
          if (!member?.nationality) missingFields.push(`booking.step2.toast.childNationalityRequiredGeneric`);
          
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
          
          if (member?.dob && member?.nationality && isIdRequired(member.dob, member.nationality)) {
            if (!member?.idNumber?.trim()) {
              if (member.nationality === 'VN') {
                missingFields.push('booking.step2.toast.childIdRequiredGeneric');
              } else {
                missingFields.push('booking.step2.toast.childIdRequiredGenericPassport');
              }
            } else if (member.nationality === 'VN') {
              const vietnameseIdRegex = /^(?:\d{12}|\d{9})$/;
              if (!vietnameseIdRegex.test(member.idNumber)) {
                missingFields.push('booking.step2.toast.childIdInvalidFormatGeneric');
              }
            } else {
              const passportRegex = /^[A-Z0-9]{6,9}$/i;
              if (!passportRegex.test(member.idNumber)) {
                missingFields.push('booking.step2.toast.childIdInvalidFormatGenericPassport');
              }
            }
          }
          
          return missingFields;
        }).flat(),
        ...(plan?.members?.infant || []).map((member, index) => {
          const infantNumber = index + 1;
          const missingFields = [];
          
          if (!member?.fullName?.trim()) missingFields.push(`booking.step2.toast.infantNameRequiredGeneric`);
          if (!member?.dob) missingFields.push(`booking.step2.toast.infantDobRequiredGeneric`);
          if (member?.dob && !isValidDob(member.dob, 0)) missingFields.push(`booking.step2.toast.infantDobInvalidFormatGeneric`);
          if (!member?.gender) missingFields.push(`booking.step2.toast.infantGenderRequiredGeneric`);
          if (!member?.nationality) missingFields.push(`booking.step2.toast.infantNationalityRequiredGeneric`);
          
          if (member?.dob && isValidDob(member.dob, 0)) {
            const age = calculateAge(member.dob);
            if (age !== null && age >= 2) {
              missingFields.push('booking.step2.toast.infantTooOld');
            }
            
            if (plan?.date?.day && plan?.date?.month && plan?.date?.year) {
              const departureDate = new Date(plan.date.year, plan.date.month - 1, plan.date.day);
              const ageAtDeparture = calculateAge(member.dob, departureDate);
              
              if (ageAtDeparture !== null && ageAtDeparture >= 2) {
                missingFields.push('booking.step2.toast.infantTooOld');
              }
            }
          }
          
          if (member?.dob && member?.nationality && isIdRequired(member.dob, member.nationality)) {
            if (!member?.idNumber?.trim()) {
              if (member.nationality === 'VN') {
                missingFields.push('booking.step2.toast.infantIdRequiredGeneric');
              } else {
                missingFields.push('booking.step2.toast.infantIdRequiredGenericPassport');
              }
            } else if (member.nationality === 'VN') {
              const vietnameseIdRegex = /^(?:\d{12}|\d{9})$/;
              if (!vietnameseIdRegex.test(member.idNumber)) {
                missingFields.push('booking.step2.toast.infantIdInvalidFormatGeneric');
              }
            } else {
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
          isValidDob(contact?.dob || plan?.members?.adult?.[0]?.dob, 18)
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
              
              // ID format validation cũng block step khi provided dù không required, đảm bảo trường hợp Vietnamese 12-<14 nhập CCCD sai format sẽ không proceed
              if (member?.nationality && member?.idNumber?.trim()) {
                if (member.nationality === 'VN') {
                  const vnIdRegex = /^(?:\d{12}|\d{9})$/;
                  if (!vnIdRegex.test(member.idNumber)) {
                    return false;
                  }
                } else {
                  const passportRegex = /^[A-Z0-9]{6,9}$/i;
                  if (!passportRegex.test(member.idNumber)) {
                    return false;
                  }
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

  // Tính completion percentage: đếm số steps đã valid, chia cho 3 (tổng số steps) nhân 100
  const completionPercentage = useMemo(() => {
    const completedSteps = Object.values(stepValidations).filter(step => step.isValid).length;
    return (completedSteps / 3) * 100;
  }, [stepValidations]);

  // Kiểm tra step cụ thể đã completed chưa: lấy stepKey từ stepId, trả về isValid hoặc false
  const isStepCompleted = (stepId) => {
    const stepKey = `step${stepId}`;
    return stepValidations[stepKey]?.isValid || false;
  };

  // Lấy validation errors cho step cụ thể: lấy stepKey từ stepId, trả về missingFields hoặc empty array
  const getStepErrors = (stepId) => {
    const stepKey = `step${stepId}`;
    return stepValidations[stepKey]?.missingFields || [];
  };

  // Kiểm tra tất cả steps đã completed chưa: kiểm tra tất cả steps đều isValid
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
