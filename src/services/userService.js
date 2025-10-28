import { API_ENDPOINTS, createAuthFormHeaders } from '../config/api';

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
    if (userData.phone && userData.phone.trim()) {
      updateData.phone = userData.phone.trim();
    }
    if (userData.dob && userData.dob.trim()) {
      updateData.dob = userData.dob.trim();
    }
    if (userData.gender && userData.gender.trim()) {
      updateData.gender = userData.gender.trim();
    }
    if (userData.cccd && userData.cccd.trim()) {
      updateData.cccd = userData.cccd.trim();
    }
    
    // Add the data object as a JSON string in the 'data' part with correct Content-Type
    const jsonBlob = new Blob([JSON.stringify(updateData)], { type: 'application/json' });
    formData.append('data', jsonBlob);
    
    // Add avatar file only if user selected a new avatar
    if (userData.avatarFile && userData.avatarFile instanceof File) {
      formData.append('avatarImg', userData.avatarFile);
    }
    // Note: If no avatar file is provided, we don't send avatarImg part
    // Backend will only update avatar if avatarImg is provided
    
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
  if (userData.phone && userData.phone.trim()) {
    const cleanPhone = userData.phone.replace(/\s/g, '');
    if (cleanPhone.length > 11) {
      errors.phone = 'Số điện thoại không được vượt quá 11 ký tự';
    } else {
      const phoneRegex = /^(\+84|0)[0-9]{9,10}$/;
      if (!phoneRegex.test(cleanPhone)) {
        errors.phone = 'Số điện thoại không hợp lệ (định dạng: 0xxxxxxxxx hoặc +84xxxxxxxxx)';
      }
    }
  }
  
  // Validate date of birth (optional but if provided, should be valid)
  if (userData.dob && userData.dob.trim()) {
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
      const age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      
      if (age < 0 || age > 120) {
        errors.dob = 'Tuổi không hợp lệ (0-120 tuổi)';
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
