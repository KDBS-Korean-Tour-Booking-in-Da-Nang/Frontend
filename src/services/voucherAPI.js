// Voucher API service
import { checkAndHandleApiError } from '../utils/apiErrorHandler';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

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
 * Create a new voucher
 * @param {Object} voucherData - The voucher data
 * @returns {Promise<Object>} - The created voucher response
 */
export const createVoucher = async (voucherData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/vouchers`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(voucherData),
    });

    if (!response.ok) {
      // Handle 401, 403, 404, 500 with global error handler (auto redirect)
      const wasHandled = await checkAndHandleApiError(response, true);
      if (wasHandled) {
        return; // Đã redirect, không cần xử lý tiếp
      }
      
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * Get all vouchers for a company
 * @param {number} companyId - The company ID
 * @returns {Promise<Array>} - Array of vouchers
 */
export const getVouchersByCompanyId = async (companyId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/vouchers/company/${companyId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      // Handle 401, 403, 404, 500 with global error handler (auto redirect)
      const wasHandled = await checkAndHandleApiError(response, true);
      if (wasHandled) {
        return; // Đã redirect, không cần xử lý tiếp
      }
      
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * Get all vouchers
 * @returns {Promise<Array>} - Array of all vouchers
 */
export const getAllVouchers = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/vouchers`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      // Handle 401, 403, 404, 500 with global error handler (auto redirect)
      const wasHandled = await checkAndHandleApiError(response, true);
      if (wasHandled) {
        return; // Đã redirect, không cần xử lý tiếp
      }
      
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * Get available vouchers for a booking (preview)
 * This endpoint automatically gets companyId from booking and filters usable vouchers
 * @param {number} bookingId - The booking ID
 * @returns {Promise<Array>} - Array of available voucher responses with discount info
 */
export const getAvailableVouchersForBooking = async (bookingId) => {
  const url = `${API_BASE_URL}/api/vouchers/preview-all/${bookingId}`;
  const headers = getAuthHeaders();
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: headers,
    });

    if (!response.ok) {
      let errorData = {};
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        try {
          errorData = await response.json();
        } catch (e) {
          // Ignore parse error
        }
      } else {
        try {
          const text = await response.text();
          errorData = { message: text };
        } catch (e) {
          // Ignore read error
        }
      }
      
      // Handle 401, 403, 404, 500 with global error handler (auto redirect)
      const wasHandled = await checkAndHandleApiError(response, true);
      if (wasHandled) {
        return []; // Đã redirect, trả về mảng rỗng
      }
      
      throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (!Array.isArray(result)) {
      return [];
    }
    
    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * Preview apply voucher to a booking
 * @param {number} bookingId - The booking ID
 * @param {string} voucherCode - Optional voucher code to apply. If not provided, will use voucher from booking
 * @returns {Promise<Object>} - ApplyVoucherResponse with discount info
 */
export const previewApplyVoucher = async (bookingId, voucherCode = null) => {
  // If voucherCode is provided, use query param. Otherwise, just call with bookingId
  const url = voucherCode 
    ? `${API_BASE_URL}/api/vouchers/preview-apply/${bookingId}?voucherCode=${encodeURIComponent(voucherCode)}`
    : `${API_BASE_URL}/api/vouchers/preview-apply/${bookingId}`;
  const headers = getAuthHeaders();
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: headers,
    });

    if (!response.ok) {
      let errorData = {};
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        try {
          errorData = await response.json();
        } catch (e) {
          // Ignore parse error
        }
      } else {
        try {
          const text = await response.text();
          errorData = { message: text };
        } catch (e) {
          // Ignore read error
        }
      }
      
      // Handle 401, 403, 404, 500 with global error handler (auto redirect)
      const wasHandled = await checkAndHandleApiError(response, true);
      if (wasHandled) {
        return null; // Đã redirect
      }
      
      throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * Preview all available vouchers for a tour booking
 * @param {Object} request - AllVoucherRequest with tourId, adultsCount, childrenCount, babiesCount
 * @returns {Promise<Array>} - Array of available voucher responses with discount info
 */
export const previewAllAvailableVouchers = async (request) => {
  const url = `${API_BASE_URL}/api/vouchers/preview-all`;
  const headers = getAuthHeaders();
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        tourId: request.tourId,
        adultsCount: request.adultsCount || 0,
        childrenCount: request.childrenCount || 0,
        babiesCount: request.babiesCount || 0
      }),
    });

    if (!response.ok) {
      let errorData = {};
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        try {
          errorData = await response.json();
        } catch (e) {
          // Ignore parse error
        }
      } else {
        try {
          const text = await response.text();
          errorData = { message: text };
        } catch (e) {
          // Ignore read error
        }
      }
      
      // Handle 401, 403, 404, 500 with global error handler (auto redirect)
      const wasHandled = await checkAndHandleApiError(response, true);
      if (wasHandled) {
        return []; // Đã redirect, trả về mảng rỗng
      }
      
      throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (!Array.isArray(result)) {
      return [];
    }
    
    return result;
  } catch (error) {
    throw error;
  }
};

