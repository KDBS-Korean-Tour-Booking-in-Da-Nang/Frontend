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
      isValid: !!(tourData.tourName && tourData.departurePoint && 
                 tourData.duration && tourData.nights && tourData.tourType && tourData.maxCapacity),
      missingFields: [
        !tourData.tourName && 'tourWizard.step1.fields.tourName',
        !tourData.departurePoint && 'tourWizard.step1.fields.departurePoint',
        !tourData.duration && 'tourWizard.step1.fields.duration',
        !tourData.nights && 'tourWizard.step1.fields.nights',
        !tourData.tourType && 'tourWizard.step1.fields.tourType',
        !tourData.maxCapacity && 'tourWizard.step1.fields.maxCapacity'
      ].filter(Boolean)
    },
    step2: {
      isValid: !!(tourData.itinerary && tourData.itinerary.length > 0 && tourData.tourSchedule),
      missingFields: [
        (!tourData.itinerary || tourData.itinerary.length === 0) && 'tourWizard.step2.title',
        !tourData.tourSchedule && 'tourWizard.step2.fields.tourSchedule'
      ].filter(Boolean)
    },
    step3: {
      isValid: !!(tourData.adultPrice),
      missingFields: [
        !tourData.adultPrice && 'tourWizard.step3.pricing.adultPrice'
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
