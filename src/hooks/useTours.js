import { useSelector, useDispatch } from 'react-redux';
import { 
  loadTours, 
  loadToursByCategory, 
  setSearchQuery, 
  setCurrentCategory, 
  clearError 
} from '../store/tourSlice';

// Custom hook để quản lý tours từ Redux store: select state (tours, filteredTours, selectedTour, loading, error, currentCategory, searchQuery), cung cấp actions (loadTours, loadToursByCategory, searchTours, clearToursError), cung cấp selectors (getToursByCategory, getFeaturedTours, getTourById)
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
    tours,
    filteredTours,
    selectedTour,
    loading,
    error,
    currentCategory,
    searchQuery,
    loadTours: loadToursAction,
    loadToursByCategory: loadToursByCategoryAction,
    searchTours,
    clearToursError,
    getToursByCategory,
    getFeaturedTours,
    getTourById
  };
};
