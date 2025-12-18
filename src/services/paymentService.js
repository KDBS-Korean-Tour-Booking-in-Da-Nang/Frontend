import { checkAndHandleApiError } from '../utils/apiErrorHandler';
import { getApiPath, BaseURL } from '../config/api';

/**
 * Get authentication headers with Bearer token
 * @returns {Object} - Headers object with Authorization
 */
const getAuthHeaders = () => {
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
// Tạo đơn thanh toán Toss cho booking
// Hỗ trợ thanh toán cọc (deposit) hoặc thanh toán toàn bộ
export const createTossBookingPayment = async (payload) => {
  // Đảm bảo isDeposit là boolean thực sự, không phải truthy/falsy
  const isDepositValue = Boolean(payload?.isDeposit === true);
  
  const requestBody = {
    bookingId: Number(payload?.bookingId),
    userEmail: payload?.userEmail?.trim(),
    voucherCode: payload?.voucherCode ? payload.voucherCode.trim() : undefined,
    deposit: isDepositValue, // Gửi field 'deposit' để map vào backend
  };

  if (!Number.isFinite(requestBody.bookingId)) {
    throw new Error('Booking ID is required');
  }

  if (!requestBody.userEmail) {
    throw new Error('User email is required');
  }

  try {
    // Sử dụng getApiPath để xử lý URL nhất quán trong dev/prod
    let url = getApiPath('/api/booking/payment');
    
    let response = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(requestBody),
    });

    // Fallback: nếu 404 trong dev mode với relative path, thử full URL
    // (để xử lý trường hợp Vite proxy chưa được cấu hình đúng)
    if (!response.ok && response.status === 404 && import.meta.env.DEV && url.startsWith('/')) {
      const fallbackUrl = `${BaseURL}/api/booking/payment`;
      
      try {
        response = await fetch(fallbackUrl, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(requestBody),
        });
        url = fallbackUrl;
      } catch (fallbackError) {
      }
    }

    if (!response.ok) {
      const status = response.status;
      
      if (status === 401) {
        const wasHandled = await checkAndHandleApiError(response, true);
        if (wasHandled) {
          throw new Error('Session expired. Please login again.');
        }
      }
      
      if (status === 404) {
        let errorMessage = `Payment endpoint not found (404). Please ensure the backend server is running and accessible.`;
        
        try {
          const errorData = await response.json();
          if (errorData?.message) {
            errorMessage = errorData.message;
          }
        } catch (_) {
          if (import.meta.env.DEV) {
            errorMessage = `Payment endpoint not found (404). URL: ${url}. Please check:\n1. Backend server is running on port 8080\n2. Vite proxy is configured correctly\n3. Endpoint /api/booking/payment exists in backend`;
          }
        }
        
        throw new Error(errorMessage);
      }
      
      if (status === 403 || status >= 500) {
        let errorMessage = `Lỗi server (${status})`;
        try {
          const errorData = await response.json();
          if (errorData?.message) {
            errorMessage = errorData.message;
          } else if (errorData?.error) {
            errorMessage = errorData.error;
          }
        } catch (_) {
          errorMessage = response.statusText || `Lỗi server (${status})`;
        }
        
        const wasHandled = await checkAndHandleApiError(response, true);
        if (wasHandled) {
          throw new Error(errorMessage);
        }
        
        throw new Error(errorMessage);
      }
      
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData?.message) {
          errorMessage = errorData.message;
        } else if (errorData?.error) {
          errorMessage = errorData.error;
        }
      } catch (_) {
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

