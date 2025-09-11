import { useSelector, useDispatch } from 'react-redux';
import { 
  loadTours, 
  loadToursByCategory, 
  setSearchQuery, 
  setCurrentCategory, 
  clearError 
} from '../store/tourSlice';

export const useTours = () => {
  const dispatch = useDispatch();
  const { tours, filteredTours, selectedTour, loading, error, currentCategory, searchQuery } = useSelector(
    (state) => state.tours
  );

  const loadToursAction = () => {
    dispatch(loadTours());
  };

  const loadToursByCategoryAction = (category) => {
    dispatch(loadToursByCategory(category));
  };

  const searchTours = (query) => {
    dispatch(setSearchQuery(query));
  };

  const clearToursError = () => {
    dispatch(clearError());
  };

  const getToursByCategory = (category) => {
    if (category === 'all') return tours;
    return tours.filter(tour => tour.category === category);
  };

  const getFeaturedTours = () => {
    return tours.filter(tour => tour.featured);
  };

  const getTourById = (id) => {
    return tours.find(tour => tour.id === id);
  };

  return {
    // State
    tours,
    filteredTours,
    selectedTour,
    loading,
    error,
    currentCategory,
    searchQuery,
    
    // Actions
    loadTours: loadToursAction,
    loadToursByCategory: loadToursByCategoryAction,
    searchTours,
    clearToursError,
    
    // Selectors
    getToursByCategory,
    getFeaturedTours,
    getTourById
  };
};
