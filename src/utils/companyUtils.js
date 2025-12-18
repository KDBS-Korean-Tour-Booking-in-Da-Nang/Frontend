import { API_ENDPOINTS, createAuthHeaders } from '../config/api';

// Cache for company names
let companyNameCache = new Map();
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get company name from companyId
 * Fetches all tours and creates a map of companyId -> companyName
 * Uses cache to avoid repeated API calls
 * @param {number} companyId - The company ID
 * @returns {Promise<string>} - Company name or "N/A" if not found
 */
export const getCompanyName = async (companyId) => {
  if (!companyId) return 'N/A';

  // Kiểm tra cache trước
  if (companyNameCache.has(companyId)) {
    return companyNameCache.get(companyId);
  }

  // Kiểm tra xem cache còn hợp lệ không (5 phút)
  const now = Date.now();
  if (cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION && companyNameCache.size > 0) {
    return companyNameCache.get(companyId) || 'N/A';
  }

  try {
    // Fetch tất cả users có role COMPANY để lấy thông tin công ty
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    const usersResponse = await fetch(API_ENDPOINTS.USERS, {
      headers: createAuthHeaders(token)
    });

    if (usersResponse.ok) {
      const users = await usersResponse.json();
      const usersArray = Array.isArray(users) ? users : (users.result || []);
      
      // Lọc users có role COMPANY và tạo map companyId -> companyName
      usersArray.forEach(user => {
        if (user.role === 'COMPANY' || user.role === 'BUSINESS') {
          const userId = user.userId || user.id || user.user_id;
          const username = user.username || user.userName || user.name || `Company #${userId}`;
          if (userId) {
            companyNameCache.set(userId, username);
          }
        }
      });
    }

    // Cập nhật timestamp cache
    cacheTimestamp = now;

    // Trả về tên công ty từ cache
    return companyNameCache.get(companyId) || 'N/A';
  } catch {
    return 'N/A';
  }
};

/**
 * Get multiple company names at once
 * @param {Array<number>} companyIds - Array of company IDs
 * @returns {Promise<Map<number, string>>} - Map of companyId -> companyName
 */
export const getCompanyNames = async (companyIds) => {
  if (!Array.isArray(companyIds) || companyIds.length === 0) {
    return new Map();
  }

  const uniqueIds = [...new Set(companyIds.filter(id => id != null))];
  const result = new Map();

  // Kiểm tra cache trước, chỉ fetch các ID chưa có trong cache
  const missingIds = uniqueIds.filter(id => !companyNameCache.has(id));
  
  if (missingIds.length === 0) {
    // Tất cả ID đã có trong cache, trả về ngay
    uniqueIds.forEach(id => {
      result.set(id, companyNameCache.get(id) || 'N/A');
    });
    return result;
  }

  // Fetch missing company names
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    // Fetch all users with COMPANY role
    const usersResponse = await fetch(API_ENDPOINTS.USERS, {
      headers: createAuthHeaders(token)
    });

    if (usersResponse.ok) {
      const users = await usersResponse.json();
      const usersArray = Array.isArray(users) ? users : (users.result || []);
      
      // Filter users with COMPANY role and create map
      usersArray.forEach(user => {
        if (user.role === 'COMPANY' || user.role === 'BUSINESS') {
          const userId = user.userId || user.id || user.user_id;
          const username = user.username || user.userName || user.name || `Company #${userId}`;
          if (userId) {
            companyNameCache.set(userId, username);
          }
        }
      });
    }

    // Update cache timestamp
    cacheTimestamp = Date.now();

    // Return all company names
    uniqueIds.forEach(id => {
      result.set(id, companyNameCache.get(id) || 'N/A');
    });
  } catch {
    uniqueIds.forEach(id => {
      result.set(id, companyNameCache.get(id) || 'N/A');
    });
  }

  return result;
};

/**
 * Clear the company name cache
 */
export const clearCompanyNameCache = () => {
  companyNameCache.clear();
  cacheTimestamp = null;
};

