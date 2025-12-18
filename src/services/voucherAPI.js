import { checkAndHandleApiError } from '../utils/apiErrorHandler';
import { BaseURL } from '../config/api';

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
    const response = await fetch(`${BaseURL}/api/vouchers`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(voucherData),
    });

    if (!response.ok) {
      const wasHandled = await checkAndHandleApiError(response, true);
      if (wasHandled) {
        return;
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
    const response = await fetch(`${BaseURL}/api/vouchers/company/${companyId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const wasHandled = await checkAndHandleApiError(response, true);
      if (wasHandled) {
        return;
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
    const response = await fetch(`${BaseURL}/api/vouchers`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const wasHandled = await checkAndHandleApiError(response, true);
      if (wasHandled) {
        return;
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
// Lấy danh sách voucher khả dụng cho một booking (preview)
// Endpoint này tự động lấy companyId từ booking và lọc các voucher có thể sử dụng
export const getAvailableVouchersForBooking = async (bookingId) => {
  const url = `${BaseURL}/api/vouchers/preview-all/${bookingId}`;
  const headers = getAuthHeaders();
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: headers,
    });

    if (!response.ok) {
      let errorData = {};
      const contentType = response.headers.get('content-type');
      
      // Xử lý lỗi: thử parse JSON trước, nếu không được thì lấy text
      if (contentType && contentType.includes('application/json')) {
        try {
          errorData = await response.json();
        } catch (e) {
        }
      } else {
        try {
          const text = await response.text();
          errorData = { message: text };
        } catch (e) {
        }
      }
      
      const wasHandled = await checkAndHandleApiError(response, true);
      if (wasHandled) {
        return [];
      }
      
      throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    // Đảm bảo trả về là mảng, nếu không thì trả về mảng rỗng
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
// Xem trước kết quả áp dụng voucher cho booking
// Nếu có voucherCode thì dùng query param, nếu không thì dùng voucher từ booking
export const previewApplyVoucher = async (bookingId, voucherCode = null) => {
  // Xây dựng URL: nếu có voucherCode thì thêm vào query param
  const url = voucherCode 
    ? `${BaseURL}/api/vouchers/preview-apply/${bookingId}?voucherCode=${encodeURIComponent(voucherCode)}`
    : `${BaseURL}/api/vouchers/preview-apply/${bookingId}`;
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
        }
      } else {
        try {
          const text = await response.text();
          errorData = { message: text };
        } catch (e) {
        }
      }
      
      const wasHandled = await checkAndHandleApiError(response, true);
      if (wasHandled) {
        return null;
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
// Xem trước tất cả voucher khả dụng cho một tour booking
// Nhận thông tin tourId và số lượng người (người lớn, trẻ em, trẻ sơ sinh)
export const previewAllAvailableVouchers = async (request) => {
  const url = `${BaseURL}/api/vouchers/preview-all`;
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
        }
      } else {
        try {
          const text = await response.text();
          errorData = { message: text };
        } catch (e) {
        }
      }
      
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

