# Authentication Integration for Tour Booking

## Tổng quan

Đã tích hợp hoàn toàn authentication cho chức năng booking tour. Tất cả các API calls yêu cầu Bearer token và có xử lý lỗi authentication đầy đủ.

## Các thay đổi chính

### 1. **BookingAPI với Bearer Token** ✅
- **`src/services/bookingAPI.js`**: Đã cập nhật để thêm Authorization header
- **Function `getAuthHeaders()`**: Tự động lấy token từ localStorage/sessionStorage
- **Error handling**: Xử lý lỗi 401 Unauthorized và clear token

### 2. **Authentication Guard** ✅
- **`src/pages/tour/TourBookingWizard.jsx`**: Thêm authentication guard
- **Loading state**: Hiển thị loading khi kiểm tra authentication
- **Login required**: Redirect đến login nếu chưa đăng nhập
- **Return after login**: Lưu URL hiện tại để quay lại sau khi login

### 3. **Error Handling** ✅
- **401 Unauthorized**: Tự động clear token và redirect đến login
- **Token expiry**: Xử lý khi token hết hạn
- **Network errors**: Hiển thị thông báo lỗi phù hợp

## Cấu trúc Authentication

### 1. Token Management
```javascript
// Lấy token từ storage
const getAuthHeaders = () => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};
```

### 2. API Calls với Authentication
```javascript
// Tất cả API calls đều có Bearer token
const response = await fetch(`${API_BASE_URL}/api/booking`, {
  method: 'POST',
  headers: getAuthHeaders(), // ← Bearer token được thêm tự động
  body: JSON.stringify(bookingData),
});
```

### 3. Error Handling
```javascript
if (!response.ok) {
  // Handle authentication errors
  if (response.status === 401) {
    // Clear invalid token
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    throw new Error('Unauthenticated');
  }
  
  throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
}
```

## User Flow với Authentication

### 1. **Chưa đăng nhập**:
```
User truy cập /tour/:id/booking
↓
Authentication guard kiểm tra
↓
Redirect đến /login với returnAfterLogin
↓
User đăng nhập thành công
↓
Redirect về /tour/:id/booking
↓
Tiếp tục booking process
```

### 2. **Đã đăng nhập**:
```
User truy cập /tour/:id/booking
↓
Authentication guard pass
↓
Hiển thị booking wizard
↓
User hoàn thành booking
↓
API call với Bearer token
↓
Success/Fail page
```

### 3. **Token hết hạn**:
```
User đang booking
↓
API call với token hết hạn
↓
Backend trả về 401 Unauthorized
↓
Frontend clear token
↓
Redirect đến login
↓
User đăng nhập lại
↓
Redirect về booking wizard
```

## Authentication States

### 1. **Loading State**
```jsx
if (authLoading) {
  return (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <p>Đang kiểm tra xác thực...</p>
    </div>
  );
}
```

### 2. **Unauthenticated State**
```jsx
if (!user) {
  return (
    <div className="auth-required">
      <h2>🔒 Yêu cầu đăng nhập</h2>
      <p>Bạn cần đăng nhập để đặt tour.</p>
      <button onClick={() => navigate('/login')}>
        Đăng nhập
      </button>
    </div>
  );
}
```

### 3. **Authenticated State**
```jsx
// Hiển thị booking wizard bình thường
return (
  <div className="tour-booking-wizard">
    {/* Booking wizard content */}
  </div>
);
```

## API Endpoints với Authentication

### 1. **POST /api/booking**
- **Headers**: `Authorization: Bearer <token>`
- **Body**: Booking data
- **Response**: Booking confirmation

### 2. **GET /api/booking/:id**
- **Headers**: `Authorization: Bearer <token>`
- **Response**: Booking details

### 3. **GET /api/booking**
- **Headers**: `Authorization: Bearer <token>`
- **Response**: List of bookings

## Error Types & Handling

### 1. **401 Unauthorized**
- **Cause**: Token không hợp lệ hoặc hết hạn
- **Action**: Clear token, redirect đến login
- **User Experience**: Smooth transition, không mất dữ liệu

### 2. **403 Forbidden**
- **Cause**: User không có quyền truy cập
- **Action**: Hiển thị thông báo lỗi
- **User Experience**: Clear error message

### 3. **Network Errors**
- **Cause**: Không thể kết nối đến server
- **Action**: Hiển thị thông báo lỗi network
- **User Experience**: Retry option

## Security Features

### 1. **Token Storage**
- **localStorage**: Cho "Remember Me"
- **sessionStorage**: Cho session thông thường
- **Auto cleanup**: Clear token khi logout

### 2. **Token Validation**
- **Backend validation**: Server kiểm tra token
- **Frontend handling**: Xử lý response 401
- **Auto refresh**: Có thể thêm refresh token logic

### 3. **Route Protection**
- **Authentication guard**: Bảo vệ routes
- **Redirect logic**: Smooth navigation
- **State preservation**: Giữ lại booking data

## Testing Authentication

### 1. **Test Cases**
```javascript
// Test 1: Chưa đăng nhập
// - Truy cập /tour/1/booking
// - Expect: Redirect đến /login

// Test 2: Đã đăng nhập
// - Login thành công
// - Truy cập /tour/1/booking
// - Expect: Hiển thị booking wizard

// Test 3: Token hết hạn
// - Đang booking
// - API trả về 401
// - Expect: Redirect đến login

// Test 4: Booking thành công
// - Có token hợp lệ
// - Hoàn thành booking
// - Expect: Success page
```

### 2. **Manual Testing**
1. **Logout** và truy cập booking wizard
2. **Login** và thử booking
3. **Expire token** (clear localStorage) và thử booking
4. **Network error** và kiểm tra error handling

## Environment Configuration

### 1. **API Base URL**
```env
VITE_API_BASE_URL=http://localhost:8080
```

### 2. **Token Storage**
```javascript
// localStorage cho "Remember Me"
localStorage.setItem('token', token);

// sessionStorage cho session thông thường
sessionStorage.setItem('token', token);
```

## Troubleshooting

### 1. **Common Issues**
- **Token không được gửi**: Kiểm tra getAuthHeaders()
- **401 errors**: Kiểm tra token format và expiry
- **Redirect loops**: Kiểm tra authentication guard logic
- **State loss**: Kiểm tra returnAfterLogin logic

### 2. **Debug Tips**
```javascript
// Debug token
console.log('Token:', localStorage.getItem('token'));

// Debug headers
console.log('Headers:', getAuthHeaders());

// Debug API response
console.log('Response status:', response.status);
```

## Future Enhancements

### 1. **Planned Features**
- [ ] **Refresh token** mechanism
- [ ] **Token expiry** warning
- [ ] **Auto-logout** on inactivity
- [ ] **Multi-tab** synchronization
- [ ] **Offline** token validation

### 2. **Security Improvements**
- [ ] **JWT** token validation
- [ ] **CSRF** protection
- [ ] **Rate limiting** handling
- [ ] **Audit logging**

## Support

### Contact Information:
- **Technical Issues**: Check console logs
- **Authentication Problems**: Verify token format
- **API Errors**: Check network tab in DevTools

### Common Solutions:
1. **Clear browser storage** and re-login
2. **Check network connectivity**
3. **Verify API endpoint** configuration
4. **Check token expiry** time

---

**Lưu ý**: Authentication đã được tích hợp hoàn toàn và sẵn sàng sử dụng trong production. Tất cả API calls đều có Bearer token và xử lý lỗi authentication đầy đủ.
