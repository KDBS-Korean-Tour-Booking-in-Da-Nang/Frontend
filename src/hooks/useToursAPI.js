import { useState, useEffect } from 'react';
import { API_ENDPOINTS, getImageUrl, getTourImageUrl } from '../config/api';
import { checkAndHandle401 } from '../utils/apiErrorHandler';

// Helper function to strip HTML tags from text
const stripHtmlTags = (html) => {
  if (!html) return '';
  // Remove HTML tags and decode HTML entities
  return html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
    .replace(/&amp;/g, '&') // Replace &amp; with &
    .replace(/&lt;/g, '<') // Replace &lt; with <
    .replace(/&gt;/g, '>') // Replace &gt; with >
    .replace(/&quot;/g, '"') // Replace &quot; with "
    .replace(/&#39;/g, "'") // Replace &#39; with '
    .trim(); // Remove leading/trailing whitespace
};

// Hook để fetch tour data từ backend API
export const useToursAPI = () => {
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const transformTour = (tour) => ({
    id: tour.id,
    title: stripHtmlTags(tour.tourName),
    duration: tour.tourDuration,
    price: tour.adultPrice ? Number(tour.adultPrice) : 0,
    image: getTourImageUrl(tour.tourImgPath || tour.thumbnailUrl),
    description: stripHtmlTags(tour.tourDescription),
    descriptionHtml: tour.tourDescription || '',
    category: mapTourTypeToCategory(tour.tourType),
    featured: tour.tourStatus === 'APPROVED',
    // Additional fields from backend
    tourDeparturePoint: stripHtmlTags(tour.tourDeparturePoint),
    tourVehicle: stripHtmlTags(tour.tourVehicle),
    tourSchedule: stripHtmlTags(tour.tourSchedule),
    childrenPrice: tour.childrenPrice ? Number(tour.childrenPrice) : 0,
    babyPrice: tour.babyPrice ? Number(tour.babyPrice) : 0,
    amount: tour.amount,
    tourStatus: tour.tourStatus,
    createdAt: tour.createdAt,
    contents: tour.contents || [],
    // Customizable fields by company (optional)
    availableDates: tour.availableDates || [],
    gallery: Array.isArray(tour.gallery) ? tour.gallery.map(getImageUrl) : [],
    attachments: tour.attachments || []
  });

  // Fetch all tours from API
  const fetchTours = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get token for authentication
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      
      const response = await fetch(API_ENDPOINTS.TOURS, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });
      
      if (!response.ok) {
        // Handle 401 with global error handler
        if (await checkAndHandle401(response)) {
          throw new Error('Session expired. Please login again.');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Transform backend data to match frontend format
      const transformedTours = data.map(transformTour);
      
      setTours(transformedTours);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching tours:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch single tour by ID
  const fetchTourById = async (id) => {
    try {
      setLoading(true);
      setError(null);
      
      // Get token for authentication
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      
      const response = await fetch(API_ENDPOINTS.TOUR_BY_ID(id), {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });
      
      if (!response.ok) {
        // Handle 401 with global error handler
        if (await checkAndHandle401(response)) {
          throw new Error('Session expired. Please login again.');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const tour = await response.json();
      
      // Transform backend data to match frontend format
      return transformTour(tour);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching tour:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Map backend tour type to frontend category
  const mapTourTypeToCategory = (tourType) => {
    if (!tourType) return 'domestic';
    
    const type = tourType.toLowerCase();
    if (type.includes('international') || type.includes('nước ngoài') || type.includes('quốc tế')) {
      return 'international';
    }
    if (type.includes('day') || type.includes('ngày') || type.includes('1 ngày')) {
      return 'day-tour';
    }
    return 'domestic';
  };

  // Filter tours by category
  const getToursByCategory = (category) => {
    if (category === 'all') return tours;
    return tours.filter(tour => tour.category === category);
  };

  // Search tours
  const searchTours = (query) => {
    if (!query || query.trim() === '') return tours;
    
    const searchTerm = query.toLowerCase();
    return tours.filter(tour => 
      tour.title.toLowerCase().includes(searchTerm) ||
      tour.description.toLowerCase().includes(searchTerm) ||
      (tour.tourDeparturePoint && tour.tourDeparturePoint.toLowerCase().includes(searchTerm))
    );
  };

  // Server-side search tours via backend pagination API
  const searchToursServer = async (query, page = 0, size = 20, signal) => {
    try {
      setLoading(true);
      setError(null);

      // Get token for authentication
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');

      const url = `${API_ENDPOINTS.TOURS_SEARCH}?keyword=${encodeURIComponent(query)}&page=${page}&size=${size}`;
      const response = await fetch(url, { 
        signal,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });
      if (!response.ok) {
        // Handle 401 with global error handler
        if (await checkAndHandle401(response)) {
          throw new Error('Session expired. Please login again.');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const pageData = await response.json();
      const items = Array.isArray(pageData.content) ? pageData.content.map(transformTour) : [];
      return {
        items,
        totalPages: pageData.totalPages ?? 0,
        totalElements: pageData.totalElements ?? items.length,
        pageNumber: pageData.number ?? page,
        pageSize: pageData.size ?? size
      };
    } catch (err) {
      // Ignore abort errors
      if (err && (err.name === 'AbortError' || err.code === 20)) {
        return { items: [], totalPages: 0, totalElements: 0, pageNumber: 0, pageSize: size };
      }
      setError(err.message);
      console.error('Error searching tours:', err);
      return { items: [], totalPages: 0, totalElements: 0, pageNumber: 0, pageSize: size };
    } finally {
      setLoading(false);
    }
  };

  // Get featured tours
  const getFeaturedTours = () => {
    return tours.filter(tour => tour.featured);
  };

  // Get tour by ID
  const getTourById = (id) => {
    return tours.find(tour => tour.id === id);
  };

  return {
    // State
    tours,
    loading,
    error,
    
    // Actions
    fetchTours,
    fetchTourById,
    searchToursServer,
    
    // Selectors
    getToursByCategory,
    searchTours,
    getFeaturedTours,
    getTourById,
    
    // Utilities
    mapTourTypeToCategory
  };
};
