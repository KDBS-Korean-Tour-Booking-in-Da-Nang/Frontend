import { createContext, useContext, useState, useMemo } from 'react';

const TourWizardContext = createContext();

// Provider component: quản lý tour wizard state (Step 1: Basic Info với departurePoint mặc định 'Đà Nẵng', Step 2: Itinerary với mainSectionTitle, Step 3: Pricing, Step 4: Media), cung cấp updateTourData và resetTourData
export const TourWizardProvider = ({ children }) => {
  const [tourData, setTourData] = useState({
    tourName: '',
    departurePoint: 'Đà Nẵng',
    duration: '',
    nights: '',
    tourType: '',
    maxCapacity: '',
    tourDeadline: '',
    tourExpirationDate: '',
    itinerary: [],
    tourSchedule: '',
    mainSectionTitle: 'ĐIỂM ĐẾN VÀ HÀNH TRÌNH',
    adultPrice: '',
    childrenPrice: '',
    babyPrice: '',
    thumbnail: null
  });

  // Cập nhật tour data: merge stepData vào tourData hiện tại, dùng cho multi-step wizard form
  const updateTourData = (stepData) => {
    setTourData(prev => ({ ...prev, ...stepData }));
  };

  // Reset tour data về initial state: clear tất cả fields về giá trị mặc định (departurePoint='Đà Nẵng', mainSectionTitle='ĐIỂM ĐẾN VÀ HÀNH TRÌNH')
  const resetTourData = () => {
    setTourData({
      tourName: '',
      departurePoint: 'Đà Nẵng',
      duration: '',
      nights: '',
      tourType: '',
      maxCapacity: '',
      tourDeadline: '',
      tourExpirationDate: '',
      itinerary: [],
      tourSchedule: '',
      mainSectionTitle: 'ĐIỂM ĐẾN VÀ HÀNH TRÌNH',
      adultPrice: '',
      childrenPrice: '',
      babyPrice: '',
      thumbnail: null
    });
  };

  const value = useMemo(() => ({
    tourData,
    updateTourData,
    resetTourData
  }), [tourData]);

  return (
    <TourWizardContext.Provider value={value}>
      {children}
    </TourWizardContext.Provider>
  );
};


// Hook để sử dụng TourWizardContext: throw error nếu không tìm thấy context (phải dùng trong TourWizardProvider)
export const useTourWizardContext = () => {
  const context = useContext(TourWizardContext);
  if (!context) {
    throw new Error('useTourWizardContext must be used within a TourWizardProvider');
  }
  return context;
};
