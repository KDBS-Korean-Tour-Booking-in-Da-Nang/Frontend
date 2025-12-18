import { useState, useCallback } from 'react';
import { createBooking, getBookingById, getAllBookings } from '../services/bookingAPI';

// Custom hook cho booking API operations: quản lý loading và error state, cung cấp createBookingAPI, fetchBookingById, fetchAllBookings, clearError
export const useBookingAPI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Tạo booking mới: set loading và clear error, gọi createBooking API, trả về created booking hoặc throw error
  const createBookingAPI = useCallback(async (bookingData) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await createBooking(bookingData);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Lấy booking theo ID: set loading và clear error, gọi getBookingById API, trả về booking data hoặc throw error
  const fetchBookingById = useCallback(async (bookingId) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await getBookingById(bookingId);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Lấy tất cả bookings: set loading và clear error, gọi getAllBookings API, trả về array of bookings hoặc throw error
  const fetchAllBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await getAllBookings();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Clear error state: set error về null
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    error,
    createBookingAPI,
    fetchBookingById,
    fetchAllBookings,
    clearError
  };
};
