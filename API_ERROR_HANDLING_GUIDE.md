# HƯỚNG DẪN XỬ LÝ 401 ERROR CHO API CALLS MỚI

## ✅ Đảm bảo Frontend không tự động logout khi chưa tới 60 phút

**Logic hiện tại:**
- **Inactivity Timer**: 60 phút (3,600,000ms) - CHỈ áp dụng cho non-remember sessions
- **Remember Me**: Không có inactivity timer, chỉ có expiry 14 ngày
- **Timer Reset**: Mỗi khi có user activity (mousemove, keydown, click, touchstart), timer được reset về 60 phút
- **API Calls**: KHÔNG reset inactivity timer (chỉ user activity mới reset)

**Kết luận:** ✅ Frontend sẽ KHÔNG tự động logout khi chưa tới 60 phút, trừ khi:
1. Token hết hạn từ backend (401 response)
2. User không hoạt động 60 phút (non-remember session)
3. Remember me session hết hạn sau 14 ngày

---

## 📝 Cách xử lý 401 cho API calls mới

### **Bước 1: Import apiErrorHandler**

```javascript
import { checkAndHandle401 } from '../../utils/apiErrorHandler';
// hoặc
import { checkAndHandle401, handleApiError } from '../../../utils/apiErrorHandler';
// (tùy vào vị trí file của bạn)
```

### **Bước 2: Xử lý 401 trong fetch calls**

Có **3 cách** để xử lý 401:

---

## **CÁCH 1: Sử dụng `checkAndHandle401` (KHUYẾN NGHỊ)**

**Dùng cho:** Các fetch calls trực tiếp trong components/pages

```javascript
const fetchData = async () => {
  try {
    const token = getToken(); // hoặc từ localStorage/sessionStorage
    const headers = createAuthHeaders(token);
    
    const response = await fetch(API_ENDPOINTS.YOUR_ENDPOINT, { 
      headers 
    });
    
    // ✅ Xử lý 401 TRƯỚC khi check response.ok
    if (response.status === 401) {
      await checkAndHandle401(response);
      return; // hoặc throw error, tùy logic của bạn
    }
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    // Xử lý data...
  } catch (error) {
    console.error('Error fetching data:', error);
  }
};
```

---

## **CÁCH 2: Sử dụng `handleApiError`**

**Dùng cho:** Khi muốn xử lý nhiều loại error (401, 403, 404, 500)

```javascript
const fetchData = async () => {
  try {
    const token = getToken();
    const headers = createAuthHeaders(token);
    
    const response = await fetch(API_ENDPOINTS.YOUR_ENDPOINT, { 
      headers 
    });
    
    if (!response.ok) {
      // ✅ Xử lý tất cả errors (401, 403, 404, 500)
      const error = await handleApiError(response);
      throw error;
    }
    
    const data = await response.json();
    // Xử lý data...
  } catch (error) {
    console.error('Error fetching data:', error);
  }
};
```

---

## **CÁCH 3: Sử dụng `authenticatedFetch` wrapper**

**Dùng cho:** Các API calls đơn giản, muốn tự động xử lý 401

```javascript
import { authenticatedFetch } from '../../utils/apiErrorHandler';

const fetchData = async () => {
  try {
    const token = getToken();
    const headers = createAuthHeaders(token);
    
    // ✅ authenticatedFetch tự động xử lý 401
    const response = await authenticatedFetch(API_ENDPOINTS.YOUR_ENDPOINT, { 
      headers 
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    // Xử lý data...
  } catch (error) {
    console.error('Error fetching data:', error);
  }
};
```

---

## 📋 Template mẫu cho các trường hợp phổ biến

### **1. Fetch trong Component/Page**

```javascript
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { API_ENDPOINTS, createAuthHeaders } from '../../config/api';
import { checkAndHandle401 } from '../../utils/apiErrorHandler';

const YourComponent = () => {
  const { getToken } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = getToken();
      if (!token) {
        setError('Vui lòng đăng nhập lại');
        return;
      }

      const headers = createAuthHeaders(token);
      const response = await fetch(API_ENDPOINTS.YOUR_ENDPOINT, { 
        headers 
      });
      
      // ✅ Xử lý 401
      if (response.status === 401) {
        await checkAndHandle401(response);
        setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        return;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Không thể tải dữ liệu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ... rest of component
};
```

### **2. POST/PUT/DELETE Request**

```javascript
const handleSubmit = async (formData) => {
  try {
    const token = getToken();
    if (!token) {
      showError('Vui lòng đăng nhập lại');
      return;
    }

    const headers = createAuthHeaders(token);
    const response = await fetch(API_ENDPOINTS.YOUR_ENDPOINT, {
      method: 'POST', // hoặc PUT, DELETE
      headers,
      body: JSON.stringify(formData)
    });

    // ✅ Xử lý 401
    if (response.status === 401) {
      await checkAndHandle401(response);
      showError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      return;
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Không thể thực hiện yêu cầu');
    }

    const result = await response.json();
    showSuccess('Thành công!');
    // Xử lý result...
  } catch (err) {
    console.error('Error:', err);
    showError(err.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
  }
};
```

### **3. Trong Service Files**

```javascript
// services/yourService.js
import { checkAndHandle401 } from '../utils/apiErrorHandler';
import { API_ENDPOINTS, createAuthHeaders } from '../config/api';

export const yourServiceFunction = async (token, params) => {
  const headers = createAuthHeaders(token);
  
  const response = await fetch(`${API_ENDPOINTS.YOUR_ENDPOINT}?${new URLSearchParams(params)}`, {
    headers
  });

  // ✅ Xử lý 401
  if (response.status === 401) {
    await checkAndHandle401(response);
    throw new Error('Session expired. Please login again.');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  return await response.json();
};
```

### **4. Polling/Interval API Calls**

```javascript
useEffect(() => {
  const fetchData = async () => {
    try {
      const token = getToken();
      if (!token) return;

      const headers = createAuthHeaders(token);
      const response = await fetch(API_ENDPOINTS.YOUR_ENDPOINT, { headers });

      // ✅ Xử lý 401 - QUAN TRỌNG cho polling
      if (response.status === 401) {
        await checkAndHandle401(response);
        // Dừng interval nếu 401
        if (intervalId) clearInterval(intervalId);
        return;
      }

      if (response.ok) {
        const data = await response.json();
        // Xử lý data...
      }
    } catch (error) {
      console.error('Error in polling:', error);
    }
  };

  fetchData(); // Fetch ngay lập tức
  const intervalId = setInterval(fetchData, 30000); // Poll mỗi 30 giây

  return () => clearInterval(intervalId);
}, []);
```

---

## ⚠️ Lưu ý quan trọng

1. **Luôn xử lý 401 TRƯỚC khi check `response.ok`**
   ```javascript
   // ✅ ĐÚNG
   if (response.status === 401) {
     await checkAndHandle401(response);
     return;
   }
   if (!response.ok) { ... }

   // ❌ SAI
   if (!response.ok) {
     if (response.status === 401) { ... } // Quá muộn!
   }
   ```

2. **Không cần reset inactivity timer** - API calls không ảnh hưởng đến inactivity timer

3. **Return sớm sau khi xử lý 401** - Tránh xử lý data khi đã logout

4. **Polling calls** - Đặc biệt quan trọng phải xử lý 401 để tránh logout liên tục

---

## 🔍 Checklist khi thêm API call mới

- [ ] Import `checkAndHandle401` hoặc `handleApiError`
- [ ] Check `response.status === 401` TRƯỚC `response.ok`
- [ ] Gọi `await checkAndHandle401(response)` khi 401
- [ ] Return sớm sau khi xử lý 401
- [ ] Test với token hết hạn để đảm bảo logout đúng cách

---

## 📚 Ví dụ thực tế từ codebase

Xem các file sau để tham khảo:
- `Frontend/src/pages/admin/CompanyManagement/CompanyManagement.jsx`
- `Frontend/src/pages/staff/TaskManagement/TaskManagement.jsx`
- `Frontend/src/services/bookingAPI.js`
- `Frontend/src/pages/forum/forum.jsx`

---

**Cập nhật:** $(date)
**Phiên bản:** 1.0

