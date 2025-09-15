import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../../../contexts/ToastContext';
import { TourWizardProvider, useTourWizardContext } from '../../../../contexts/TourWizardContext';
import { useStepValidation } from '../../../../hooks/useStepValidation';
import Step1BasicInfo from './components/Step1/Step1BasicInfo';
import Step2Itinerary from './components/Step2/Step2Itinerary';
import Step3Pricing from './components/Step3/Step3Pricing';
import Step4Media from './components/Step4/Step4Media';
import './TourWizard.css';

const TourWizardContent = () => {
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();
  const { tourData } = useTourWizardContext();
  const [currentStep, setCurrentStep] = useState(1);
  
  // Use custom hook for step validation
  const { isStepCompleted, getStepErrors } = useStepValidation(tourData);

  const steps = [
    { id: 1, title: 'Thông tin cơ bản', description: 'Nhập thông tin cơ bản của tour' },
    { id: 2, title: 'Lịch trình', description: 'Thiết lập chi tiết lịch trình' },
    { id: 3, title: 'Giá & chính sách', description: 'Thiết lập giá và chính sách' },
    { id: 4, title: 'Hình ảnh', description: 'Upload hình ảnh và tệp đính kèm' }
  ];


  const nextStep = () => {
    if (currentStep < 4) {
      // Get validation errors for current step
      const errors = getStepErrors(currentStep);
      
      if (errors.length > 0) {
        // Show specific error messages
        errors.forEach(error => {
          showError(`${error} là bắt buộc`);
        });
      } else {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      // Validate final data
      if (!tourData.tourName || !tourData.thumbnail) {
        showError('Vui lòng điền đầy đủ thông tin bắt buộc');
        return;
      }

      // Create FormData for multipart upload
      const formData = new FormData();
      
      // Get current user data from localStorage/sessionStorage (same logic as AuthContext)
      const remembered = localStorage.getItem('rememberMe') === 'true';
      const storage = remembered ? localStorage : sessionStorage;
      const savedUser = storage.getItem('user');
      const token = storage.getItem('token');
      
      
      if (!savedUser || !token) {
        showError('Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.');
        return;
      }
      
      const userData = JSON.parse(savedUser);
      const userEmail = userData.email;
      const userRole = userData.role;
      
      
      if (!userEmail) {
        showError('Không tìm thấy email người dùng. Vui lòng đăng nhập lại.');
        return;
      }
      
      if (userRole !== 'COMPANY') {
        showError('Chỉ tài khoản Company mới có thể tạo tour.');
        return;
      }

      // Add tour data as JSON - Complete data with all wizard fields
      const tourRequest = {
        companyEmail: userEmail, // Use current user's email
        tourName: tourData.tourName,
        tourDescription: tourData.tourDescription || `Tour ${tourData.tourName} - ${tourData.duration} ngày ${tourData.nights} đêm`,
        tourDuration: `${tourData.duration} ngày ${tourData.nights} đêm`,
        tourDeparturePoint: 'Đà Nẵng', // All tours depart from Da Nang
        tourVehicle: 'Xe du lịch', // Hardcoded as requested
        tourType: tourData.tourType,
        tourSchedule: JSON.stringify(tourData.itinerary || []), // Full itinerary
        amount: parseInt(tourData.maxCapacity) || 30,
        adultPrice: parseFloat(tourData.adultPrice) || 0,
        childrenPrice: parseFloat(tourData.childrenPrice) || 0,
        babyPrice: parseFloat(tourData.babyPrice) || 0,
        
        // Additional fields from wizard
        availableDates: tourData.availableDates || [],
        bookingDeadline: tourData.bookingDeadline || null, // Will be converted to LocalDateTime in backend
        surchargePolicy: tourData.surchargePolicy || '',
        cancellationPolicy: tourData.cancellationPolicy || '',
        surcharges: tourData.surcharges || [],
        gallery: [], // Removed for testing
        attachments: [], // Removed for testing
        
        contents: (tourData.itinerary || []).map((day, index) => ({
          tourContentTitle: `Ngày ${index + 1}: ${day.dayTitle || day.location || 'Địa điểm'}`,
          tourContentDescription: day.activities || day.description || `Hoạt động ngày ${index + 1}`,
          images: day.images ? day.images.map(img => img.name) : [] // Image file names
        }))
      };

      formData.append('data', JSON.stringify(tourRequest));
      
      // Ensure we have a valid image file
      if (tourData.thumbnail && tourData.thumbnail instanceof File) {
        formData.append('tourImage', tourData.thumbnail);
      } else {
        // Create a minimal 1x1 transparent PNG placeholder
        const base64PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
        
        // Convert base64 to binary
        const binaryString = atob(base64PNG);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Create blob and file with explicit MIME type
        const blob = new Blob([bytes], { 
          type: 'image/png'
        });
        
        // Create file with explicit type and proper extension
        const imageFile = new File([blob], 'placeholder.png', { 
          type: 'image/png',
          lastModified: Date.now()
        });
        
        formData.append('tourImage', imageFile);
      }


      // Call backend API to create tour
      // Note: Backend endpoint /api/tour/create is public, no auth required
      const response = await fetch('/api/tour/create', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        showSuccess('Tạo tour thành công!');
        navigate('/business/tours');
        } else {
          let errorData;
          try {
            errorData = await response.json();
            console.error('Tour creation error:', errorData);
            console.error('Error details:', {
              status: response.status,
              statusText: response.statusText,
              errorCode: errorData.code,
              errorMessage: errorData.message,
              errorData: errorData
            });
            showError(errorData.message || `Có lỗi xảy ra khi tạo tour (${response.status})`);
          } catch (e) {
            // If JSON parsing fails, get text response
            const textResponse = await response.text();
            console.error('Tour creation error (text):', textResponse);
            console.error('Response status:', response.status);
            console.error('Response headers:', Object.fromEntries(response.headers.entries()));
            showError(`Có lỗi xảy ra khi tạo tour (${response.status}): ${textResponse}`);
          }
        }
    } catch (error) {
      console.error('Error creating tour:', error);
      showError('Có lỗi xảy ra khi tạo tour. Vui lòng thử lại.');
    }
  };


  // Handle step click
  const handleStepClick = (stepId) => {
    // Only allow clicking on completed steps or current step
    if (isStepCompleted(stepId) || stepId === currentStep) {
      setCurrentStep(stepId);
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1BasicInfo />;
      case 2:
        return <Step2Itinerary />;
      case 3:
        return <Step3Pricing />;
      case 4:
        return <Step4Media />;
      default:
        return null;
    }
  };

  return (
    <div className="tour-wizard">
      {/* Progress Bar */}
      <div className="progress-container">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${(currentStep / 4) * 100}%` }}
          />
        </div>
        <div className="progress-steps">
        {steps.map((step) => (
          <div 
            key={step.id} 
            className={`progress-step ${
              currentStep === step.id ? 'active' : 
              isStepCompleted(step.id) ? 'completed' : ''
            }`}
            onClick={() => handleStepClick(step.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleStepClick(step.id);
              }
            }}
            role="button"
            tabIndex={0}
          >
            <div className="step-number">{step.id}</div>
            <div className="step-info">
              <div className="step-title">{step.title}</div>
              <div className="step-description">{step.description}</div>
            </div>
          </div>
        ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="step-content">
        {renderCurrentStep()}
      </div>

      {/* Navigation Buttons */}
      <div className="step-navigation">
        <button 
          type="button" 
          className="btn-secondary" 
          onClick={prevStep}
          disabled={currentStep === 1}
        >
          Quay lại
        </button>
        
        {currentStep < 4 ? (
          <button 
            type="button" 
            className="btn-primary" 
            onClick={nextStep}
          >
            Tiếp theo
          </button>
        ) : (
          <button 
            type="button" 
            className="btn-success" 
            onClick={handleSubmit}
          >
            Hoàn thành
          </button>
        )}
      </div>
    </div>
  );
};

const TourWizard = () => {
  return (
    <TourWizardProvider>
      <TourWizardContent />
    </TourWizardProvider>
  );
};

export default TourWizard;
