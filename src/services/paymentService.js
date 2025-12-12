import { checkAndHandleApiError } from '../utils/apiErrorHandler';
import { getApiPath, BaseURL } from '../config/api';

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
  // Đảm bảo isDeposit là boolean, không phải truthy/falsy
  const isDepositValue = Boolean(payload?.isDeposit === true);
  
  const requestBody = {
    bookingId: Number(payload?.bookingId),
    userEmail: payload?.userEmail?.trim(),
    voucherCode: payload?.voucherCode ? payload.voucherCode.trim() : undefined,
    deposit: isDepositValue,  // Gửi 'deposit' để map vào field 'deposit' trong backend
  };

  if (!Number.isFinite(requestBody.bookingId)) {
    throw new Error('Booking ID is required');
  }

  if (!requestBody.userEmail) {
    throw new Error('User email is required');
  }

  try {
    // Use getApiPath for consistent URL handling in dev/prod
    let url = getApiPath('/api/booking/payment');
    
    let response = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(requestBody),
    });

    // Fallback: If 404 in dev mode with relative path, try full URL
    if (!response.ok && response.status === 404 && import.meta.env.DEV && url.startsWith('/')) {
      const fallbackUrl = `${BaseURL}/api/booking/payment`;
      
      try {
        response = await fetch(fallbackUrl, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(requestBody),
        });
        url = fallbackUrl; // Update url for error messages
      } catch (fallbackError) {
        // Continue with original response for error handling
      }
    }

    if (!response.ok) {
      const status = response.status;
      
      // Handle 401 - session expired
      if (status === 401) {
        const wasHandled = await checkAndHandleApiError(response, true);
        if (wasHandled) {
          throw new Error('Session expired. Please login again.');
        }
      }
      
      // Handle 404 - endpoint not found (don't treat as session expired)
      if (status === 404) {
        let errorMessage = `Payment endpoint not found (404). Please ensure the backend server is running and accessible.`;
        
        // Try to get more details
        try {
          const errorData = await response.json();
          if (errorData?.message) {
            errorMessage = errorData.message;
          }
        } catch (_) {
          // If response is not JSON, provide context about the URL
          if (import.meta.env.DEV) {
            errorMessage = `Payment endpoint not found (404). URL: ${url}. Please check:\n1. Backend server is running on port 8080\n2. Vite proxy is configured correctly\n3. Endpoint /api/booking/payment exists in backend`;
          }
        }
        
        throw new Error(errorMessage);
      }
      
      // Handle other errors (403, 500, etc.) with global error handler
      if (status === 403 || status >= 500) {
        // Try to get error message from response first
        let errorMessage = `Lỗi server (${status})`;
        try {
          const errorData = await response.json();
          if (errorData?.message) {
            errorMessage = errorData.message;
          } else if (errorData?.error) {
            errorMessage = errorData.error;
          }
        } catch (_) {
          // If response is not JSON, use status text
          errorMessage = response.statusText || `Lỗi server (${status})`;
        }
        
        const wasHandled = await checkAndHandleApiError(response, true);
        if (wasHandled) {
          // Error handler already redirected, throw error with message
          throw new Error(errorMessage);
        }
        
        // If not handled by global handler, throw with parsed message
        throw new Error(errorMessage);
      }
      
      // For other status codes, try to parse error message
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData?.message) {
          errorMessage = errorData.message;
        } else if (errorData?.error) {
          errorMessage = errorData.error;
        }
      } catch (_) {
        // If response is not JSON, use status text
        errorMessage = response.statusText || `HTTP error! status: ${response.status}`;
      }
      
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

