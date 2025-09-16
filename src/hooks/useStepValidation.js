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
                 tourData.duration && tourData.nights && tourData.tourType),
      missingFields: [
        !tourData.tourName && 'Tên tour',
        !tourData.departurePoint && 'Điểm khởi hành',
        !tourData.duration && 'Số ngày',
        !tourData.nights && 'Số đêm',
        !tourData.tourType && 'Loại tour'
      ].filter(Boolean)
    },
    step2: {
      isValid: !!(tourData.itinerary && tourData.itinerary.length > 0 && 
                 tourData.maxCapacity && tourData.bookingDeadline),
      missingFields: [
        (!tourData.itinerary || tourData.itinerary.length === 0) && 'Lịch trình',
        !tourData.maxCapacity && 'Số chỗ tối đa',
        !tourData.bookingDeadline && 'Hạn chót đặt chỗ'
      ].filter(Boolean)
    },
    step3: {
      isValid: !!(tourData.adultPrice && tourData.cancellationPolicy),
      missingFields: [
        !tourData.adultPrice && 'Giá người lớn',
        !tourData.cancellationPolicy && 'Chính sách hủy/hoàn tiền'
      ].filter(Boolean)
    },
    step4: {
      isValid: !!(tourData.thumbnail),
      missingFields: [
        !tourData.thumbnail && 'Ảnh đại diện'
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
