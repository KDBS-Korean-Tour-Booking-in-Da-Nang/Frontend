// Booking API service
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

/**
 * Get authentication headers with Bearer token
 * @returns {Object} - Headers object with Authorization
 */
const getAuthHeaders = () => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

/**
 * Create a new booking
 * @param {Object} bookingData - The booking data
 * @returns {Promise<Object>} - The created booking response
 */
export const createBooking = async (bookingData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/booking`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(bookingData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Handle authentication errors
      if (response.status === 401) {
        // Clear invalid token
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        throw new Error('Unauthenticated');
      }
      
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error creating booking:', error);
    throw error;
  }
};

/**
 * Get booking by ID
 * @param {number} bookingId - The booking ID
 * @returns {Promise<Object>} - The booking data
 */
export const getBookingById = async (bookingId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/booking/${bookingId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Handle authentication errors
      if (response.status === 401) {
        // Clear invalid token
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        throw new Error('Unauthenticated');
      }
      
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error fetching booking:', error);
    throw error;
  }
};

/**
 * Get all bookings
 * @returns {Promise<Array>} - Array of bookings
 */
export const getAllBookings = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/booking`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Handle authentication errors
      if (response.status === 401) {
        // Clear invalid token
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        throw new Error('Unauthenticated');
      }
      
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error fetching bookings:', error);
    throw error;
  }
};

/**
 * Create VNPay payment for booking
 * @param {Object} paymentData - The payment data { bookingId, userEmail }
 * @returns {Promise<Object>} - The VNPay payment response
 */
export const createVNPayPayment = async (paymentData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/booking/payment`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(paymentData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Handle authentication errors
      if (response.status === 401) {
        // Clear invalid token
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        throw new Error('Unauthenticated');
      }
      
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error creating VNPay payment:', error);
    throw error;
  }
};

/**
 * Get booking total amount
 * @param {number} bookingId - The booking ID
 * @returns {Promise<Object>} - The total amount response
 */
export const getBookingTotal = async (bookingId) => {
  try {
    // First try without authentication (as per requirements)
    let response = await fetch(`${API_BASE_URL}/api/booking/id/${bookingId}/total`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // If 401, try with authentication headers
    if (response.status === 401) {
      console.log('GET endpoint requires auth, retrying with authentication...');
      response = await fetch(`${API_BASE_URL}/api/booking/id/${bookingId}/total`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Handle authentication errors
      if (response.status === 401) {
        // Clear invalid token
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        throw new Error('Unauthenticated');
      }
      
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error fetching booking total:', error);
    throw error;
  }
};
