import { useMemo } from 'react';

// Custom hook để validate tour wizard steps: validate step1 (basic info), step2 (itinerary), step3 (pricing với min adultPrice 10000 VND), step4 (thumbnail), trả về stepValidations, completionPercentage, isStepCompleted, getStepErrors, isAllStepsCompleted
export const useStepValidation = (tourData) => {
  // Step validation logic: step1 kiểm tra tourName, duration, nights, tourType, maxCapacity, tourDeadline, tourExpirationDate (departurePoint và vehicle là default fields không cần validate), step2 kiểm tra tourDescription và tourSchedule (trim), step3 kiểm tra adultPrice >= 10000 VND (childrenPrice và babyPrice optional >= 0), step4 kiểm tra thumbnail
  const stepValidations = useMemo(() => ({
    step1: {
      isValid: !!(
        tourData.tourName &&
        tourData.duration &&
        tourData.nights &&
        tourData.tourType &&
        tourData.maxCapacity &&
        tourData.tourDeadline !== '' &&
        tourData.tourExpirationDate
      ),
      missingFields: [
        !tourData.tourName && 'tourWizard.step1.fields.tourName',
        !tourData.duration && 'tourWizard.step1.fields.duration',
        !tourData.nights && 'tourWizard.step1.fields.nights',
        !tourData.tourType && 'tourWizard.step1.fields.tourType',
        !tourData.maxCapacity && 'tourWizard.step1.fields.maxCapacity',
        (tourData.tourDeadline === '' || tourData.tourDeadline === undefined || tourData.tourDeadline === null) && 'tourWizard.step1.fields.tourDeadline',
        !tourData.tourExpirationDate && 'tourWizard.step1.fields.tourExpirationDate'
      ].filter(Boolean)
    },
    step2: {
      isValid: !!(
        tourData.tourDescription && 
        String(tourData.tourDescription).trim() &&
        tourData.tourSchedule && 
        String(tourData.tourSchedule).trim()
      ),
      missingFields: [
        (!tourData.tourDescription || !String(tourData.tourDescription).trim()) && 'tourWizard.step2.tourDescription.title',
        (!tourData.tourSchedule || !String(tourData.tourSchedule).trim()) && 'tourWizard.step2.fields.tourSchedule'
      ].filter(Boolean)
    },
    step3: {
      isValid: (() => {
        const MIN_PRICE_ADULT = 10000;
        const MIN_PRICE_CHILDREN_BABY = 0;
        
        const adultPrice = tourData.adultPrice ? String(tourData.adultPrice).trim() : '';
        if (!adultPrice) {
          return false;
        }
        
        const adultPriceNum = parseInt(adultPrice.replace(/[^0-9]/g, ''), 10);
        if (isNaN(adultPriceNum) || adultPriceNum < MIN_PRICE_ADULT) {
          return false;
        }
        
        const childrenPrice = tourData.childrenPrice !== null && tourData.childrenPrice !== undefined 
          ? String(tourData.childrenPrice).trim() 
          : '';
        const babyPrice = tourData.babyPrice !== null && tourData.babyPrice !== undefined 
          ? String(tourData.babyPrice).trim() 
          : '';
        
        if (childrenPrice !== '') {
          const childrenPriceNum = parseInt(childrenPrice.replace(/[^0-9]/g, ''), 10);
          if (isNaN(childrenPriceNum) || childrenPriceNum < MIN_PRICE_CHILDREN_BABY) {
            return false;
          }
        }
        
        if (babyPrice !== '') {
          const babyPriceNum = parseInt(babyPrice.replace(/[^0-9]/g, ''), 10);
          if (isNaN(babyPriceNum) || babyPriceNum < MIN_PRICE_CHILDREN_BABY) {
            return false;
          }
        }
        
        return true;
      })(),
      missingFields: [
        (!tourData.adultPrice || !String(tourData.adultPrice).trim()) && 'tourWizard.step3.pricing.adultPrice'
      ].filter(Boolean)
    },
    step4: {
      isValid: !!(tourData.thumbnail),
      missingFields: [
        !tourData.thumbnail && 'tourWizard.step4.thumbnail.title'
      ].filter(Boolean)
    }
  }), [tourData]);

  // Tính completion percentage: đếm số steps đã valid, chia cho 4 (tổng số steps) nhân 100
  const completionPercentage = useMemo(() => {
    const completedSteps = Object.values(stepValidations).filter(step => step.isValid).length;
    return (completedSteps / 4) * 100;
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

export default useStepValidation;
