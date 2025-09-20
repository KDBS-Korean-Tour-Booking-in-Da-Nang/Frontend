# Success & Fail Pages for Tour Booking

## Tổng quan

Đã tạo 2 trang riêng biệt để xử lý kết quả booking tour:

- **SuccessPage**: Hiển thị khi booking thành công
- **FailPage**: Hiển thị khi booking thất bại

## Cấu trúc Files

### 1. SuccessPage
- **`src/components/SuccessPage/SuccessPage.jsx`**: Component chính
- **`src/components/SuccessPage/SuccessPage.css`**: Styling

### 2. FailPage
- **`src/components/FailPage/FailPage.jsx`**: Component chính
- **`src/components/FailPage/FailPage.css`**: Styling

### 3. Routing
- **`src/App.jsx`**: Đã thêm routes:
  - `/booking/success` → SuccessPage
  - `/booking/fail` → FailPage

## SuccessPage Features

### 🎉 Thông tin hiển thị:
- **Icon thành công** với animation
- **Thông tin booking** chi tiết:
  - Mã đặt tour
  - Tên tour
  - Ngày khởi hành
  - Tổng số khách (người lớn, trẻ em, em bé)
  - Thông tin liên hệ
  - Thời gian đặt
- **Danh sách khách** trong bảng
- **Thông tin hỗ trợ** (email, hotline)

### 🔄 Chức năng:
- **Auto redirect** sau 5 giây về trang tour
- **Nút "Xem chi tiết tour"** → về trang tour detail
- **Nút "Về trang chủ"** → về homepage
- **Countdown timer** hiển thị thời gian còn lại

### 📱 Responsive:
- Mobile-friendly design
- Grid layout tự động điều chỉnh
- Table responsive với horizontal scroll

## FailPage Features

### ❌ Thông tin hiển thị:
- **Icon lỗi** với animation shake
- **Phân loại lỗi** tự động:
  - Network errors (🌐)
  - Validation errors (📝)
  - Server errors (🔧)
  - Timeout errors (⏰)
  - General errors (❌)
- **Chi tiết lỗi** từ API
- **Gợi ý khắc phục** theo từng loại lỗi

### 🔄 Chức năng:
- **Nút "Thử lại"** → quay lại booking wizard
- **Nút "Xem tour"** → về trang tour detail
- **Nút "Về trang chủ"** → về homepage
- **Nút "Email hỗ trợ"** → mở email client
- **Nút "Hotline"** → gọi điện thoại
- **Auto redirect** sau 10 giây về trang tour

### 🛠️ Development Features:
- **Technical details** (chỉ hiển thị trong development)
- **Error stack trace** để debug
- **JSON error data** format

## Data Flow

### Success Flow:
```
TourBookingWizard → API Success → SuccessPage
```

**Data passed:**
```javascript
navigate('/booking/success', {
  state: {
    bookingData: result,  // API response
    tourId: tourId        // Tour ID
  }
});
```

### Fail Flow:
```
TourBookingWizard → API Error → FailPage
```

**Data passed:**
```javascript
navigate('/booking/fail', {
  state: {
    error: error.message,  // Error message
    tourId: tourId         // Tour ID
  }
});
```

## Error Types & Handling

### 1. Network Errors
- **Icon**: 🌐
- **Title**: "Lỗi kết nối mạng"
- **Suggestions**: Kiểm tra internet, thử lại, liên hệ hỗ trợ

### 2. Validation Errors
- **Icon**: 📝
- **Title**: "Lỗi thông tin nhập liệu"
- **Suggestions**: Kiểm tra thông tin, định dạng email/phone

### 3. Server Errors
- **Icon**: 🔧
- **Title**: "Lỗi hệ thống"
- **Suggestions**: Thử lại sau 5-10 phút, kiểm tra trạng thái hệ thống

### 4. Timeout Errors
- **Icon**: ⏰
- **Title**: "Hết thời gian chờ"
- **Suggestions**: Kết nối ổn định hơn, thử lại

### 5. General Errors
- **Icon**: ❌
- **Title**: "Đặt tour thất bại"
- **Suggestions**: Thử lại, kiểm tra thông tin, liên hệ hỗ trợ

## Styling Features

### SuccessPage:
- **Gradient background**: Green theme
- **Success icon**: Animated checkmark
- **Card layout**: Clean, professional
- **Color scheme**: Green (#10b981)

### FailPage:
- **Gradient background**: Red theme
- **Error icon**: Animated shake
- **Card layout**: Clean, professional
- **Color scheme**: Red (#ef4444)

### Common Features:
- **Responsive design**: Mobile-first
- **Smooth animations**: fadeInUp, bounceIn, shake
- **Modern UI**: Rounded corners, shadows, gradients
- **Accessibility**: Proper contrast, focus states

## Usage Examples

### 1. Direct Navigation (for testing):
```javascript
// Success page
navigate('/booking/success', {
  state: {
    bookingData: {
      bookingId: 1,
      tourName: 'Tour Hàn Quốc 5N4Đ',
      departureDate: '2024-02-15',
      totalGuests: 3,
      contactName: 'Nguyễn Văn A',
      // ... other data
    },
    tourId: 1
  }
});

// Fail page
navigate('/booking/fail', {
  state: {
    error: 'Network error: Failed to fetch',
    tourId: 1
  }
});
```

### 2. Integration with TourBookingWizard:
```javascript
// Success case
const result = await createBookingAPI(bookingData);
navigate('/booking/success', {
  state: { bookingData: result, tourId }
});

// Error case
catch (error) {
  navigate('/booking/fail', {
    state: { error: error.message, tourId }
  });
}
```

## Testing

### 1. Manual Testing:
1. **Success flow**: Complete booking → should redirect to SuccessPage
2. **Fail flow**: Cause API error → should redirect to FailPage
3. **Navigation**: Test all buttons and links
4. **Responsive**: Test on mobile/tablet/desktop

### 2. Error Simulation:
```javascript
// Simulate different error types
const errors = [
  'Network error: Failed to fetch',
  'Validation failed: Email is required',
  'Server error: Internal server error',
  'Request timeout',
  'Unknown error occurred'
];
```

## Future Enhancements

### Planned Features:
- [ ] **PDF download** for booking confirmation
- [ ] **Email sharing** functionality
- [ ] **Social media sharing**
- [ ] **Booking history** integration
- [ ] **Payment integration** status
- [ ] **Real-time notifications**

### Technical Improvements:
- [ ] **Error logging** to external service
- [ ] **Analytics tracking** for success/fail rates
- [ ] **A/B testing** for different layouts
- [ ] **Performance optimization**
- [ ] **SEO optimization**

## Support

### Contact Information:
- **Email**: support@example.com
- **Hotline**: 1900-xxxx
- **Business Hours**: 8:00 AM - 10:00 PM (GMT+7)

### Troubleshooting:
1. **Page not loading**: Check routing configuration
2. **Data not displaying**: Verify state data structure
3. **Styling issues**: Check CSS imports
4. **Navigation problems**: Verify route paths

---

**Lưu ý**: Các trang này đã được tích hợp hoàn toàn với TourBookingWizard và sẵn sàng sử dụng trong production.
