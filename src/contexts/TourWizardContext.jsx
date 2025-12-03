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
    tourDeadline: '',
    tourExpirationDate: '',
    
    // Step 2: Itinerary
    itinerary: [],
    tourSchedule: '', // User-defined schedule summary
    mainSectionTitle: 'ĐIỂM ĐẾN VÀ HÀNH TRÌNH',
    
    // Step 3: Pricing
    adultPrice: '',
    childrenPrice: '',
    babyPrice: '',
    
    
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


export const useTourWizardContext = () => {
  const context = useContext(TourWizardContext);
  if (!context) {
    // Silently handle TourWizardContext not available
    throw new Error('useTourWizardContext must be used within a TourWizardProvider');
  }
  return context;
};
