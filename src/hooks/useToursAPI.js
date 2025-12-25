import { useState, useEffect } from 'react';
import { API_ENDPOINTS, getImageUrl, getTourImageUrl } from '../config/api';
import { checkAndHandle401 } from '../utils/apiErrorHandler';

// Strip HTML tags từ text: remove HTML tags, decode HTML entities (&nbsp;, &amp;, &lt;, &gt;, &quot;, &#39;), trim whitespace
const stripHtmlTags = (html) => {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
};

// Hook để fetch tour data từ backend API: quản lý tours state, loading, error, cung cấp fetchTours, fetchTourById, searchToursServer, transformTour để map backend data sang frontend format
export const useToursAPI = () => {
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const transformTour = (tour) => ({
    id: tour.id,
    title: stripHtmlTags(tour.tourName),
    tourName: tour.tourName,
    duration: tour.tourDuration,
    price: tour.adultPrice ? Number(tour.adultPrice) : 0,
    image: getTourImageUrl(tour.tourImgPath || tour.thumbnailUrl),
    description: stripHtmlTags(tour.tourDescription),
    descriptionHtml: tour.tourDescription || '',
    category: mapTourTypeToCategory(tour.tourType),
    featured: tour.tourStatus === 'APPROVED',
    tourDeparturePoint: stripHtmlTags(tour.tourDeparturePoint),
    tourVehicle: stripHtmlTags(tour.tourVehicle),
    tourSchedule: stripHtmlTags(tour.tourSchedule),
    childrenPrice: tour.childrenPrice ? Number(tour.childrenPrice) : 0,
    babyPrice: tour.babyPrice ? Number(tour.babyPrice) : 0,
    amount: tour.amount,
    minGuests: tour.minGuests != null ? Number(tour.minGuests) : null,
    maxGuests: tour.maxGuests != null ? Number(tour.maxGuests) : null,
    tourStatus: tour.tourStatus,
    createdAt: tour.createdAt,
    contents: tour.contents || [],
    depositPercentage: tour.depositPercentage != null ? Number(tour.depositPercentage) : null,
    minAdvanceDays: tour.minAdvanceDays,
    cancelDay: tour.cancelDay,
    balancePaymentDays: tour.balancePaymentDays,
    refundFloor: tour.refundFloor,
    availableDates: tour.availableDates || [],
    gallery: Array.isArray(tour.gallery) ? tour.gallery.map(getImageUrl) : [],
    attachments: tour.attachments || []
  });

  // Fetch tất cả tours từ API: lấy token từ localStorage, gọi TOURS_PUBLIC endpoint (chỉ trả về PUBLIC tours), transform backend data sang frontend format, handle 401 với global error handler
  const fetchTours = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');

      const response = await fetch(API_ENDPOINTS.TOURS_PUBLIC, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });

      if (!response.ok) {
        if (await checkAndHandle401(response)) {
          throw new Error('Session expired. Please login again.');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      const transformedTours = data.map(transformTour).filter(tour => 
        tour.tourStatus === 'PUBLIC' && 
        tour.amount !== null && 
        tour.amount !== undefined && 
        tour.amount > 0
      );

      setTours(transformedTours);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch single tour theo ID: lấy token, gọi TOUR_BY_ID endpoint, transform và trả về tour, handle 401
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
        if (await checkAndHandle401(response)) {
          throw new Error('Session expired. Please login again.');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const tour = await response.json();

      return transformTour(tour);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Map backend tour type sang frontend category: international (nếu có 'international'/'nước ngoài'/'quốc tế'), day-tour (nếu có 'day'/'ngày'/'1 ngày'), default là domestic
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

  // Filter tours theo category: nếu 'all' trả về tất cả, ngược lại filter theo category
  const getToursByCategory = (category) => {
    if (category === 'all') return tours;
    return tours.filter(tour => tour.category === category);
  };

  // Search tours client-side: search trong title, description, tourDeparturePoint (case-insensitive)
  const searchTours = (query) => {
    if (!query || query.trim() === '') return tours;

    const searchTerm = query.toLowerCase();
    return tours.filter(tour =>
      tour.title.toLowerCase().includes(searchTerm) ||
      tour.description.toLowerCase().includes(searchTerm) ||
      (tour.tourDeparturePoint && tour.tourDeparturePoint.toLowerCase().includes(searchTerm))
    );
  };

  // Server-side search tours qua backend pagination API: gửi keyword, page, size, transform results, filter chỉ PUBLIC tours, ignore abort errors, handle 401
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
        if (await checkAndHandle401(response)) {
          throw new Error('Session expired. Please login again.');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const pageData = await response.json();
      const items = Array.isArray(pageData.content) ? pageData.content.map(transformTour) : [];

      const publicItems = items.filter(tour => 
        tour.tourStatus === 'PUBLIC' && 
        tour.amount !== null && 
        tour.amount !== undefined && 
        tour.amount > 0
      );

      return {
        items: publicItems,
        totalPages: pageData.totalPages ?? 0,
        totalElements: publicItems.length,
        pageNumber: pageData.number ?? page,
        pageSize: pageData.size ?? size
      };
    } catch (err) {
      if (err && (err.name === 'AbortError' || err.code === 20)) {
        return { items: [], totalPages: 0, totalElements: 0, pageNumber: 0, pageSize: size };
      }
      setError(err.message);
      return { items: [], totalPages: 0, totalElements: 0, pageNumber: 0, pageSize: size };
    } finally {
      setLoading(false);
    }
  };

  // Lấy featured tours: filter tours có featured = true
  const getFeaturedTours = () => {
    return tours.filter(tour => tour.featured);
  };

  // Lấy tour theo ID: tìm tour trong tours array
  const getTourById = (id) => {
    return tours.find(tour => tour.id === id);
  };

  return {
    tours,
    loading,
    error,
    fetchTours,
    fetchTourById,
    searchToursServer,
    getToursByCategory,
    searchTours,
    getFeaturedTours,
    getTourById,
    mapTourTypeToCategory
  };
};
