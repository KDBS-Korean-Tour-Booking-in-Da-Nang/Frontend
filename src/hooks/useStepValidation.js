import { useMemo } from 'react';

/**
 * Custom hook for validating tour wizard steps
 * @param {Object} tourData - The current tour data
 * @returns {Object} Validation results and utilities
 */
export const useStepValidation = (tourData) => {
  // Step validation logic
  const stepValidations = useMemo(() => ({
    step1: {
      isValid: !!(
        tourData.tourName &&
        // departurePoint and vehicle are default fields, not required for validation
        tourData.duration &&
        tourData.nights &&
        tourData.tourType &&
        tourData.maxCapacity &&
        tourData.tourDeadline !== '' &&
        tourData.tourExpirationDate
      ),
      missingFields: [
        !tourData.tourName && 'tourWizard.step1.fields.tourName',
        // departurePoint and vehicle are default fields, not required for validation
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
        const MIN_PRICE = 10000; // Minimum price: 10,000 VND
        
        // Check if all prices are non-empty
        const adultPrice = tourData.adultPrice ? String(tourData.adultPrice).trim() : '';
        const childrenPrice = tourData.childrenPrice ? String(tourData.childrenPrice).trim() : '';
        const babyPrice = tourData.babyPrice ? String(tourData.babyPrice).trim() : '';
        
        if (!adultPrice || !childrenPrice || !babyPrice) {
          return false;
        }
        
        // Check if all prices meet minimum requirement
        const adultPriceNum = parseInt(adultPrice.replace(/[^0-9]/g, ''), 10);
        const childrenPriceNum = parseInt(childrenPrice.replace(/[^0-9]/g, ''), 10);
        const babyPriceNum = parseInt(babyPrice.replace(/[^0-9]/g, ''), 10);
        
        return !isNaN(adultPriceNum) && adultPriceNum >= MIN_PRICE &&
               !isNaN(childrenPriceNum) && childrenPriceNum >= MIN_PRICE &&
               !isNaN(babyPriceNum) && babyPriceNum >= MIN_PRICE;
      })(),
      missingFields: [
        (!tourData.adultPrice || !String(tourData.adultPrice).trim()) && 'tourWizard.step3.pricing.adultPrice',
        (!tourData.childrenPrice || !String(tourData.childrenPrice).trim()) && 'tourWizard.step3.pricing.childrenPrice',
        (!tourData.babyPrice || !String(tourData.babyPrice).trim()) && 'tourWizard.step3.pricing.babyPrice'
      ].filter(Boolean)
    },
    step4: {
      isValid: !!(tourData.thumbnail),
      missingFields: [
        !tourData.thumbnail && 'tourWizard.step4.thumbnail.title'
      ].filter(Boolean)
    }
  }), [tourData]);

  // Overall completion percentage
  const completionPercentage = useMemo(() => {
    const completedSteps = Object.values(stepValidations).filter(step => step.isValid).length;
    return (completedSteps / 4) * 100;
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

export default useStepValidation;
