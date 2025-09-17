import { createContext, useContext, useState, useMemo } from 'react';

const TourWizardContext = createContext();

export const TourWizardProvider = ({ children }) => {
  const [tourData, setTourData] = useState({
    // Step 1: Basic Info
    tourName: '',
    departurePoint: 'Đà Nẵng', // Default departure point for all tours
    duration: '',
    nights: '',
    tourType: '',
    maxCapacity: '',
    bookingDeadline: '',
    
    // Step 2: Itinerary
    itinerary: [],
    mainSectionTitle: 'ĐIỂM ĐẾN VÀ HÀNH TRÌNH',
    
    // Step 3: Pricing
    adultPrice: '',
    childrenPrice: '',
    babyPrice: '',
    surcharges: [],
    
    // Step 4: Media
    thumbnail: null
  });

  const updateTourData = (stepData) => {
    setTourData(prev => ({ ...prev, ...stepData }));
  };

  const resetTourData = () => {
    setTourData({
      tourName: '',
      departurePoint: 'Đà Nẵng', // Default departure point
      duration: '',
      nights: '',
      tourType: '',
      maxCapacity: '',
      bookingDeadline: '',
      itinerary: [],
      mainSectionTitle: 'ĐIỂM ĐẾN VÀ HÀNH TRÌNH',
      adultPrice: '',
      childrenPrice: '',
      babyPrice: '',
      surcharges: [],
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


export const useTourWizardContext = () => {
  const context = useContext(TourWizardContext);
  if (!context) {
    console.error('TourWizardContext is not available. Make sure component is wrapped with TourWizardProvider');
    throw new Error('useTourWizardContext must be used within a TourWizardProvider');
  }
  return context;
};
