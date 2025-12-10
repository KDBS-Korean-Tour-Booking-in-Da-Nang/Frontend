## Hướng dẫn nhanh Frontend (Vite + React 19)

Tài liệu này giúp bạn chạy, kiểm thử và nắm cấu trúc chính của ứng dụng du lịch đa vai trò (User / Company / Admin / Staff) với thanh toán Toss, diễn đàn, đặt tour, quản trị và chatbot Coze.

### Yêu cầu & cài đặt

- Node.js LTS (>=18).
- Cài phụ thuộc: `npm i --legacy-peer-deps`
- Chạy dev: `npm start` (ưu tiên dùng lệnh này thay vì `npm run dev`).
- Build: `npm run build`
- Preview build: `npm run preview`
- Kiểm thử:
  - Chạy một lần: `npm test`
  - Watch: `npm test:watch`
- Kiểm tra lint: `npm run lint`

### Cấu trúc thư mục chính

- `src/main.jsx`: Điểm vào, khởi tạo i18n và render `App`.
- `src/App.jsx`: Khai báo router, guard điều hướng, hiển thị Navbar/Footer, gắn CozeChat và toast.
- `src/contexts/`: Context cho Auth, Chat, Notification, Toast, đặt tour (TourBooking), Wizard.
- `src/components/`: Navbar/Footer, CozeChat, SupportTicketBubble, toast, tooltip, modals dùng chung (ưu tiên đặt modal tái sử dụng ở đây), widget thanh toán Toss.
- `src/pages/`: Các trang chức năng (auth, tour, company dashboard, admin/staff, forum, payment, user profile...).
- `src/services/`: Gọi API (axios), WebSocket, payment, chat, notification.
- `src/store/`: Redux store + slice đặt tour / voucher.
- `src/i18n/` & `src/locales/`: Khởi tạo và gói đa ngôn ngữ (en/ko/vi).
- `public/`: Tài nguyên tĩnh, fonts, hình ảnh, data bản đồ.

### Biến môi trường phổ biến

Tạo file `.env` (hoặc `.env.local`) tại `Frontend/`:

- `VITE_API_BASE_URL` — URL backend (mặc định `http://localhost:8080`).
- `VITE_TOSS_CLIENT_KEY` — khóa public của Toss.
- `VITE_TOSS_CURRENCY` — mã tiền tệ (mặc định `KRW`).
- `VITE_CDN_BASE_URL` — nếu cần override đường dẫn tài nguyên.

### Quy ước & lưu ý

- Điều hướng qua `react-router-dom@7` (Router bọc trong `App.jsx`).
- State toàn cục dùng Redux Toolkit kết hợp Context cho các miền nghiệp vụ (auth, toast, chat, notification, đặt tour).
- Modals tái sử dụng đặt tại `src/components/modals/` để dùng lại giữa các trang.
- API/axios cấu hình tại `src/config/api.js`; xử lý lỗi chung trong `src/utils/apiErrorHandler.js` (đã nối `navigate` để redirect khi 401/403).
- i18n cần khởi tạo sớm (đã import trong `main.jsx`).

### Chức năng chính theo khu vực

- Auth: đăng ký/đăng nhập/SSO (Google/Naver), quên mật khẩu, xác thực email, chặn truy cập theo role/status.
- Tour & Booking: xem danh sách/chi tiết tour, wizard đặt tour, quản lý booking, lịch sử đặt tour, voucher, đánh giá.
- Payment: tích hợp Toss, trang kiểm tra thanh toán và trang kết quả `/transaction-result`.
- Company: dashboard, quản lý tour, booking, wizard tạo tour, quản lý voucher, upload hồ sơ, trạng thái phê duyệt.
- Admin/Staff: dashboard, phê duyệt, quản lý người dùng/bài viết/tour/booking, truy cập forum ở chế độ nhân sự.
- Forum/Article: bài viết, bình luận, hover card người dùng, tương tác real-time nhẹ (notifications).
- Notification & Chat: WebSocket notification badge/dropdown; CozeChat hiển thị cho USER/COMPANY/GUEST, ẩn với ADMIN/STAFF.
- Support: SupportTicketBubble, toast/tooltip, weather widget, bản đồ.
- Đa ngôn ngữ: en/ko/vi, cấu hình tại `src/i18n` và `src/locales`.

### Luồng thanh toán Toss (tóm tắt)

1. Trang `BookingCheckPaymentPage` gọi `paymentService.createOrder` để lấy `orderId` + secret.
2. `TossWidgetContainer` mount widget với `clientKey` và đẩy user tới form thanh toán.
3. Toss redirect về backend, sau đó backend redirect lại FE `/transaction-result?orderId=...&status=...` để hiển thị kết quả trong `PaymentResultPage`.
4. Kiểm thử: xem `src/services/__tests__/` và `src/pages/payment/__tests__/`.

### Câu lệnh thường dùng

- `npm start` — chạy dev server.
- `npm test` — chạy bộ kiểm thử Vitest.
- `npm run lint` — kiểm tra lint toàn bộ mã nguồn.

### Hỗ trợ

Nếu gặp lỗi trong quá trình khởi chạy hoặc thanh toán, kiểm tra lại biến môi trường, console trình duyệt và log mạng; gửi kèm request/response để tiện xử lý.
