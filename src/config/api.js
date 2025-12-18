// Cấu hình API: lấy URL base từ biến môi trường VITE_API_BASE_URL (mặc định localhost:8080), sử dụng regex /\/+$/ để loại bỏ tất cả trailing slashes đảm bảo URL sạch sẽ và nhất quán
const rawBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
export const BaseURL = rawBase.replace(/\/+$/, '');

// Lấy URL frontend từ biến môi trường VITE_FRONTEND_URL (mặc định localhost:3000), tương tự BaseURL loại bỏ trailing slashes để đảm bảo URL nhất quán và tránh lỗi routing
const rawFrontendUrl = import.meta.env.VITE_FRONTEND_URL || 'http://localhost:3000';
export const FrontendURL = rawFrontendUrl.replace(/\/+$/, '');

// Kiểm tra URL có phải localhost không: dùng để phát hiện localhost/127.0.0.1 để cảnh báo trong production, thử parse URL bằng URL constructor trước nếu thất bại thì fallback về kiểm tra string contains để xử lý các trường hợp URL không hợp lệ
const isLocalhostUrl = (url) => {
  if (!url) return false;
  try {
    const urlObj = new URL(url);
    return urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1';
  } catch {
    return url.includes('localhost') || url.includes('127.0.0.1');
  }
};

// Cảnh báo trong production nếu sử dụng localhost: kiểm tra PROD=true và BaseURL là localhost, sử dụng flag __apiConfigWarned để chỉ cảnh báo một lần tránh spam console, giúp developer nhận biết khi chưa cấu hình đúng biến môi trường VITE_API_BASE_URL cho production deployment
if (import.meta.env.PROD && isLocalhostUrl(BaseURL)) {
  if (typeof globalThis.window !== 'undefined' && !globalThis.window.__apiConfigWarned) {
    // eslint-disable-next-line no-console
    console.warn(
      '[API Config] VITE_API_BASE_URL is not set or is localhost in production. ' +
      'Please set VITE_API_BASE_URL environment variable for production deployment.'
    );
    globalThis.window.__apiConfigWarned = true;
  }
}

// Nối URL an toàn (base + path) tránh double slashes: loại bỏ tất cả trailing slashes ở base và đảm bảo path bắt đầu bằng một dấu slash, ví dụ joinUrl('http://api.com/', '/users') => 'http://api.com/users' hoặc joinUrl('http://api.com', 'users') => 'http://api.com/users'
const joinUrl = (base, path) => {
  const normalizedBase = base.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
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
  TOUR_COMPANY_STATISTICS: (companyId) => `${BaseURL}/api/tour/company/${companyId}/statistics`,
  TOUR_BY_ID: (id) => `${BaseURL}/api/tour/${id}`,
  TOUR_DELETE_BY_ID: (id, userEmail) => `${BaseURL}/api/tour/${id}?userEmail=${encodeURIComponent(userEmail)}`,
  TOURS_SEARCH: `${BaseURL}/api/tour/search`,
  TOUR_PREVIEW_BY_ID: (id) => `${BaseURL}/api/tour/preview/${id}`,
  TOURS_SUGGEST_BY_ARTICLE: (articleId) => `${BaseURL}/api/tour/suggestByArticle${articleId ? `?articleId=${articleId}` : ''}`,
  TOURS_SUGGEST_VIA_BEHAVIOR: (userId) => `${BaseURL}/api/tour/suggestViaBehavior${userId ? `?userId=${userId}` : ''}`,

  // Tour Update Requests
  TOUR_UPDATE_REQUEST: (tourId) => `${BaseURL}/api/tour/${tourId}/update-request`,
  TOUR_UPDATE_REQUESTS_PENDING: `${BaseURL}/api/tour/update-requests/pending`,
  TOUR_UPDATE_REQUEST_APPROVE: (id) => `${BaseURL}/api/tour/update-request/${id}/approve`,
  TOUR_UPDATE_REQUEST_REJECT: (id) => `${BaseURL}/api/tour/update-request/${id}/reject`,

  // Tour Delete Requests
  TOUR_DELETE_REQUEST: (tourId) => `${BaseURL}/api/tour/${tourId}/delete-request`,
  TOUR_DELETE_REQUESTS_PENDING: `${BaseURL}/api/tour/delete-requests/pending`,
  TOUR_DELETE_REQUEST_APPROVE: (id) => `${BaseURL}/api/tour/delete-request/${id}/approve`,
  TOUR_DELETE_REQUEST_REJECT: (id) => `${BaseURL}/api/tour/delete-request/${id}/reject`,

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
  BOOKING_COMPANY_STATISTICS: (companyId) => `${BaseURL}/api/booking/company/${companyId}/statistics`,
  BOOKING_COMPANY_MONTHLY_STATISTICS: (companyId, year) => `${BaseURL}/api/booking/company/${companyId}/monthly-statistics?year=${year}`,
  BOOKING_COMPANY_MONTHLY_BOOKING_COUNT: (companyId, year) => `${BaseURL}/api/booking/company/${companyId}/monthly-booking-count?year=${year}`,

  // Tour Rated
  TOUR_RATED: `${BaseURL}/api/tourRated`,
  TOUR_RATED_BY_ID: (id) => `${BaseURL}/api/tourRated/${id}`,
  TOUR_RATED_BY_TOUR: (tourId) => `${BaseURL}/api/tourRated/tour/${tourId}`,

  // Vouchers
  VOUCHERS: `${BaseURL}/api/vouchers`,
  VOUCHERS_BY_COMPANY: (companyId) => `${BaseURL}/api/vouchers/company/${companyId}`,
  VOUCHERS_BY_TOUR: (tourId) => `${BaseURL}/api/vouchers/${tourId}`,

  // Transactions
  TRANSACTIONS: `${BaseURL}/api/transactions`,
  TRANSACTIONS_BY_USER_ID: (userId) => `${BaseURL}/api/transactions/${userId}`,
  TRANSACTIONS_CHANGE_STATUS: `${BaseURL}/api/transactions/change-status`,

  // Tickets
  TICKET_CREATE: `${BaseURL}/api/ticket/create`,
  TICKETS: `${BaseURL}/api/ticket`,
  TICKET_BY_ID: (ticketId) => `${BaseURL}/api/ticket/${ticketId}`,

  // Admin Statistics
  ADMIN_TOUR_STATISTICS: `${BaseURL}/api/admin/tour/statistics`,
  ADMIN_BOOKING_STATISTICS: `${BaseURL}/api/admin/booking/statistics`,
  ADMIN_COUNT_UNBANNED_USERS: `${BaseURL}/api/admin/count/unbanned/user`,
  ADMIN_COUNT_UNBANNED_COMPANIES: `${BaseURL}/api/admin/count/unbanned/company`,
  ADMIN_COUNT_UNBANNED_STAFF: `${BaseURL}/api/admin/count/unbanned/staff`,
  ADMIN_COUNT_APPROVED_ARTICLES: `${BaseURL}/api/admin/admin/count/approved`,
  ADMIN_MONTHLY_BOOKING_COUNT: (year) => `${BaseURL}/api/admin/booking/monthly-booking-count?year=${year}`,
  ADMIN_MONTHLY_REVENUE: (year) => `${BaseURL}/api/admin/booking/monthly-revenue?year=${year}`,
};

// Xử lý avatar URLs: chuyển đổi avatar path thành URL đầy đủ để hiển thị, xử lý các trường hợp null/undefined/empty => trả về default avatar '/default-avatar.png', full URL (chứa https:// hoặc http://) => tìm vị trí bắt đầu và trích xuất URL từ đó, bắt đầu bằng /https:// hoặc /http:// => loại bỏ slash đầu tiên, relative path => nối với BaseURL để tạo full URL, lý do backend có thể lưu full Azure URL trong path nên cần trích xuất đúng URL
export const getAvatarUrl = (avatar) => {
  if (!avatar) return '/default-avatar.png';
  const trimmed = avatar.trim();

  if (trimmed.includes('https://') || trimmed.includes('http://')) {
    const httpsIndex = trimmed.indexOf('https://');
    const httpIndex = trimmed.indexOf('http://');
    const urlStartIndex = httpsIndex >= 0 ? httpsIndex : httpIndex;
    if (urlStartIndex >= 0) {
      return trimmed.substring(urlStartIndex);
    }
  }

  if (trimmed.startsWith('/https://') || trimmed.startsWith('/http://')) {
    return trimmed.substring(1);
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return joinUrl(BaseURL, trimmed);
};

// Xử lý image URLs: chuyển đổi image path thành URL đầy đủ để hiển thị, tương tự getAvatarUrl nhưng trả về empty string thay vì default image khi không có path, xử lý null/undefined/empty => empty string, full URL => tìm vị trí bắt đầu và trích xuất URL, relative path => nối với BaseURL, dùng cho các loại image khác ngoài avatar như post images, tour images, article images
export const getImageUrl = (imagePath) => {
  if (!imagePath) return '';
  const trimmed = imagePath.trim();

  if (trimmed.includes('https://') || trimmed.includes('http://')) {
    const httpsIndex = trimmed.indexOf('https://');
    const httpIndex = trimmed.indexOf('http://');
    const urlStartIndex = httpsIndex >= 0 ? httpsIndex : httpIndex;
    if (urlStartIndex >= 0) {
      return trimmed.substring(urlStartIndex);
    }
  }

  if (trimmed.startsWith('/https://') || trimmed.startsWith('/http://')) {
    return trimmed.substring(1);
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return joinUrl(BaseURL, trimmed);
};

// Xử lý tour image URLs với fallback về default tour image: tương tự getImageUrl nhưng có fallback default image khi không có path, thiết kế riêng cho tour images để đảm bảo luôn có image hiển thị (dù là default), xử lý null/undefined/empty => trả về defaultImage (mặc định '/default-Tour.jpg'), full URL => trích xuất URL, relative path => nối với BaseURL, cho phép custom defaultImage nếu cần sử dụng image mặc định khác
export const getTourImageUrl = (imagePath, defaultImage = '/default-Tour.jpg') => {
  if (!imagePath) return defaultImage;
  const trimmed = imagePath.trim();

  if (trimmed.includes('https://') || trimmed.includes('http://')) {
    const httpsIndex = trimmed.indexOf('https://');
    const httpIndex = trimmed.indexOf('http://');
    const urlStartIndex = httpsIndex >= 0 ? httpsIndex : httpIndex;
    if (urlStartIndex >= 0) {
      return trimmed.substring(urlStartIndex);
    }
  }

  if (trimmed.startsWith('/https://') || trimmed.startsWith('/http://')) {
    return trimmed.substring(1);
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return joinUrl(BaseURL, trimmed);
};

// Normalize URL về relative path khi lưu (loại bỏ BaseURL nếu có): QUAN TRỌNG chỉ dùng khi LƯU vào database/state KHÔNG dùng khi HIỂN THỊ, mục đích đảm bảo khi deploy không lưu full URL với backend domain vào database giúp code chạy trên nhiều môi trường khác nhau mà không cần migrate data, xử lý URL rỗng => empty string, relative path (bắt đầu bằng /) => trả về nguyên vẹn, chứa BaseURL => so sánh case-insensitive và loại bỏ BaseURL chỉ giữ relative path, localhost dev environment => trích xuất pathname từ URL (ví dụ http://localhost:8080/uploads/image.jpg => /uploads/image.jpg), external URL => giữ nguyên
export const normalizeToRelativePath = (url) => {
  if (!url) return '';
  
  const trimmed = url.trim();
  if (!trimmed) return '';
  
  if (trimmed.startsWith('/')) return trimmed;
  
  const baseUrlLower = BaseURL.toLowerCase();
  const trimmedLower = trimmed.toLowerCase();
  
  if (trimmedLower.startsWith(baseUrlLower)) {
    const relativePath = trimmed.substring(BaseURL.length);
    return relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  }
  
  if (isLocalhostUrl(trimmed) && trimmed.includes('/uploads/')) {
    try {
      const urlObj = new URL(trimmed);
      return urlObj.pathname;
    } catch {
      const pathMatch = trimmed.match(/\/uploads\/.*/);
      if (pathMatch) return pathMatch[0];
    }
  }
  
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
};

// Normalize Bearer token: đảm bảo token luôn có prefix "Bearer " để đúng format cho Authorization header, xử lý token rỗng => trả về undefined, token đã có "Bearer " => trả về nguyên vẹn, token chưa có "Bearer " => thêm prefix vào
const normalizeBearer = (token) => {
  if (!token) return undefined;
  return token.startsWith('Bearer ') ? token : `Bearer ${token}`;
};

// Tạo headers với auth token cho các request JSON: tạo object headers chuẩn cho API request cần authentication, tự động set Content-Type là application/json và thêm Authorization header với Bearer token, cho phép thêm headers bổ sung thông qua additionalHeaders parameter, sử dụng normalizeBearer để đảm bảo token luôn có format đúng "Bearer <token>"
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

// Tạo headers cho multipart/form-data với auth token: tương tự createAuthHeaders nhưng KHÔNG set Content-Type vì khi gửi FormData browser sẽ tự động set Content-Type với boundary parameter, nếu set Content-Type thủ công sẽ làm mất boundary và request sẽ fail, chỉ thêm Authorization header với Bearer token và các additionalHeaders (nếu có), sử dụng khi upload file, image, hoặc gửi form data
export const createAuthFormHeaders = (token, additionalHeaders = {}) => {
  const headers = {
    ...additionalHeaders
  };

  const bearer = normalizeBearer(token);
  if (bearer) {
    headers['Authorization'] = bearer;
  }

  return headers;
};

// Lấy API path thông minh cho development và production: development dùng relative path (ví dụ '/api/users') để Vite proxy forward request đến backend server tránh CORS issues, production dùng full URL (ví dụ 'https://api.example.com/api/users') vì không có Vite dev server nên cần gọi trực tiếp đến backend, đảm bảo path luôn bắt đầu bằng dấu slash để tránh lỗi routing, sử dụng joinUrl để nối BaseURL với path trong production
export const getApiPath = (path) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  if (import.meta.env.PROD) {
    return joinUrl(BaseURL, normalizedPath);
  } else {
    return normalizedPath;
  }
};