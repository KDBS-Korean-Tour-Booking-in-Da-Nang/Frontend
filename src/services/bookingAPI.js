// Booking API service
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const parseErrorMessage = async (response) => {
  try {
    const text = await response.text();
    if (!text) return `HTTP error! status: ${response.status}`;
    try {
      const obj = JSON.parse(text);
      return obj?.message || `HTTP error! status: ${response.status}`;
    } catch {
      return text;
    }
  } catch {
    return `HTTP error! status: ${response.status}`;
  }
};

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
      const message = await parseErrorMessage(response);
      console.error('Booking creation failed:', { status: response.status, message });
      
      // Handle authentication errors
      if (response.status === 401) {
        // Clear invalid token
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        throw new Error('Unauthenticated');
      }
      
      throw new Error(message);
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
      const message = await parseErrorMessage(response);
      
      // Handle authentication errors
      if (response.status === 401) {
        // Do not clear token here to avoid logging user out during background checks
        throw new Error('Unauthenticated');
      }
      
      // 400 often indicates BE mapping error when tour is null; surface friendly text
      if (response.status === 400) {
        throw new Error('Bad Request');
      }
      throw new Error(message);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error fetching booking:', error);
    throw error;
  }
};

/**
* Get all bookings for a company
* @param {number|string} companyId - The company ID
* @returns {Promise<Array>} - Array of bookings
*/
export const getAllBookings = async (companyId) => {
  if (!companyId) {
    console.warn('getAllBookings called without companyId. Returning empty array.');
    return [];
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/booking/company/${companyId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response);
      
      // Handle authentication errors
      if (response.status === 401) {
        // Clear invalid token
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        throw new Error('Unauthenticated');
      }
      
      throw new Error(message);
    }

    const result = await response.json();
    if (Array.isArray(result)) {
      return result;
    }
    if (Array.isArray(result?.bookings)) {
      return result.bookings;
    }
    return [];
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
      const message = await parseErrorMessage(response);
      
      // Handle authentication errors
      if (response.status === 401) {
        // Clear invalid token
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        throw new Error('Unauthenticated');
      }
      
      throw new Error(message);
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
      const message = await parseErrorMessage(response);
      
      // Handle authentication errors
      if (response.status === 401) {
        // Do not clear token here to avoid logging user out during background checks
        throw new Error('Unauthenticated');
      }
      if (response.status === 400) {
        // Allow caller to continue without total
        throw new Error('Bad Request');
      }
      throw new Error(message);
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

/**
 * Get bookings by tour ID
 * @param {number} tourId - The tour ID
 * @returns {Promise<Array>} - Array of bookings
 */
export const getBookingsByTourId = async (tourId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/booking/tour/${tourId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response);
      
      if (response.status === 401) {
        throw new Error('Unauthenticated');
      }
      
      throw new Error(message);
    }

    const result = await response.json();
    if (Array.isArray(result)) {
      return result;
    }
    if (Array.isArray(result?.bookings)) {
      return result.bookings;
    }
    return [];
  } catch (error) {
    console.error('Error fetching bookings by tour ID:', error);
    throw error;
  }
};

/**
 * Get guests by booking ID
 * @param {number} bookingId - The booking ID
 * @returns {Promise<Array>} - Array of booking guests
 */
export const getGuestsByBookingId = async (bookingId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/booking/id/${bookingId}/guests`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response);
      
      if (response.status === 401) {
        throw new Error('Unauthenticated');
      }
      
      throw new Error(message);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error fetching guests by booking ID:', error);
    throw error;
  }
};

/**
 * Change booking status
 * @param {number} bookingId - The booking ID
 * @param {string} status - The new booking status (e.g., 'WAITING_FOR_APPROVED', 'BOOKING_REJECTED', 'WAITING_FOR_UPDATE', 'BOOKING_SUCCESS')
 * @param {string} message - Optional message (for WAITING_FOR_UPDATE status)
 * @returns {Promise<Object>} - The updated booking response
 */
export const changeBookingStatus = async (bookingId, status, message = null) => {
  try {
    const requestBody = { status };
    if (message) {
      requestBody.message = message;
    }
    
    const response = await fetch(`${API_BASE_URL}/api/booking/change-status/${bookingId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response);
      
      if (response.status === 401) {
        throw new Error('Unauthenticated');
      }
      
      throw new Error(message);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error changing booking status:', error);
    throw error;
  }
};

/**
 * Update booking
 * @param {number} bookingId - The booking ID
 * @param {Object} bookingData - The booking data (same structure as createBooking)
 * @returns {Promise<Object>} - The updated booking response
 */
export const updateBooking = async (bookingId, bookingData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/booking/${bookingId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(bookingData),
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response);
      
      if (response.status === 401) {
        throw new Error('Unauthenticated');
      }
      
      throw new Error(message);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error updating booking:', error);
    throw error;
  }
};

/**
 * Change booking guest insurance status
 * @param {number} guestId - The booking guest ID
 * @param {string} status - The new insurance status (e.g., 'Success', 'Failed', 'Pending')
 * @returns {Promise<Object>} - The updated booking guest response
 */
export const changeBookingGuestInsuranceStatus = async (guestId, status) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/booking/booking-guest/insurance/change-status/${guestId}?status=${status}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response);
      
      if (response.status === 401) {
        throw new Error('Unauthenticated');
      }
      
      throw new Error(message);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error changing guest insurance status:', error);
    throw error;
  }
};

/**
 * Company confirm tour completion
 * @param {number} bookingId - The booking ID
 * @returns {Promise<void>}
 */
export const companyConfirmTourCompletion = async (bookingId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/booking/${bookingId}/company-confirm-completion`, {
      method: 'PUT',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response);
      
      if (response.status === 401) {
        throw new Error('Unauthenticated');
      }
      
      throw new Error(message);
    }

    // No content response
    return;
  } catch (error) {
    console.error('Error confirming tour completion:', error);
    throw error;
  }
};

/**
 * User confirm tour completion
 * @param {number} bookingId - The booking ID
 * @returns {Promise<void>}
 */
export const userConfirmTourCompletion = async (bookingId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/booking/${bookingId}/user-confirm-completion`, {
      method: 'PUT',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response);
      
      if (response.status === 401) {
        throw new Error('Unauthenticated');
      }
      
      throw new Error(message);
    }

    // No content response
    return;
  } catch (error) {
    console.error('Error confirming tour completion:', error);
    throw error;
  }
};

/**
 * Get tour completion status
 * @param {number} bookingId - The booking ID
 * @returns {Promise<boolean>} - True if tour is completed, false otherwise
 */
export const getTourCompletionStatus = async (bookingId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/booking/${bookingId}/tour-completion-status`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response);
      
      if (response.status === 401) {
        throw new Error('Unauthenticated');
      }

      if (response.status === 400 || response.status === 404) {
        console.warn('Tour completion status not available yet:', {
          bookingId,
          status: response.status,
          message,
        });
        return false;
      }
      
      throw new Error(message);
    }

    const result = await response.json();
    return result === true || result === 'true';
  } catch (error) {
    console.error('Error fetching tour completion status:', error);
    throw error;
  }
};