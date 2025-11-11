// Voucher API service
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
    console.log('Creating voucher with data:', voucherData);
    
    const response = await fetch(`${API_BASE_URL}/api/vouchers`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(voucherData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Voucher creation failed:', {
        status: response.status,
        statusText: response.statusText,
        errorData: errorData
      });
      
      // Handle authentication errors
      if (response.status === 401) {
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        throw new Error('Unauthenticated');
      }
      
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Voucher created successfully:', result);
    return result;
  } catch (error) {
    console.error('Error creating voucher:', error);
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
      const errorData = await response.json().catch(() => ({}));
      
      // Handle authentication errors
      if (response.status === 401) {
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        throw new Error('Unauthenticated');
      }
      
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error fetching vouchers:', error);
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
      const errorData = await response.json().catch(() => ({}));
      
      // Handle authentication errors
      if (response.status === 401) {
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        throw new Error('Unauthenticated');
      }
      
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error fetching all vouchers:', error);
    throw error;
  }
};

