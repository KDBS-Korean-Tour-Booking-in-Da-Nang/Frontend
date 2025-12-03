# Tour Booking Wizard

Tour Booking Wizard là một hệ thống đặt tour 3 bước được xây dựng cho dự án Frontend React + Vite.

## Tính năng

### 1. Kiến trúc & Routing
- **Route chính**: `/tours/:tourId` → TourDetailPage (hiển thị chi tiết tour)
- **Route booking**: `/tours/:tourId/booking` → TourBookingWizard (wizard đặt tour)
- **Nút "Đặt tour ngay"** trong TourDetailPage sẽ điều hướng đến booking wizard

### 2. Cấu trúc file
```
src/
├── contexts/
│   ├── TourBookingContext.jsx      # Context chính
│   ├── TourBookingConstants.js     # Constants và initial state
│   ├── TourBookingReducer.js       # Reducer function
│   └── TourBookingActions.js       # Action creators
├── pages/tour/
│   ├── TourBookingWizard.jsx       # Component chính
│   ├── TourBookingWizard.css       # CSS cho wizard chính
│   └── steps/
│       ├── Step1Contact.jsx        # Bước 1: Thông tin liên hệ
│       ├── Step1Contact.css        # CSS cho Step 1
│       ├── Step2Details.jsx        # Bước 2: Chi tiết tour
│       ├── Step2Details.css        # CSS cho Step 2
│       ├── Step3Review.jsx         # Bước 3: Xác nhận
│       ├── Step3Review.css         # CSS cho Step 3
│       ├── TourPreview.jsx         # Component preview tour (với API)
│       ├── TourPreviewDemo.jsx     # Component preview tour (demo data)
│       └── TourPreview.css         # CSS cho TourPreview
└── utils/
    └── priceRules.js               # Quy tắc tính giá
```

### 3. State Management
Sử dụng React Context + useReducer để quản lý state:

```javascript
booking = {
  contact: {
    fullName: '',
    address: '',
    phone: '',
    email: '',
    pickupPoint: '',
    note: ''
  },
  plan: {
    date: { day: null, month: null, year: null },
    pax: { adult: 1, child: 0, infant: 0 },
    members: {
      adult: [{ fullName: '', dob: '', gender: '', nationality: '', idNumber: '' }],
      child: [],
      infant: []
    },
    price: { adult: 0, child: 0, infant: 0, total: 0 }
  }
}
```

### 4. Các bước trong wizard

#### Step 1: Thông tin liên hệ
- **Trường bắt buộc**: Họ tên, Địa chỉ, Điện thoại, Email
- **Trường tùy chọn**: Điểm đón, Ghi chú
- **Validation**:
  - Họ tên: bắt buộc
  - Điện thoại: định dạng VN `^(0|\+84)\d{9,10}$`
  - Email: định dạng cơ bản `^\S+@\S+\.\S+$`

#### Step 2: Chi tiết tour
- **Ngày khởi hành**: 3 select Day/Month/Year
  - Không cho chọn ngày quá khứ
  - Validation ngày hợp lệ
- **Tổng số khách**: 3 loại (Người lớn/Trẻ em/Em bé)
  - Nút +/- để tăng/giảm số lượng
  - Ràng buộc: ít nhất 1 người lớn
- **Danh sách đoàn**: Form động theo số lượng
  - Mỗi người: Họ tên, Ngày sinh, Giới tính, Quốc tịch, Số ID/Passport
  - Tự động thêm/bớt hàng khi thay đổi số lượng
- **Tổng thanh toán**: Tính realtime theo priceRules

#### Step 3: Xác nhận
- **Tour Preview**: Hiển thị thông tin tour từ database (ảnh thumbnail + chi tiết)
- **Hiển thị đọc-only** toàn bộ dữ liệu từ Step 1 và 2
- **Format đẹp**: Bảng danh sách đoàn, tổng tiền VND
- **Nút**: Quay lại chỉnh sửa, Xác nhận đặt tour
- **Khi xác nhận**: Console.log dữ liệu + hiển thị toast thành công

### 5. Quy tắc giá (Frontend)
```javascript
const PRICE = {
  ADULT: 1000000,  // 1,000,000 VND
  CHILD: 700000,   // 700,000 VND
  INFANT: 200000   // 200,000 VND
};
```

### 6. UI/UX Features
- **Progress Bar**: Thanh tiến độ ở trên cùng giống business tour wizard
- **Step Cards**: Cards có thể click để chuyển step (chỉ step đã hoàn thành)
- **Responsive design**: Hoạt động tốt trên mobile và desktop
- **Form validation**: Highlight lỗi, disable nút khi chưa hợp lệ
- **State persistence**: Giữ dữ liệu khi quay lại step trước
- **Accessibility**: Labels, ARIA attributes, keyboard navigation
- **Loading states**: Spinner khi đang xử lý
- **Toast notifications**: Thông báo thành công/lỗi
- **Separate CSS files**: Mỗi step có CSS riêng để dễ maintain

### 7. Cách sử dụng

1. **Truy cập tour detail**: `/tours/123`
2. **Nhấn "Đặt tour ngay"**: Điều hướng đến `/tours/123/booking`
3. **Điền thông tin**: Lần lượt qua 3 bước
4. **Xác nhận**: Nhấn "Xác nhận đặt tour"
5. **Kết quả**: Console.log dữ liệu + toast thành công

### 8. Demo Mode
- **Không gọi API**: Toàn bộ logic chạy ở frontend
- **Console logging**: Dữ liệu booking được log ra console
- **Toast notification**: Hiển thị thông báo thành công
- **Auto redirect**: Tự động quay về tour detail sau 2 giây

### 9. Technical Notes
- **Context Provider**: Wrap toàn bộ wizard
- **Custom Hook**: `useBooking()` để truy cập state
- **Action Creators**: Tách riêng để dễ test và maintain
- **Reducer Pattern**: Quản lý state phức tạp một cách có tổ chức
- **PropTypes**: Validation props cho tất cả components
- **CSS Modules**: Styles tách riêng, dễ maintain

### 10. TourPreview Components
Có 2 component preview tour trong Step 3:

#### TourPreview.jsx (với API)
- **Kết nối API**: Lấy thông tin tour từ database thật
- **Layout**: Ảnh thumbnail bên trái, thông tin chi tiết bên phải
- **Thông tin hiển thị**: Mã tour, thời gian, điểm khởi hành, phương tiện, hình thức, lịch trình
- **Loading state**: Hiển thị spinner khi đang tải dữ liệu
- **Error handling**: Hiển thị fallback data khi API lỗi
- **Memory management**: Cleanup khi component unmount để tránh memory leaks

#### TourPreviewDemo.jsx (demo data)
- **Dữ liệu mẫu**: Hiển thị thông tin tour cố định
- **Không gọi API**: Tránh lỗi kết nối và infinite loading
- **Layout**: Giống TourPreview.jsx
- **Sử dụng**: Khi API không hoạt động hoặc demo

### 11. Mở rộng trong tương lai
- **API Integration**: Kết nối với backend thực tế
- **Payment Gateway**: Tích hợp thanh toán
- **Email Confirmation**: Gửi email xác nhận
- **Booking History**: Lưu lịch sử đặt tour
- **Multi-language**: Hỗ trợ đa ngôn ngữ
- **Advanced Validation**: Validation phức tạp hơn
- **File Upload**: Upload giấy tờ tùy thân

## Cài đặt và chạy

1. **Cài đặt dependencies**:
   ```bash
   cd Frontend
   npm install
   ```

2. **Chạy development server**:
   ```bash
   npm start
   ```

3. **Truy cập**: `http://localhost:3000/tours/1` để xem tour detail
4. **Test booking**: Nhấn "Đặt tour ngay" để vào wizard

## Lưu ý
- Đây là demo frontend, không có kết nối API thực tế
- Tất cả dữ liệu được lưu trong memory, refresh trang sẽ mất
- Console.log sẽ hiển thị dữ liệu booking khi xác nhận
- Toast notification sử dụng ToastContext có sẵn trong dự án
