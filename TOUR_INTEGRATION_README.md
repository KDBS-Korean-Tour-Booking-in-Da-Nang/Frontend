# Tour Integration Guide

## Tổng quan

Đã tích hợp thành công frontend tour pages với backend API để fetch dữ liệu tour thật từ database.

## Những thay đổi đã thực hiện

### Backend

1. **Cập nhật TourResponse.java**
   - Thêm field `id` để map với `tourId` từ entity
   - Cập nhật TourMapper để map `tourId` sang `id`

### Frontend

1. **Cập nhật API Configuration**

   - Thêm tour endpoints vào `api.js`
   - `TOURS: ${BaseURL}/api/tour` - GET all tours
   - `TOUR_BY_ID: (id) => ${BaseURL}/api/tour/${id}` - GET tour by ID

2. **Tạo hook mới useToursAPI.js**

   - Hook để fetch tour data từ backend API
   - Transform backend data để match với frontend format
   - Map tour type sang category (domestic, international, day-tour)
   - Xử lý loading và error states

3. **Cập nhật TourList.jsx**

   - Sử dụng `useToursAPI` thay vì `useTours` (Redux)
   - Fetch tours từ API khi component mount
   - Filter và search tours locally
   - Giữ nguyên UI/UX như cũ

4. **Cập nhật TourDetailPage.jsx**

   - Sử dụng `useToursAPI` để fetch tour detail
   - Load tour data khi component mount
   - Xử lý loading và error states
   - Giữ nguyên UI/UX như cũ

5. **Thêm CSS cho error state**
   - Styling cho error message
   - Button để retry hoặc quay lại

## Cách test

### 1. Khởi động Backend

```bash
cd Backend
mvn spring-boot:run
```

Backend sẽ chạy tại: http://localhost:8080

### 2. Khởi động Frontend

```bash
cd Frontend
npm start
```

Frontend sẽ chạy tại: http://localhost:3000

### 3. Test các tính năng

1. **Tour List Page** (`/tour`)

   - Xem danh sách tour từ database
   - Filter theo category (Tất cả, Trong nước, Nước ngoài, Trong ngày)
   - Search tour theo tên, mô tả, điểm khởi hành
   - Click vào tour để xem chi tiết

2. **Tour Detail Page** (`/tour/:id`)
   - Xem chi tiết tour từ database
   - Hiển thị thông tin đầy đủ: tên, mô tả, giá, lịch trình, etc.
   - Xử lý loading state khi đang fetch data
   - Xử lý error state nếu không tìm thấy tour

## Lưu ý

- API không yêu cầu authentication cho GET requests
- Chỉ hiển thị tours có status APPROVED
- Dữ liệu được transform để match với format cũ của frontend
- UI/UX giữ nguyên như thiết kế ban đầu
- Không thay đổi logic code cũ, chỉ thêm hook mới

## Troubleshooting

1. **Lỗi CORS**: Đảm bảo backend có `@CrossOrigin("*")` annotation
2. **Lỗi 404**: Kiểm tra API endpoints có đúng không
3. **Lỗi kết nối**: Đảm bảo backend đang chạy tại port 8080
4. **Không có data**: Kiểm tra database có tour data không

## API Endpoints

- `GET /api/tour` - Lấy tất cả tours
- `GET /api/tour/{id}` - Lấy tour theo ID
