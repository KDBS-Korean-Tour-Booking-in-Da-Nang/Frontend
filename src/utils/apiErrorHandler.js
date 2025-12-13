/**
 * Global API Error Handler
 * Handles 401, 403, 404, 500 errors consistently across the app
 */

let logoutCallback = null;
let navigateCallback = null;

/**
 * Set the logout callback function from AuthContext
 * @param {Function} callback - The logout function from useAuth()
 */
export const setLogoutCallback = (callback) => {
  logoutCallback = callback;
};

/**
 * Set the navigate callback function for error page redirects
 * @param {Function} callback - The navigate function from useNavigate()
 */
export const setNavigateCallback = (callback) => {
  navigateCallback = callback;
};

/**
 * Redirect to error page based on status code
 * @param {number} status - HTTP status code
 * @param {boolean} autoRedirect - Whether to automatically redirect (default: false)
 */
export const redirectToErrorPage = (status, autoRedirect = false) => {
  if (!navigateCallback) {
    return;
  }

  if (autoRedirect) {
    switch (status) {
      case 401:
        // 401 redirects to login (handled separately)
        if (logoutCallback) {
          logoutCallback();
        }
        navigateCallback('/error/401', { replace: true });
        break;
      case 403:
        navigateCallback('/error/403', { replace: true });
        break;
      case 404:
        navigateCallback('/error/404', { replace: true });
        break;
      case 500:
        navigateCallback('/error/500', { replace: true });
        break;
      default:
        // For other 5xx errors, redirect to 500 page
        if (status >= 500) {
          navigateCallback('/error/500', { replace: true });
        }
        break;
    }
  }
};

/**
 * Handle API response errors
 * Handles 401, 403, 404, 500 errors
 * @param {Response} response - The fetch response object
 * @param {boolean} autoRedirect - Whether to automatically redirect to error pages (default: false)
 * @returns {Promise<Error>} - A rejected promise with error
 */
export const handleApiError = async (response, autoRedirect = false) => {
  const status = response.status;

  // Handle 401 Unauthorized - token expired or invalid
  if (status === 401) {
    // Clear tokens first
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('accessToken');
      sessionStorage.removeItem('token');
    } catch {
      // Failed to clear tokens, continue anyway
    }
    
    // Call logout if available to properly clear user state
    if (logoutCallback) {
      try {
        logoutCallback();
      } catch {
        // Failed to call logout callback, continue anyway
      }
    }
    
    // Redirect to 401 page (which will redirect to login)
    if (autoRedirect) {
      redirectToErrorPage(401, true);
    }
    
    return new Error('Session expired. Please login again.');
  }

  // Handle 403 Forbidden - not enough permissions or banned user
  if (status === 403) {
    // Try to detect banned user (ErrorCode.USER_IS_BANNED: code 1012, message \"User is banned.\")
    let apiCode = null;
    let apiMessage = null;
    try {
      const text = await response.clone().text();
      if (text) {
        try {
          const obj = JSON.parse(text);
          apiCode = obj?.code ?? null;
          apiMessage = obj?.message ?? null;
        } catch {
          apiMessage = text;
        }
      }
    } catch {
      // ignore parsing errors, fallback to generic handling
    }

    const isBanned =
      apiCode === 1012 ||
      (typeof apiMessage === 'string' &&
        apiMessage.toLowerCase().includes('user is banned'));

    if (isBanned) {
      // Banned user: force logout and redirect to banned page
      if (logoutCallback) {
        try {
          logoutCallback();
        } catch {
          // Failed to call logout callback for banned user, continue anyway
        }
      }
      if (navigateCallback) {
        navigateCallback('/banned', { replace: true });
      }
      const error = new Error(apiMessage || 'Tài khoản của bạn đã bị khóa.');
      error.status = 403;
      error.code = apiCode;
      return error;
    }

    if (autoRedirect) {
      redirectToErrorPage(403, true);
    }
    const error = new Error('Bạn không có quyền truy cập tài nguyên này.');
    error.status = 403;
    return error;
  }

  // Handle 404 Not Found - resource doesn't exist
  if (status === 404) {
    if (autoRedirect) {
      redirectToErrorPage(404, true);
    }
    const error = new Error('Tài nguyên không tồn tại.');
    error.status = 404;
    return error;
  }

  // Handle 500 Internal Server Error
  if (status === 500) {
    if (autoRedirect) {
      redirectToErrorPage(500, true);
    }
    const error = new Error('Lỗi máy chủ. Vui lòng thử lại sau.');
    error.status = 500;
    return error;
  }

  // Handle other 5xx errors
  if (status >= 500) {
    if (autoRedirect) {
      redirectToErrorPage(status, true);
    }
    const error = new Error('Lỗi máy chủ. Vui lòng thử lại sau.');
    error.status = status;
    return error;
  }
  
  // For other errors, try to parse error message
  try {
    const text = await response.text();
    if (!text) {
      const error = new Error(`HTTP error! status: ${status}`);
      error.status = status;
      return error;
    }
    try {
      const obj = JSON.parse(text);
      const error = new Error(obj?.message || `HTTP error! status: ${status}`);
      error.status = status;
      return error;
    } catch {
      const error = new Error(text || `HTTP error! status: ${status}`);
      error.status = status;
      return error;
    }
  } catch {
    const error = new Error(`HTTP error! status: ${status}`);
    error.status = status;
    return error;
  }
};

/**
 * Wrapper for fetch that automatically handles 401 errors
 * Use this for all API calls that require authentication
 * @param {string} url - The URL to fetch
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<Response>} - The fetch response
 */
export const authenticatedFetch = async (url, options = {}) => {
  const response = await fetch(url, options);
  
  // If 401, handle it automatically (but don't throw, let caller decide)
  if (response.status === 401 && !response.ok) {
    await handleApiError(response);
  }
  
  return response;
};

/**
 * Check if response is 401 and handle it
 * Use this in components that make direct fetch calls
 * @param {Response} response - The fetch response
 * @param {boolean} autoRedirect - Whether to automatically redirect (default: false)
 * @returns {boolean} - True if 401 was handled
 */
export const checkAndHandle401 = async (response, autoRedirect = false) => {
  if (response.status === 401) {
    await handleApiError(response, autoRedirect);
    return true;
  }
  return false;
};

/**
 * Check and handle common API errors (401, 403, 404, 500)
 * Use this in components that make direct fetch calls
 * @param {Response} response - The fetch response
 * @param {boolean} autoRedirect - Whether to automatically redirect to error pages (default: false)
 * @returns {Promise<boolean>} - True if error was handled
 */
export const checkAndHandleApiError = async (response, autoRedirect = false) => {
  const status = response.status;
  if (status === 401 || status === 403 || status === 404 || status >= 500) {
    await handleApiError(response, autoRedirect);
    return true;
  }
  return false;
};

