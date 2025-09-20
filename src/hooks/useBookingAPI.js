import { useState, useCallback } from 'react';
import { createBooking, getBookingById, getAllBookings } from '../services/bookingAPI';

/**
 * Custom hook for booking API operations
 */
export const useBookingAPI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Create a new booking
   * @param {Object} bookingData - The booking data
   * @returns {Promise<Object>} - The created booking
   */
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

  /**
   * Get booking by ID
   * @param {number} bookingId - The booking ID
   * @returns {Promise<Object>} - The booking data
   */
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

  /**
   * Get all bookings
   * @returns {Promise<Array>} - Array of bookings
   */
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

  /**
   * Clear error state
   */
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
