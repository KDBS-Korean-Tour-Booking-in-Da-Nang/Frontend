// API Configuration
// Thay đổi BaseURL này khi deploy để trỏ đến server thực tế
export const BaseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// Frontend URL for link detection
export const FrontendURL = import.meta.env.VITE_FRONTEND_URL || 'http://localhost:5173';

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
  
  // Reactions
  REACTIONS_ADD: `${BaseURL}/api/reactions/add`,
  REACTIONS_DELETE: `${BaseURL}/api/reactions/delete`,
  REACTIONS_POST_USER: (postId, userEmail) => `${BaseURL}/api/reactions/post/${postId}/user/${encodeURIComponent(userEmail)}`,
  REACTIONS_POST_COUNT: (postId) => `${BaseURL}/api/reactions/post/${postId}/count`,
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
  
  // Hashtags
  HASHTAGS: `${BaseURL}/api/hashtags`,
  HASHTAGS_POPULAR: `${BaseURL}/api/hashtags/popular`,
  HASHTAGS_SEARCH: `${BaseURL}/api/hashtags/search`,
  
  // Users
  USERS: `${BaseURL}/api/users`,
  
  // Tours
  TOURS: `${BaseURL}/api/tour`,
  TOUR_BY_ID: (id) => `${BaseURL}/api/tour/${id}`,
  TOURS_SEARCH: `${BaseURL}/api/tour/search`,
  TOUR_PREVIEW_BY_ID: (id) => `${BaseURL}/api/tour/preview/${id}`,
  
  // Booking
  BOOKING_BY_EMAIL: (email) => `${BaseURL}/api/booking/email/${encodeURIComponent(email)}`,
  BOOKING_SUMMARY_BY_EMAIL: (email) => `${BaseURL}/api/booking/summary/email/${encodeURIComponent(email)}`,
  BOOKING_BY_ID: (id) => `${BaseURL}/api/booking/id/${id}`,
};

// Helper function để xử lý avatar URLs
export const getAvatarUrl = (avatar) => {
  if (!avatar) return '/default-avatar.png';
  if (avatar.startsWith('http')) return avatar;
  return `${BaseURL}${avatar.startsWith('/') ? '' : '/'}${avatar}`;
};

// Helper function để xử lý image URLs
export const getImageUrl = (imagePath) => {
  if (!imagePath) return '';
  if (imagePath.startsWith('http')) return imagePath;
  return `${BaseURL}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
};

// Helper function để tạo headers với auth token
export const createAuthHeaders = (token, additionalHeaders = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...additionalHeaders
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

// Helper function để tạo headers cho multipart/form-data với auth token
export const createAuthFormHeaders = (token, additionalHeaders = {}) => {
  const headers = {
    ...additionalHeaders
    // Không set Content-Type cho FormData, browser sẽ tự động set với boundary
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};