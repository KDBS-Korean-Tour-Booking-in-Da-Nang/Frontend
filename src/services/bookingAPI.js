// Booking API service
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

/**
 * Get authentication headers with Bearer token
 * @returns {Object} - Headers object with Authorization
 */
const getAuthHeaders = () => {
  // Try multiple common token keys
  const token =
    localStorage.getItem('token') ||
    sessionStorage.getItem('token') ||
    localStorage.getItem('accessToken') ||
    sessionStorage.getItem('accessToken');
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
    console.log('Creating booking with data:', bookingData);
    
    const response = await fetch(`${API_BASE_URL}/api/booking`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(bookingData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Booking creation failed:', {
        status: response.status,
        statusText: response.statusText,
        errorData: errorData
      });
      
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
    console.log('Booking created successfully:', result);
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
    // Correct endpoint per backend controller: /api/booking/id/{bookingId}
    const response = await fetch(`${API_BASE_URL}/api/booking/id/${bookingId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Handle authentication errors
      if (response.status === 401) {
        // Do not clear token here to avoid logging user out during background checks
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
    // Always use authentication headers for booking total
    const response = await fetch(`${API_BASE_URL}/api/booking/id/${bookingId}/total`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Handle authentication errors
      if (response.status === 401) {
        // Do not clear token here to avoid logging user out during background checks
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

/**
 * Get booking details by ID (for resume payment)
 * @param {number} bookingId - The booking ID
 * @returns {Promise<Object>} - The booking details
 */
export const getBookingDetails = async (bookingId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/booking/id/${bookingId}`, {
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
    console.error('Error fetching booking details:', error);
    throw error;
  }
};

/**
 * Cancel a booking by ID
 * @param {number} bookingId - The booking ID
 * @returns {Promise<Object>} - The updated booking response
 */
export const cancelBooking = async (bookingId) => {
  try {
    // Try common RESTful cancel endpoint patterns
    const endpoints = [
      `${API_BASE_URL}/api/booking/${bookingId}/cancel`,
      `${API_BASE_URL}/api/booking/cancel/${bookingId}`
    ];
    let lastError;
    for (const url of endpoints) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: getAuthHeaders(),
        });
        if (response.ok) {
          const result = await response.json().catch(() => ({}));
          return result;
        }
        const errorData = await response.json().catch(() => ({}));
        // --- PATCH: suppress console noise ---
        // lastError = new Error(errorData.message || `HTTP error! status: ${response.status}`); // OLD
        lastError = new Error(errorData.message || `HTTP error! status: ${response.status}`);
        // Don't show any error in console here
      } catch (err) {
        // OLD: console.error('Error cancelling booking:', err);
        lastError = err;
        // No console log
      }
    }
    throw lastError || new Error('Failed to cancel booking');
  } catch (error) {
    // PATCH: Don't log error
    // OLD: console.error('Error cancelling booking:', error);
    throw error;
  }
};