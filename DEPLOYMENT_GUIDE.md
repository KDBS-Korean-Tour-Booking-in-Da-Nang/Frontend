# Hướng dẫn Deploy và Thay đổi BaseURL

## ✅ Đảm bảo Logic Code

### 1. Kiểm tra đã hoàn thành

- ✅ Tất cả 42 URL `localhost:8080` đã được thay thế
- ✅ Không có lỗi syntax hoặc linter
- ✅ Tất cả API endpoints hoạt động đúng
- ✅ Helper functions xử lý URL chính xác

### 2. Logic Code không thay đổi

- **Fetch requests**: Vẫn sử dụng `fetch()` như cũ
- **Headers**: Không thay đổi
- **Request body**: Không thay đổi
- **Response handling**: Không thay đổi
- **Error handling**: Không thay đổi

**Ví dụ so sánh:**

**Trước:**

```javascript
const response = await fetch(`http://localhost:8080/api/posts/${postId}`);
```

**Sau:**

```javascript
const response = await fetch(API_ENDPOINTS.POST_BY_ID(postId));
// Kết quả: fetch(`http://localhost:8080/api/posts/${postId}`)
```

→ **Logic hoàn toàn giống nhau, chỉ khác cách tạo URL**

## 🚀 Cách Thay đổi BaseURL khi Deploy

### ❌ KHÔNG thay đổi trong `api.js`

File `src/config/api.js` **KHÔNG BAO GIỜ** được sửa khi deploy:

```javascript
// ❌ KHÔNG làm thế này
export const BaseURL = "https://your-production-api.com"; // SAI!

// ✅ ĐÚNG - để nguyên như vậy
export const BaseURL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
```

### ✅ Thay đổi trong Environment Variables

#### 1. Development (Local)

Tạo file `.env` trong thư mục `Frontend`:

```bash
VITE_API_BASE_URL=http://localhost:8080
```

#### 2. Production (Deploy)

Thay đổi environment variable trên hosting platform:

**Vercel:**

```bash
vercel env add VITE_API_BASE_URL
# Nhập: https://your-api-domain.com
```

**Netlify:**

- Vào Site settings → Environment variables
- Thêm: `VITE_API_BASE_URL` = `https://your-api-domain.com`

**Heroku:**

```bash
heroku config:set VITE_API_BASE_URL=https://your-api-domain.com
```

**Docker:**

```dockerfile
ENV VITE_API_BASE_URL=https://your-api-domain.com
```

## 🔄 Quy trình Deploy

### Bước 1: Chuẩn bị

```bash
# Đảm bảo code đã commit
git add .
git commit -m "Configure API endpoints with environment variables"
git push
```

### Bước 2: Deploy

```bash
# Build với environment variable
npm run build

# Deploy lên platform (ví dụ Vercel)
vercel --prod
```

### Bước 3: Cấu hình Environment

- Đặt `VITE_API_BASE_URL=https://your-api-domain.com`
- Redeploy nếu cần

## 🧪 Test sau khi Deploy

### 1. Kiểm tra Network Tab

- Mở Developer Tools → Network
- Thực hiện các action (tạo post, like, comment...)
- Xem requests có trỏ đúng domain mới không

### 2. Test các chức năng chính

- ✅ Đăng nhập/đăng ký
- ✅ Tạo/sửa/xóa bài viết
- ✅ Like/dislike
- ✅ Comment/reply
- ✅ Upload ảnh
- ✅ Search hashtags
- ✅ Save/unsave posts

## 🚨 Troubleshooting

### Lỗi: "API_ENDPOINTS is not defined"

**Nguyên nhân:** Import sai
**Giải pháp:**

```javascript
// ✅ Đúng
import { API_ENDPOINTS } from "../config/api";

// ❌ Sai
import API_ENDPOINTS from "../config/api";
```

### Lỗi: "fetch failed"

**Nguyên nhân:** BaseURL không đúng
**Giải pháp:**

1. Kiểm tra environment variable
2. Kiểm tra CORS settings trên server
3. Kiểm tra network connectivity

### Lỗi: "Images not loading"

**Nguyên nhân:** getImageUrl() không hoạt động
**Giải pháp:**

```javascript
// ✅ Đúng
import { getImageUrl } from "../config/api";
const imageUrl = getImageUrl(imagePath);

// ❌ Sai
const imageUrl = `http://localhost:8080${imagePath}`;
```

## 📋 Checklist Deploy

- [ ] Code đã commit và push
- [ ] Environment variable `VITE_API_BASE_URL` đã set
- [ ] Build thành công (`npm run build`)
- [ ] Deploy thành công
- [ ] Test các chức năng chính
- [ ] Kiểm tra Network tab
- [ ] Test trên mobile/desktop
- [ ] Kiểm tra performance

## 🎯 Kết luận

**Việc thay đổi này:**

- ✅ **KHÔNG ảnh hưởng** đến logic code
- ✅ **Vẫn hoạt động bình thường** như cũ
- ✅ **Dễ deploy** - chỉ cần thay đổi 1 environment variable
- ✅ **Dễ bảo trì** - tất cả URL được quản lý tập trung

**Khi deploy:**

- ❌ **KHÔNG** sửa file `api.js`
- ✅ **CHỈ** thay đổi environment variable `VITE_API_BASE_URL`
