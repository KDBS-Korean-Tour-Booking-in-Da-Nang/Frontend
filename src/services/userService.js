import { API_ENDPOINTS, createAuthFormHeaders, createAuthHeaders, getAvatarUrl } from '../config/api';

/**
 * Update user profile information
 * @param {Object} userData - User data to update
 * @param {string} token - Authentication token
 * @returns {Promise<Object>} Updated user data
 */
export const updateUserProfile = async (userData, token) => {
  try {
    if (!token) {
      throw new Error('Token xác thực không được cung cấp');
    }

    // Create FormData for multipart/form-data request
    const formData = new FormData();
    
    // Add email as request parameter (required by backend)
    if (userData.email && userData.email.trim()) {
      formData.append('email', userData.email.trim());
    }
    
    // Create the data object that matches UserUpdateRequest structure
    const updateData = {};
    
    // Map frontend fields to backend fields
    if (userData.name && userData.name.trim()) {
      updateData.username = userData.name.trim(); // Backend expects 'username' field
    }
    // Always include phone (even if empty) to allow clearing
    if (userData.phone !== undefined && userData.phone !== null) {
      updateData.phone = userData.phone.trim();
    }
    // Only include DOB if it's valid (non-empty and normalized)
    if (userData.dob && userData.dob.trim()) {
      updateData.dob = userData.dob.trim();
    }
    // Always include gender (even if empty) to allow clearing
    if (userData.gender !== undefined && userData.gender !== null) {
      updateData.gender = userData.gender.trim();
    }
    // Always include address (even if empty) to allow clearing
    if (userData.address !== undefined && userData.address !== null) {
      updateData.address = userData.address.trim();
    }
    if (userData.cccd && userData.cccd.trim()) {
      updateData.cccd = userData.cccd.trim();
    }
    
    // Add the data object as a JSON string in the 'data' part with correct Content-Type
    const jsonBlob = new Blob([JSON.stringify(updateData)], { type: 'application/json' });
    formData.append('data', jsonBlob);
    
    // Always include avatarImg because backend requires a non-null file for avatar processing
    if (userData.avatarFile && userData.avatarFile instanceof File) {
      formData.append('avatarImg', userData.avatarFile);
    } else {
      // Fallback: reuse existing avatar by fetching it as a Blob and re-uploading
      // This preserves the current avatar without forcing users to pick a new one
      const existingUrl = userData.currentAvatarUrl ? getAvatarUrl(userData.currentAvatarUrl) : null;
      if (existingUrl) {
        try {
          const avatarResponse = await fetch(existingUrl, { credentials: 'omit' });
          if (avatarResponse.ok) {
            const avatarBlob = await avatarResponse.blob();
            const ext = (avatarBlob.type && avatarBlob.type.split('/')[1]) || 'jpg';
            const fileName = `current-avatar.${ext}`;
            const file = new File([avatarBlob], fileName, { type: avatarBlob.type || 'image/jpeg' });
            formData.append('avatarImg', file);
          }
        } catch (e) {
          // If fetch fails, we skip attaching avatar; server may reject, but we avoid breaking here
        }
      }
    }
    
    // Create headers with auth token
    const headers = createAuthFormHeaders(token);
    
    const response = await fetch(API_ENDPOINTS.UPDATE_USER, {
      method: 'PUT',
      headers,
      body: formData
    });
    
    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (parseError) {
        // If response is not JSON, use status text
        errorMessage = response.statusText || errorMessage;
      }
      
      throw new Error(errorMessage);
    }
    
    const result = await response.json();
    console.log('Update user profile response:', result); // Debug log
    return result;
  } catch (error) {
    console.error('Error updating user profile:', error);
    
    // Handle specific error cases
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.');
    }
    
    throw error;
  }
};

/**
 * Validate user profile data before sending to API
 * @param {Object} userData - User data to validate
 * @returns {Object} Validation result with isValid and errors
 */
export const validateUserProfile = (userData) => {
  const errors = {};
  
  // Validate name (maps to username in backend)
  if (!userData.name || !userData.name.trim()) {
    errors.name = 'Tên không được để trống';
  } else if (userData.name.trim().length < 2) {
    errors.name = 'Tên phải có ít nhất 2 ký tự';
  } else if (userData.name.trim().length > 30) {
    errors.name = 'Tên không được vượt quá 30 ký tự';
  }
  
  // Validate email
  if (!userData.email || !userData.email.trim()) {
    errors.email = 'Email không được để trống';
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email.trim())) {
      errors.email = 'Email không hợp lệ';
    } else if (userData.email.trim().length > 255) {
      errors.email = 'Email không được vượt quá 255 ký tự';
    }
  }
  
  // Validate phone (optional but if provided, should be valid)
  if (userData.phone !== undefined && userData.phone !== null && userData.phone.trim()) {
    const cleanPhone = userData.phone.replace(/\s/g, '');
    // Allow empty string (for clearing)
    if (cleanPhone.length === 0) {
      // Empty phone is allowed, skip validation
    } else if (cleanPhone.length > 20) {
      errors.phone = 'Số điện thoại không được vượt quá 20 ký tự';
    } else {
      // More flexible validation: allow Vietnamese format or international format
      const vietnameseRegex = /^(\+84|0)[0-9]{9,10}$/;
      const internationalRegex = /^\+[1-9]\d{1,14}$/; // E.164 format
      if (!vietnameseRegex.test(cleanPhone) && !internationalRegex.test(cleanPhone)) {
        // Only show error if phone is clearly invalid (too short or has invalid chars)
        if (cleanPhone.length < 7 || !/^[\d+]+$/.test(cleanPhone)) {
          errors.phone = 'Số điện thoại không hợp lệ';
        }
        // Otherwise, allow it (might be valid format we didn't anticipate)
      }
    }
  }
  
  // Validate date of birth (optional but if provided, should be valid)
  // Only validate if DOB is provided and non-empty - allow empty DOB
  if (userData.dob && userData.dob.trim() && userData.dob.trim().length > 0) {
    // DOB should be in ISO format (YYYY-MM-DD) when passed here
    const dob = new Date(userData.dob);
    const today = new Date();
    const minDate = new Date('1900-01-01');
    
    if (isNaN(dob.getTime())) {
      errors.dob = 'Ngày sinh không hợp lệ';
    } else if (dob > today) {
      errors.dob = 'Ngày sinh không thể là ngày tương lai';
    } else if (dob < minDate) {
      errors.dob = 'Ngày sinh không hợp lệ';
    } else {
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      
      // Require at least 13 years old, no strict upper limit (allow up to 150 for reasonable validation)
      if (age < 13) {
        errors.dob = 'Bạn phải từ 13 tuổi trở lên';
      } else if (age > 150) {
        errors.dob = 'Tuổi không hợp lệ';
      }
    }
  }
  
  // Validate gender (optional but if provided, should be valid)
  if (userData.gender && userData.gender.trim()) {
    const gender = userData.gender.trim().toUpperCase();
    const validGenders = ['M', 'F', 'O'];
    if (!validGenders.includes(gender)) {
      errors.gender = 'Giới tính không hợp lệ (chỉ chấp nhận: M, F, O)';
    }
  }
  
  // Validate CCCD (optional but if provided, should be valid)
  if (userData.cccd && userData.cccd.trim()) {
    const cleanCccd = userData.cccd.replace(/\s/g, '');
    if (cleanCccd.length > 12) {
      errors.cccd = 'CCCD/CMND không được vượt quá 12 ký tự';
    } else {
      const cccdRegex = /^[0-9]{9,12}$/;
      if (!cccdRegex.test(cleanCccd)) {
        errors.cccd = 'CCCD/CMND không hợp lệ (9-12 chữ số)';
      }
    }
  }
  
  // Note: Address field is not supported by backend UserUpdateRequest
  
  // Validate avatar file (if provided)
  if (userData.avatarFile && userData.avatarFile instanceof File) {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    
    if (userData.avatarFile.size > maxSize) {
      errors.avatar = 'Kích thước ảnh không được vượt quá 5MB';
    } else if (!allowedTypes.includes(userData.avatarFile.type)) {
      errors.avatar = 'Định dạng ảnh không được hỗ trợ (chỉ chấp nhận JPG, PNG, GIF, WebP)';
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Get user information by email
 * @param {string} email - User email
 * @param {string} token - Authentication token
 * @returns {Promise<Object>} User data
 */
export const getUserByEmail = async (email, token) => {
  try {
    if (!token) {
      throw new Error('Token xác thực không được cung cấp');
    }

    if (!email || !email.trim()) {
      throw new Error('Email không được để trống');
    }

    const headers = createAuthHeaders(token);
    
    const response = await fetch(API_ENDPOINTS.GET_USER(email), {
      method: 'GET',
      headers
    });
    
    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (parseError) {
        errorMessage = response.statusText || errorMessage;
      }
      
      throw new Error(errorMessage);
    }
    
    const result = await response.json();
    // Backend returns UserResponse directly (not wrapped in ApiResponse)
    // If result has a 'result' property (ApiResponse wrapper), use it, otherwise use result directly
    return result.result || result;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.');
    }
    
    throw error;
  }
};

