# Tour Booking API Integration

## Tổng quan

Chức năng booking tour đã được tích hợp hoàn toàn với API backend. Hệ thống hiện tại hỗ trợ:

- ✅ Tạo booking mới qua API `/api/booking` (POST)
- ✅ Validation dữ liệu trước khi gửi API
- ✅ Loading states và error handling
- ✅ Hiển thị thông tin booking sau khi thành công
- ✅ Format dữ liệu theo đúng chuẩn backend

## Cấu trúc Files

### 1. API Service
- **`src/services/bookingAPI.js`**: Service để gọi API booking
  - `createBooking(bookingData)`: Tạo booking mới
  - `getBookingById(bookingId)`: Lấy thông tin booking theo ID
  - `getAllBookings()`: Lấy danh sách tất cả booking

### 2. Custom Hook
- **`src/hooks/useBookingAPI.js`**: Hook để quản lý API calls
  - `loading`: Trạng thái loading
  - `error`: Lỗi từ API
  - `createBookingAPI()`: Function tạo booking
  - `fetchBookingById()`: Function lấy booking theo ID
  - `fetchAllBookings()`: Function lấy tất cả booking

### 3. Data Formatting
- **`src/utils/bookingFormatter.js`**: Utility functions để format dữ liệu
  - `formatGender()`: Format giới tính (male → MALE)
  - `formatGuestType()`: Format loại khách (adult → ADULT)
  - `formatDate()`: Format ngày tháng
  - `formatNationality()`: Format quốc tịch
  - `formatBookingData()`: Format toàn bộ dữ liệu booking
  - `validateBookingData()`: Validate dữ liệu trước khi gửi

### 4. Context Updates
- **`src/contexts/TourBookingContext.jsx`**: Đã được cập nhật với:
  - `booking.loading`: Trạng thái loading
  - `booking.error`: Lỗi từ API
  - `booking.success`: Trạng thái thành công
  - `booking.bookingData`: Dữ liệu booking từ API
  - `setBookingLoading()`: Set loading state
  - `setBookingError()`: Set error state
  - `setBookingSuccess()`: Set success state
  - `clearBookingStatus()`: Clear tất cả booking status

## API Request/Response Format

### Request Format (POST /api/booking)
```json
{
  "tourId": 1,
  "contactName": "Nguyễn Văn A",
  "contactAddress": "123 Đường ABC, Quận 1, TP.HCM",
  "contactPhone": "0123456789",
  "contactEmail": "nguyenvana@email.com",
  "pickupPoint": "Khách sạn ABC",
  "note": "Yêu cầu đặc biệt",
  "departureDate": "2024-02-15",
  "adultsCount": 2,
  "childrenCount": 1,
  "babiesCount": 0,
  "guests": [
    {
      "fullName": "Nguyễn Văn A",
      "birthDate": "1990-01-01",
      "gender": "MALE",
      "idNumber": "123456789",
      "nationality": "Vietnamese",
      "guestType": "ADULT"
    }
  ]
}
```

### Response Format
```json
{
  "bookingId": 1,
  "tourId": 1,
  "tourName": "Tour Hàn Quốc 5N4Đ",
  "contactName": "Nguyễn Văn A",
  "contactAddress": "123 Đường ABC, Quận 1, TP.HCM",
  "contactPhone": "0123456789",
  "contactEmail": "nguyenvana@email.com",
  "pickupPoint": "Khách sạn ABC",
  "note": "Yêu cầu đặc biệt",
  "departureDate": "2024-02-15",
  "adultsCount": 2,
  "childrenCount": 1,
  "babiesCount": 0,
  "totalGuests": 3,
  "createdAt": "2024-01-17T10:30:00",
  "guests": [
    {
      "guestId": 1,
      "fullName": "Nguyễn Văn A",
      "birthDate": "1990-01-01",
      "gender": "MALE",
      "idNumber": "123456789",
      "nationality": "Vietnamese",
      "guestType": "ADULT"
    }
  ]
}
```

## Workflow Booking

### 1. User Flow
1. **Step 1**: Nhập thông tin liên hệ
2. **Step 2**: Chọn ngày khởi hành và thông tin đoàn
3. **Step 3**: Xem lại thông tin và xác nhận
4. **API Call**: Gửi dữ liệu đến backend
5. **Success**: Hiển thị thông tin booking thành công

### 2. Technical Flow
1. **Validation**: Kiểm tra dữ liệu trước khi gửi
2. **Format**: Chuyển đổi dữ liệu frontend → backend format
3. **API Call**: Gọi `createBookingAPI()`
4. **Loading State**: Hiển thị loading spinner
5. **Response**: Xử lý response từ API
6. **Success/Error**: Hiển thị kết quả tương ứng

## Error Handling

### 1. Validation Errors
- Thiếu thông tin bắt buộc
- Ngày khởi hành trong quá khứ
- Số lượng khách không hợp lệ
- Thông tin khách không đầy đủ

### 2. API Errors
- Network errors
- Server errors (500, 400, etc.)
- Authentication errors
- Business logic errors

### 3. User Experience
- Loading states với spinner
- Error messages rõ ràng
- Toast notifications
- Retry mechanisms

## Environment Configuration

### API Base URL
```javascript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
```

### Environment Variables
```env
VITE_API_BASE_URL=http://localhost:8080
```

## Testing

### 1. Manual Testing
1. Điền đầy đủ thông tin booking
2. Kiểm tra validation
3. Test API call với backend
4. Verify success/error states

### 2. API Testing
```bash
# Test với curl
curl -X POST http://localhost:8080/api/booking \
  -H "Content-Type: application/json" \
  -d '{
    "tourId": 1,
    "contactName": "Test User",
    "contactAddress": "Test Address",
    "contactPhone": "0123456789",
    "contactEmail": "test@email.com",
    "departureDate": "2024-12-31",
    "adultsCount": 1,
    "childrenCount": 0,
    "babiesCount": 0,
    "guests": [{
      "fullName": "Test User",
      "birthDate": "1990-01-01",
      "gender": "MALE",
      "nationality": "Vietnamese",
      "guestType": "ADULT"
    }]
  }'
```

## Troubleshooting

### 1. Common Issues
- **CORS errors**: Kiểm tra backend CORS configuration
- **Network errors**: Kiểm tra API_BASE_URL
- **Validation errors**: Kiểm tra dữ liệu input
- **Format errors**: Kiểm tra bookingFormatter functions

### 2. Debug Tips
- Check browser console for errors
- Verify API endpoint is accessible
- Test with Postman/curl first
- Check network tab in DevTools

## Future Enhancements

### 1. Planned Features
- [ ] Booking history page
- [ ] Booking management (edit/cancel)
- [ ] Payment integration
- [ ] Email notifications
- [ ] PDF booking confirmation

### 2. Technical Improvements
- [ ] Caching strategies
- [ ] Offline support
- [ ] Real-time updates
- [ ] Advanced error recovery
- [ ] Performance optimizations

## Support

Nếu gặp vấn đề với chức năng booking:

1. Kiểm tra console logs
2. Verify API connectivity
3. Check data validation
4. Review error messages
5. Test với dữ liệu mẫu

---

**Lưu ý**: Chức năng này đã được tích hợp hoàn toàn với backend API và sẵn sàng sử dụng trong production.
