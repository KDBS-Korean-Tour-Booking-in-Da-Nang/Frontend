import { checkAndHandleApiError } from '../utils/apiErrorHandler';
import { getApiPath } from '../config/api';

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
 * Create a Toss payment order for a booking.
 * @param {{ bookingId: number|string, userEmail: string, voucherCode?: string }} payload
 * @returns {Promise<Object>}
 */
export const createTossBookingPayment = async (payload) => {
  const requestBody = {
    bookingId: Number(payload?.bookingId),
    userEmail: payload?.userEmail?.trim(),
    voucherCode: payload?.voucherCode ? payload.voucherCode.trim() : undefined,
  };

  if (!Number.isFinite(requestBody.bookingId)) {
    throw new Error('Booking ID is required');
  }

  if (!requestBody.userEmail) {
    throw new Error('User email is required');
  }

  try {
    // Use getApiPath for consistent URL handling in dev/prod
    const url = getApiPath('/api/booking/payment');
    const response = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      // Handle 401, 403, 404, 500 with global error handler (auto redirect)
      const wasHandled = await checkAndHandleApiError(response, true);
      if (wasHandled) {
        throw new Error('Session expired. Please login again.');
      }
      
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData?.message) {
          errorMessage = errorData.message;
        }
      } catch (_) {}
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
};

export default {
  createTossBookingPayment,
};

