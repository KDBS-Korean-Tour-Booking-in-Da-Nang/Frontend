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
        tourData.itinerary && 
        tourData.itinerary.length > 0 && 
        tourData.tourSchedule && 
        String(tourData.tourSchedule).trim()
      ),
      missingFields: [
        (!tourData.itinerary || tourData.itinerary.length === 0) && 'tourWizard.step2.title',
        (!tourData.tourSchedule || !String(tourData.tourSchedule).trim()) && 'tourWizard.step2.fields.tourSchedule'
      ].filter(Boolean)
    },
    step3: {
      isValid: !!(
        tourData.adultPrice && 
        String(tourData.adultPrice).trim() &&
        tourData.childrenPrice && 
        String(tourData.childrenPrice).trim() &&
        tourData.babyPrice && 
        String(tourData.babyPrice).trim()
      ),
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
