import { checkAndHandleApiError } from '../utils/apiErrorHandler';
import { getApiPath, BaseURL } from '../config/api';

// Parse thông báo lỗi từ response
// Thử parse JSON trước, nếu không được thì trả về text thuần
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
// Lấy headers xác thực với Bearer token
// Ưu tiên token theo role (ADMIN, STAFF), sau đó token chung
// Kiểm tra sessionStorage trước (tab hiện tại), sau đó localStorage (tab khác / session đã lưu)
// Cuối cùng là accessToken dùng chung cho tất cả roles
const getAuthHeaders = () => {
  const token =
    sessionStorage.getItem('token_ADMIN') ||
    sessionStorage.getItem('token_STAFF') ||
    sessionStorage.getItem('token') ||
    localStorage.getItem('token_ADMIN') ||
    localStorage.getItem('token_STAFF') ||
    localStorage.getItem('token') ||
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
    const response = await fetch(`${BaseURL}/api/booking`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(bookingData),
    });

    if (!response.ok) {
      // Clone response để có thể đọc body nhiều lần nếu cần
      const responseClone = response.clone();
      
      let errorText = '';
      try {
        errorText = await responseClone.text();
      } catch (e) {
        errorText = '';
      }

      // Xử lý riêng lỗi 500 - hiển thị thông báo lỗi hữu ích
      if (response.status === 500) {
        let errorMessage = 'Lỗi máy chủ. Vui lòng thử lại sau.';
        try {
          if (errorText) {
            const errorObj = JSON.parse(errorText);
            errorMessage = errorObj?.message || errorMessage;
            // Nếu là runtime exception, cung cấp thông báo hữu ích hơn
            if (errorMessage.includes('Runtime exception') || errorMessage.includes('Runtime exception occurred')) {
              errorMessage = 'Lỗi xử lý dữ liệu. Vui lòng kiểm tra lại thông tin tour (giá tour có thể chưa được thiết lập) hoặc liên hệ hỗ trợ.';
            }
            // Kiểm tra lỗi NullPointerException
            if (errorMessage.includes('NullPointerException') || errorMessage.includes('null')) {
              errorMessage = 'Lỗi xử lý dữ liệu. Vui lòng kiểm tra lại thông tin tour (giá tour có thể chưa được thiết lập) hoặc liên hệ hỗ trợ.';
            }
            // Kiểm tra lỗi liên quan đến voucher
            if (errorMessage.includes('VOUCHER') || errorMessage.includes('voucher')) {
              errorMessage = 'Lỗi khi áp dụng voucher. Vui lòng kiểm tra lại mã voucher hoặc thử lại sau.';
            }
          }
        } catch (e) {
        }
        throw new Error(errorMessage);
      }

      const wasHandled = await checkAndHandleApiError(response, true);
      if (wasHandled) {
        return;
      }
      
      const message = await parseErrorMessage(response);
      throw new Error(message);
    }

    const result = await response.json();
    return result;
  } catch (error) {
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
    const response = await fetch(`${BaseURL}/api/booking/id/${bookingId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const wasHandled = await checkAndHandleApiError(response, true);
      if (wasHandled) {
        return;
      }
      
      const message = await parseErrorMessage(response);
      
      if (response.status === 400) {
        throw new Error('Bad Request');
      }
      throw new Error(message);
    }

    const result = await response.json();
    return result;
  } catch (error) {
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
    return [];
  }

  try {
    const response = await fetch(`${BaseURL}/api/booking/company/${companyId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const wasHandled = await checkAndHandleApiError(response, true);
      if (wasHandled) {
        return;
      }
      
      const message = await parseErrorMessage(response);
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
    const response = await fetch(`${BaseURL}/api/booking/payment`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(paymentData),
    });

    if (!response.ok) {
      const wasHandled = await checkAndHandleApiError(response, true);
      if (wasHandled) {
        return;
      }
      
      const message = await parseErrorMessage(response);
      throw new Error(message);
    }

    const result = await response.json();
    return result;
  } catch (error) {
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
    const response = await fetch(`${BaseURL}/api/booking/id/${bookingId}/total`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const wasHandled = await checkAndHandleApiError(response, true);
      if (wasHandled) {
        return;
      }
      
      const message = await parseErrorMessage(response);
      if (response.status === 400) {
        throw new Error('Bad Request');
      }
      throw new Error(message);
    }

    const result = await response.json();
    return result;
  } catch (error) {
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
    const response = await fetch(`${BaseURL}/api/booking/id/${bookingId}`, {
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
 * Create a complaint for a booking
 * @param {number} bookingId - The booking ID
 * @param {string} message - Complaint message from user
 * @returns {Promise<void>}
 */
export const createBookingComplaint = async (bookingId, message) => {
  try {
    const response = await fetch(`${BaseURL}/api/booking/${bookingId}/complaint`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      const errorMessage = await parseErrorMessage(response);

      const wasHandled = await checkAndHandleApiError(response, true);
      if (wasHandled) {
        return;
      }

      throw new Error(errorMessage);
    }

    return;
  } catch (error) {
    throw error;
  }
};

/**
 * Get all complaints for a booking (admin/staff view)
 * @param {number} bookingId - The booking ID
 * @returns {Promise<Array>} - Array of complaints
 */
export const getComplaintsByBookingId = async (bookingId) => {
  if (!bookingId) return [];
  try {
    const response = await fetch(`${BaseURL}/api/booking/id/${bookingId}/complaints`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response);

      const wasHandled = await checkAndHandleApiError(response, true);
      if (wasHandled) {
        return [];
      }

      throw new Error(message);
    }

    const result = await response.json();
    return Array.isArray(result) ? result : [];
  } catch (error) {
    throw error;
  }
};

/**
 * Resolve a booking complaint (admin/staff)
 * @param {number} complaintId - The complaint ID
 * @param {'NO_FAULT'|'COMPANY_FAULT'|'USER_FAULT'} resolutionType
 * @param {string} note - Optional resolution note
 * @returns {Promise<void>}
 */
export const resolveBookingComplaint = async (complaintId, resolutionType, note = '') => {
  if (!complaintId || !resolutionType) {
    throw new Error('Missing complaintId or resolutionType');
  }
  try {
    const body = {
      resolutionType,
      note: note || null,
    };

    const response = await fetch(`${BaseURL}/api/booking/complaint/${complaintId}/resolve`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response);

      const wasHandled = await checkAndHandleApiError(response, true);
      if (wasHandled) {
        return;
      }

      throw new Error(message);
    }

    return;
  } catch (error) {
    throw error;
  }
};

/**
 * Preview cancel booking - get refund information before canceling
 * @param {number} bookingId - The booking ID
 * @returns {Promise<Object>} - The booking response with refund info
 */
export const previewCancelBooking = async (bookingId) => {
  try {
    const response = await fetch(`${BaseURL}/api/booking/cancel/preview/${bookingId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response);
      
      const wasHandled = await checkAndHandleApiError(response, true);
      if (wasHandled) {
        return;
      }
      
      throw new Error(message);
    }

    const result = await response.json();
    return result;
  } catch (error) {
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
    const response = await fetch(`${BaseURL}/api/booking/cancel/${bookingId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response);
      
      const wasHandled = await checkAndHandleApiError(response, true);
      if (wasHandled) {
        return;
      }
      
      throw new Error(message);
    }

    const result = await response.json();
    return result;
  } catch (error) {
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
    const response = await fetch(`${BaseURL}/api/booking/tour/${tourId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response);
      
      const wasHandled = await checkAndHandleApiError(response, true);
      if (wasHandled) {
        return;
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
    const response = await fetch(`${BaseURL}/api/booking/id/${bookingId}/guests`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response);
      
      const wasHandled = await checkAndHandleApiError(response, true);
      if (wasHandled) {
        return;
      }
      
      throw new Error(message);
    }

    const result = await response.json();
    return result;
  } catch (error) {
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
    
    const url = getApiPath(`/api/booking/change-status/${bookingId}`);
    
    let response = await fetch(url, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(requestBody),
    });

    if (!response.ok && response.status === 404 && import.meta.env.DEV && url.startsWith('/')) {
      const fallbackUrl = `${BaseURL}/api/booking/change-status/${bookingId}`;
      
      try {
        response = await fetch(fallbackUrl, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(requestBody),
        });
      } catch (fallbackError) {
      }
    }

    if (!response.ok) {
      const errorMessage = await parseErrorMessage(response);
      
      if (response.status === 401) {
        const wasHandled = await checkAndHandleApiError(response, true);
        if (wasHandled) {
          throw new Error('Session expired. Please login again.');
        }
      }
      
      if (response.status === 500) {
        throw new Error(errorMessage || 'Server error occurred. Please try again later.');
      }
      
      if (response.status === 403 || response.status === 404) {
        const wasHandled = await checkAndHandleApiError(response, true);
        if (wasHandled) {
          throw new Error(errorMessage || `HTTP error! status: ${response.status}`);
        }
      }
      
      throw new Error(errorMessage || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
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
    const response = await fetch(`${BaseURL}/api/booking/${bookingId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(bookingData),
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response);
      
      const wasHandled = await checkAndHandleApiError(response, true);
      if (wasHandled) {
        return;
      }
      
      throw new Error(message);
    }

    const result = await response.json();
    return result;
  } catch (error) {
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
    const response = await fetch(`${BaseURL}/api/booking/booking-guest/insurance/change-status/${guestId}?status=${status}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response);
      
      const wasHandled = await checkAndHandleApiError(response, true);
      if (wasHandled) {
        return;
      }
      
      throw new Error(message);
    }

    const result = await response.json();
    return result;
  } catch (error) {
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
    const response = await fetch(`${BaseURL}/api/booking/${bookingId}/company-confirm-completion`, {
      method: 'PUT',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response);
      
      const wasHandled = await checkAndHandleApiError(response, true);
      if (wasHandled) {
        return;
      }
      
      throw new Error(message);
    }

    return;
  } catch (error) {
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
    const response = await fetch(`${BaseURL}/api/booking/${bookingId}/user-confirm-completion`, {
      method: 'PUT',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response);
      
      const wasHandled = await checkAndHandleApiError(response, true);
      if (wasHandled) {
        return;
      }
      
      throw new Error(message);
    }

    return;
  } catch (error) {
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
    const response = await fetch(`${BaseURL}/api/booking/${bookingId}/tour-completion-status`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const wasHandled = await checkAndHandleApiError(response, true);
      if (wasHandled) {
        return false;
      }

      const message = await parseErrorMessage(response);

      if (response.status === 400) {
        return false;
      }
      
      throw new Error(message);
    }

    const result = await response.json();
    return result === true || result === 'true';
  } catch (error) {
    throw error;
  }
};

/**
 * Get all complaints (admin/staff view)
 * @returns {Promise<Array>} - Array of all complaints
 */
export const getAllComplaints = async (autoRedirect = false) => {
  try {
    const response = await fetch(`${BaseURL}/api/booking/complaints/all`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response);

      const wasHandled = await checkAndHandleApiError(response, autoRedirect);
      if (wasHandled) {
        return [];
      }

      throw new Error(message);
    }

    const result = await response.json();
    return Array.isArray(result) ? result : [];
  } catch (error) {
    throw error;
  }
};

/**
 * Get complaint by complaint ID (admin/staff view)
 * @param {number} complaintId - The complaint ID
 * @returns {Promise<Object>} - The complaint data
 */
export const getComplaintById = async (complaintId) => {
  if (!complaintId) {
    throw new Error('Complaint ID is required');
  }
  try {
    const response = await fetch(`${BaseURL}/api/booking/id/${complaintId}/complaints`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response);

      const wasHandled = await checkAndHandleApiError(response, true);
      if (wasHandled) {
        return null;
      }

      throw new Error(message);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    throw error;
  }
};