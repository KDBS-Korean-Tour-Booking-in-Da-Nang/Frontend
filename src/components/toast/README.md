# Toast Notification Component

Component thông báo toast toàn cục có thể sử dụng trên tất cả các trang.

## Cách sử dụng

### 1. Import hook useToast
```javascript
import { useToast } from '../../../contexts/ToastContext';
```

### 2. Sử dụng trong component
```javascript
const { showError, showSuccess, showWarning, showInfo } = useToast();

// Hiển thị thông báo lỗi
showError('Có lỗi xảy ra!');

// Hiển thị thông báo thành công
showSuccess('Thao tác thành công!');

// Hiển thị thông báo cảnh báo
showWarning('Vui lòng kiểm tra lại thông tin');

// Hiển thị thông báo thông tin
showInfo('Thông tin quan trọng');
```

### 3. Tùy chỉnh thời gian hiển thị
```javascript
showError('Lỗi sẽ tự động ẩn sau 3 giây', 3000);
showSuccess('Thành công - ẩn sau 2 giây', 2000);
```

## Các loại thông báo

- **error**: Thông báo lỗi (màu đỏ)
- **success**: Thông báo thành công (màu xanh lá)
- **warning**: Thông báo cảnh báo (màu vàng)
- **info**: Thông báo thông tin (màu xanh dương)

## Tính năng

- ✅ Hiển thị ở góc phải trên cùng
- ✅ Tự động ẩn sau thời gian chỉ định
- ✅ Có thể đóng thủ công bằng nút X
- ✅ Hiệu ứng animation mượt mà
- ✅ Thanh tiến trình đếm ngược
- ✅ Responsive trên mobile
- ✅ Hỗ trợ hiển thị nhiều toast cùng lúc
- ✅ Z-index cao để luôn hiển thị trên cùng

## Ví dụ thực tế

```javascript
// Trong form submit
try {
  const response = await fetch('/api/users/register', {
    method: 'POST',
    body: JSON.stringify(formData)
  });
  
  if (response.ok) {
    showSuccess('Đăng ký thành công!');
    navigate('/login');
  } else {
    showError('Đăng ký thất bại. Vui lòng thử lại.');
  }
} catch (error) {
  showError('Có lỗi xảy ra. Vui lòng kiểm tra kết nối mạng.');
}
```
