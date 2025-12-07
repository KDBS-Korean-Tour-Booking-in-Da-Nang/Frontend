// API Configuration
// Normalize base URLs - remove trailing slashes to avoid double slashes
const rawBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
export const BaseURL = rawBase.replace(/\/+$/, ''); // Remove trailing slash(es)

// Frontend URL for link detection - align with vite.config.js port (3000)
const rawFrontendUrl = import.meta.env.VITE_FRONTEND_URL || 'http://localhost:3000';
export const FrontendURL = rawFrontendUrl.replace(/\/+$/, ''); // Remove trailing slash(es)

// Helper function to safely join URLs (base + path)
// Prevents double slashes and handles edge cases
const joinUrl = (base, path) => {
  const normalizedBase = base.replace(/\/+$/, ''); // Remove trailing slashes from base
  const normalizedPath = path.startsWith('/') ? path : `/${path}`; // Ensure path starts with /
  return `${normalizedBase}${normalizedPath}`;
};

// API endpoints
export const API_ENDPOINTS = {
  // Posts
  POSTS: `${BaseURL}/api/posts`,
  POST_BY_ID: (id) => `${BaseURL}/api/posts/${id}`,
  POST_SEARCH: `${BaseURL}/api/posts/search`,
  MY_POSTS: `${BaseURL}/api/posts/my-posts`,
  
  // Comments
  COMMENTS: `${BaseURL}/api/comments`,
  COMMENTS_BY_POST: (postId) => `${BaseURL}/api/comments/post/${postId}`,
  COMMENT_REPLIES: (commentId) => `${BaseURL}/api/comments/${commentId}/replies`,
  
  // Article Comments
  ARTICLE_COMMENTS: `${BaseURL}/api/article-comments`,
  ARTICLE_COMMENTS_BY_ARTICLE: (articleId) => `${BaseURL}/api/article-comments/article/${articleId}`,
  ARTICLE_COMMENT_BY_ID: (commentId) => `${BaseURL}/api/article-comments/${commentId}`,
  
  // Reactions
  REACTIONS_ADD: `${BaseURL}/api/reactions/add`,
  REACTIONS_DELETE: `${BaseURL}/api/reactions/delete`,
  REACTIONS_POST_USER: (postId, userEmail) => `${BaseURL}/api/reactions/post/${postId}/user/${encodeURIComponent(userEmail)}`,
  REACTIONS_POST_COUNT: (postId) => `${BaseURL}/api/reactions/post/${postId}/count`,
  REACTIONS_POST_SUMMARY: (postId, userEmail) => `${BaseURL}/api/reactions/post/${postId}/summary${userEmail ? `?userEmail=${encodeURIComponent(userEmail)}` : ''}`,
  REACTIONS_COMMENT_SUMMARY: (commentId, userEmail) => `${BaseURL}/api/reactions/comment/${commentId}/summary${userEmail ? `?userEmail=${encodeURIComponent(userEmail)}` : ''}`,
  
  // Saved Posts
  SAVED_POSTS: `${BaseURL}/api/saved-posts`,
  SAVED_POSTS_SAVE: `${BaseURL}/api/saved-posts/save`,
  SAVED_POSTS_UNSAVE: (postId) => `${BaseURL}/api/saved-posts/unsave/${postId}`,
  SAVED_POSTS_CHECK: (postId) => `${BaseURL}/api/saved-posts/check/${postId}`,
  SAVED_POSTS_COUNT: (postId) => `${BaseURL}/api/saved-posts/count/${postId}`,
  SAVED_POSTS_MY_SAVED: `${BaseURL}/api/saved-posts/my-saved`,
  
  // Reports
  REPORTS: `${BaseURL}/api/reports`,
  REPORTS_CREATE: `${BaseURL}/api/reports/create`,
  REPORTS_CHECK: `${BaseURL}/api/reports/check`,
  REPORTS_GET_BY_ID: (reportId) => `${BaseURL}/api/reports/${reportId}`,
  REPORTS_ADMIN_ALL: `${BaseURL}/api/reports/admin/all`,
  REPORTS_ADMIN_STATS: `${BaseURL}/api/reports/admin/stats`,
  REPORTS_UPDATE_STATUS: (reportId) => `${BaseURL}/api/reports/${reportId}/status`,
  
  // Hashtags
  HASHTAGS: `${BaseURL}/api/hashtags`,
  HASHTAGS_POPULAR: `${BaseURL}/api/hashtags/popular`,
  HASHTAGS_SEARCH: `${BaseURL}/api/hashtags/search`,
  
  // Users
  USERS: `${BaseURL}/api/users`,
  UPDATE_USER: `${BaseURL}/api/users/update`,
  GET_USER: (email) => `${BaseURL}/api/users/${encodeURIComponent(email)}`,
  CHANGE_PASSWORD: `${BaseURL}/api/auth/change-password`,
  
  // Tours
  TOURS: `${BaseURL}/api/tour`,
  TOURS_PUBLIC: `${BaseURL}/api/tour/public`,
  TOURS_BY_COMPANY_ID: (companyId) => `${BaseURL}/api/tour/company/${companyId}`,
  TOUR_BY_ID: (id) => `${BaseURL}/api/tour/${id}`,
  TOUR_DELETE_BY_ID: (id, userEmail) => `${BaseURL}/api/tour/${id}?userEmail=${encodeURIComponent(userEmail)}`,
  TOURS_SEARCH: `${BaseURL}/api/tour/search`,
  TOUR_PREVIEW_BY_ID: (id) => `${BaseURL}/api/tour/preview/${id}`,
  
  // Booking
  BOOKING_BY_EMAIL: (email) => `${BaseURL}/api/booking/email/${encodeURIComponent(email)}`,
  BOOKING_SUMMARY_BY_EMAIL: (email) => `${BaseURL}/api/booking/summary/email/${encodeURIComponent(email)}`,
  BOOKING_BY_ID: (id) => `${BaseURL}/api/booking/id/${id}`,
  BOOKING_BY_TOUR_ID: (tourId) => `${BaseURL}/api/booking/tour/${tourId}`,
  BOOKING_GUESTS_BY_BOOKING_ID: (bookingId) => `${BaseURL}/api/booking/id/${bookingId}/guests`,
  BOOKING_CHANGE_STATUS: (bookingId) => `${BaseURL}/api/booking/change-status/${bookingId}`,
  BOOKING_GUEST_INSURANCE_CHANGE_STATUS: (guestId) => `${BaseURL}/api/booking/booking-guest/insurance/change-status/${guestId}`,
  BOOKING_PAYMENT: `${BaseURL}/api/booking/payment`,
  BOOKING_COMPANY_CONFIRM_COMPLETION: (bookingId) => `${BaseURL}/api/booking/${bookingId}/company-confirm-completion`,
  BOOKING_USER_CONFIRM_COMPLETION: (bookingId) => `${BaseURL}/api/booking/${bookingId}/user-confirm-completion`,
  BOOKING_TOUR_COMPLETION_STATUS: (bookingId) => `${BaseURL}/api/booking/${bookingId}/tour-completion-status`,
  
  

  // Tour Rated
  TOUR_RATED: `${BaseURL}/api/tourRated`,
  TOUR_RATED_BY_ID: (id) => `${BaseURL}/api/tourRated/${id}`,
  TOUR_RATED_BY_TOUR: (tourId) => `${BaseURL}/api/tourRated/tour/${tourId}`,
  
  // Vouchers
  VOUCHERS: `${BaseURL}/api/vouchers`,
  VOUCHERS_BY_COMPANY: (companyId) => `${BaseURL}/api/vouchers/company/${companyId}`,
  // BE mapping: @RequestMapping("/api/vouchers") + @GetMapping("/{tourId}")
  VOUCHERS_BY_TOUR: (tourId) => `${BaseURL}/api/vouchers/${tourId}`,
  
  // Transactions
  TRANSACTIONS: `${BaseURL}/api/transactions`,
  TRANSACTIONS_BY_USER_ID: (userId) => `${BaseURL}/api/transactions/${userId}`,
  TRANSACTIONS_CHANGE_STATUS: `${BaseURL}/api/transactions/change-status`,
  
  // Tickets
  TICKET_CREATE: `${BaseURL}/api/ticket/create`,
  TICKETS: `${BaseURL}/api/ticket`,
  TICKET_BY_ID: (ticketId) => `${BaseURL}/api/ticket/${ticketId}`,
};

// Helper function để xử lý avatar URLs
export const getAvatarUrl = (avatar) => {
  if (!avatar) return '/default-avatar.png';
  // Trim dấu / ở đầu nếu có (fix lỗi Backend normalize URL Azure)
  const trimmed = avatar.trim();
  
  // Check if path contains full URL anywhere (fix: Backend lưu full Azure URL trong path)
  if (trimmed.includes('https://') || trimmed.includes('http://')) {
    // Extract the full URL from the path
    const httpsIndex = trimmed.indexOf('https://');
    const httpIndex = trimmed.indexOf('http://');
    const urlStartIndex = httpsIndex >= 0 ? httpsIndex : httpIndex;
    if (urlStartIndex >= 0) {
      return trimmed.substring(urlStartIndex);
    }
  }
  
  if (trimmed.startsWith('/https://') || trimmed.startsWith('/http://')) {
    return trimmed.substring(1); // Loại bỏ dấu / ở đầu
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return joinUrl(BaseURL, trimmed);
};

// Helper function để xử lý image URLs
export const getImageUrl = (imagePath) => {
  if (!imagePath) return '';
  // Trim dấu / ở đầu nếu có (fix lỗi Backend normalize URL Azure)
  const trimmed = imagePath.trim();
  
  // Check if path contains full URL anywhere (fix: Backend lưu full Azure URL trong path)
  if (trimmed.includes('https://') || trimmed.includes('http://')) {
    // Extract the full URL from the path
    const httpsIndex = trimmed.indexOf('https://');
    const httpIndex = trimmed.indexOf('http://');
    const urlStartIndex = httpsIndex >= 0 ? httpsIndex : httpIndex;
    if (urlStartIndex >= 0) {
      return trimmed.substring(urlStartIndex);
    }
  }
  
  if (trimmed.startsWith('/https://') || trimmed.startsWith('/http://')) {
    return trimmed.substring(1); // Loại bỏ dấu / ở đầu
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return joinUrl(BaseURL, trimmed);
};

// Helper function để xử lý tour image URLs với fallback về default tour image
export const getTourImageUrl = (imagePath, defaultImage = '/default-Tour.jpg') => {
  if (!imagePath) return defaultImage;
  // Trim dấu / ở đầu nếu có (fix lỗi Backend normalize URL Azure)
  const trimmed = imagePath.trim();
  
  // Check if path contains full URL anywhere (fix: Backend lưu full Azure URL trong path)
  if (trimmed.includes('https://') || trimmed.includes('http://')) {
    // Extract the full URL from the path
    const httpsIndex = trimmed.indexOf('https://');
    const httpIndex = trimmed.indexOf('http://');
    const urlStartIndex = httpsIndex >= 0 ? httpsIndex : httpIndex;
    if (urlStartIndex >= 0) {
      return trimmed.substring(urlStartIndex);
    }
  }
  
  if (trimmed.startsWith('/https://') || trimmed.startsWith('/http://')) {
    return trimmed.substring(1); // Loại bỏ dấu / ở đầu
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return joinUrl(BaseURL, trimmed);
};

// Helper function để normalize URL về relative path khi lưu (loại bỏ BaseURL nếu có)
// Chỉ dùng khi LƯU vào database/state, KHÔNG dùng khi HIỂN THỊ
// Đảm bảo khi deploy, không lưu full URL với backend domain vào database
export const normalizeToRelativePath = (url) => {
  if (!url) return '';
  // Nếu đã là relative path (bắt đầu với /), giữ nguyên
  if (url.startsWith('/')) return url;
  // Nếu là absolute URL từ BaseURL, chuyển về relative path
  if (url.startsWith(BaseURL)) {
    const relativePath = url.replace(BaseURL, '');
    // Đảm bảo bắt đầu với /
    return relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  }
  // Nếu là absolute URL từ domain khác (external URL), giữ nguyên
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url; // Giữ nguyên external URLs (ví dụ: từ crawl articles)
  }
  // Nếu không có prefix, thêm / để thành relative path
  return url.startsWith('/') ? url : `/${url}`;
};

// Helper function để tạo headers với auth token
const normalizeBearer = (token) => {
  if (!token) return undefined;
  return token.startsWith('Bearer ') ? token : `Bearer ${token}`;
};

export const createAuthHeaders = (token, additionalHeaders = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...additionalHeaders
  };
  
  const bearer = normalizeBearer(token);
  if (bearer) {
    headers['Authorization'] = bearer;
  }
  
  return headers;
};

// Helper function để tạo headers cho multipart/form-data với auth token
export const createAuthFormHeaders = (token, additionalHeaders = {}) => {
  const headers = {
    ...additionalHeaders
    // Không set Content-Type cho FormData, browser sẽ tự động set với boundary
  };
  
  const bearer = normalizeBearer(token);
  if (bearer) {
    headers['Authorization'] = bearer;
  }
  
  return headers;
};

// Helper function để lấy API path thông minh cho cả development và production
// - Development: Dùng relative path để Vite proxy xử lý
// - Production: Dùng full URL từ BaseURL
export const getApiPath = (path) => {
  // Đảm bảo path bắt đầu với /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // Nếu đang ở production mode, dùng full URL
  if (import.meta.env.PROD) {
    // Fail-fast: Kiểm tra BaseURL trong production
    if (!BaseURL || BaseURL === 'http://localhost:8080') {
      console.warn('[getApiPath] BaseURL is not configured for production. Please set VITE_API_BASE_URL environment variable.');
    }
    // Trong production, luôn dùng BaseURL (đã được set trong env)
    return joinUrl(BaseURL, normalizedPath);
  } else {
    // Trong development, dùng relative path để Vite proxy xử lý
    // Vite proxy trong vite.config.js sẽ forward /api/* đến backend
    return normalizedPath;
  }
};