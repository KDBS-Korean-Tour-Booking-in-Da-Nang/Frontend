import { API_ENDPOINTS, createAuthFormHeaders, createAuthHeaders, getAvatarUrl } from '../config/api';
import { checkAndHandleApiError } from '../utils/apiErrorHandler';

/**
 * Update user profile information
 * @param {Object} userData - User data to update
 * @param {string} token - Authentication token
 * @returns {Promise<Object>} Updated user data
 */
// Cập nhật thông tin profile người dùng
// Sử dụng FormData để gửi cả dữ liệu JSON và file avatar
export const updateUserProfile = async (userData, token) => {
  try {
    if (!token) {
      throw new Error('Token xác thực không được cung cấp');
    }

    // Tạo FormData cho multipart/form-data request
    const formData = new FormData();
    
    // Thêm email như request parameter (backend yêu cầu)
    if (userData.email && userData.email.trim()) {
      formData.append('email', userData.email.trim());
    }
    
    // Tạo object dữ liệu cập nhật khớp với UserUpdateRequest structure
    const updateData = {};
    
    // Map các field từ frontend sang backend
    if (userData.name && userData.name.trim()) {
      updateData.username = userData.name.trim(); // Backend expect 'username' field
    }
    // Phone: optional. Nếu user để trống, không gửi để tránh conflict PHONE_EXISTED
    if (userData.phone !== undefined && userData.phone !== null) {
      const trimmedPhone = String(userData.phone).trim();
      if (trimmedPhone) {
        updateData.phone = trimmedPhone;
      }
    }
    if (userData.dob && userData.dob.trim()) {
      updateData.dob = userData.dob.trim();
    }
    if (userData.gender !== undefined && userData.gender !== null) {
      updateData.gender = userData.gender.trim();
    }
    if (userData.address !== undefined && userData.address !== null) {
      updateData.address = userData.address.trim();
    }
    if (userData.cccd && userData.cccd.trim()) {
      updateData.cccd = userData.cccd.trim();
    }
    
    // Thêm object dữ liệu dưới dạng JSON string trong phần 'data' với Content-Type đúng
    const jsonBlob = new Blob([JSON.stringify(updateData)], { type: 'application/json' });
    formData.append('data', jsonBlob);
    
    // Xử lý avatar: nếu có file mới thì dùng, nếu không thì tái sử dụng avatar hiện tại
    if (userData.avatarFile && userData.avatarFile instanceof File) {
      formData.append('avatarImg', userData.avatarFile);
    } else {
      // Fallback: tái sử dụng avatar hiện tại bằng cách fetch nó như Blob và upload lại
      // Điều này giữ nguyên avatar hiện tại mà không buộc user phải chọn lại
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
          // Nếu fetch thất bại, bỏ qua; server có thể reject nhưng không làm crash ở đây
        }
      }
    }
    
    const headers = createAuthFormHeaders(token);
    
    const response = await fetch(API_ENDPOINTS.UPDATE_USER, {
      method: 'PUT',
      headers,
      body: formData
    });
    
    if (!response.ok) {
      const wasHandled = await checkAndHandleApiError(response, true);
      if (wasHandled) {
        return;
      }
      
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
    return result;
  } catch (error) {
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
// Validate dữ liệu profile người dùng trước khi gửi lên API
export const validateUserProfile = (userData) => {
  const errors = {};
  
  // Validate tên (map sang username trong backend)
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
  
  // Validate số điện thoại (optional nhưng nếu có thì phải hợp lệ)
  // Cho phép chuỗi rỗng (để xóa số điện thoại)
  if (userData.phone !== undefined && userData.phone !== null && userData.phone.trim()) {
    const cleanPhone = userData.phone.replace(/\s/g, '');
    if (cleanPhone.length === 0) {
      // Số điện thoại rỗng được phép, bỏ qua validation
    } else if (cleanPhone.length > 20) {
      errors.phone = 'Số điện thoại không được vượt quá 20 ký tự';
    } else {
      // Validation linh hoạt: cho phép định dạng Việt Nam hoặc quốc tế
      const vietnameseRegex = /^(\+84|0)[0-9]{9,10}$/;
      const internationalRegex = /^\+[1-9]\d{1,14}$/; // E.164 format
      if (!vietnameseRegex.test(cleanPhone) && !internationalRegex.test(cleanPhone)) {
        // Chỉ hiển thị lỗi nếu số điện thoại rõ ràng không hợp lệ (quá ngắn hoặc có ký tự không hợp lệ)
        if (cleanPhone.length < 7 || !/^[\d+]+$/.test(cleanPhone)) {
          errors.phone = 'Số điện thoại không hợp lệ';
        }
        // Nếu không, cho phép (có thể là định dạng hợp lệ mà chúng ta chưa dự đoán)
      }
    }
  }
  
  // Validate ngày sinh (optional nhưng nếu có thì phải hợp lệ)
  // Chỉ validate nếu DOB được cung cấp và không rỗng - cho phép DOB rỗng
  if (userData.dob && userData.dob.trim() && userData.dob.trim().length > 0) {
    // DOB nên ở định dạng ISO (YYYY-MM-DD) khi truyền vào đây
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
      // Tính tuổi chính xác (xét cả tháng và ngày)
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      
      // Yêu cầu ít nhất 13 tuổi, không giới hạn trên nghiêm ngặt (cho phép đến 150 để validation hợp lý)
      if (age < 13) {
        errors.dob = 'Bạn phải từ 13 tuổi trở lên';
      } else if (age > 150) {
        errors.dob = 'Tuổi không hợp lệ';
      }
    }
  }
  
  if (userData.gender && userData.gender.trim()) {
    const gender = userData.gender.trim().toUpperCase();
    const validGenders = ['M', 'F', 'O'];
    if (!validGenders.includes(gender)) {
      errors.gender = 'Giới tính không hợp lệ (chỉ chấp nhận: M, F, O)';
    }
  }
  
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
      const wasHandled = await checkAndHandleApiError(response, true);
      if (wasHandled) {
        return;
      }
      
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
    return result.result || result;
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.');
    }
    
    throw error;
  }
};

/**
 * Change user password
 * @param {{ email: string; oldPassword: string; newPassword: string }} payload
 * @param {string} token
 * @returns {Promise<Object>} Api response
 */
export const changeUserPassword = async (payload, token) => {
  try {
    if (!token) {
      throw new Error('Token xác thực không được cung cấp');
    }

    if (!payload?.email) {
      throw new Error('Email không được để trống');
    }

    const headers = createAuthHeaders(token);

    const response = await fetch(API_ENDPOINTS.CHANGE_PASSWORD, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email: payload.email,
        oldPassword: payload.oldPassword,
        newPassword: payload.newPassword
      })
    });

    if (!response.ok) {
      const wasHandled = await checkAndHandleApiError(response, true);
      if (wasHandled) {
        return;
      }

      let errorMessage = `HTTP error! status: ${response.status}`;

      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        errorMessage = response.statusText || errorMessage;
      }

      throw new Error(errorMessage);
    }

    return response.json();
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.');
    }

    throw error;
  }
};

