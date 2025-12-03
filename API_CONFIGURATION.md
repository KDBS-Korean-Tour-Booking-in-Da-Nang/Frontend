# API Configuration Guide

## Tổng quan

Dự án đã được cấu hình để sử dụng biến môi trường `VITE_API_BASE_URL` thay vì hardcode `localhost:8080`. Điều này giúp dễ dàng deploy và quản lý URL API.

## Cấu hình

### 1. File cấu hình chính

- `src/config/api.js`: Chứa tất cả các endpoint API và helper functions
- `env.example`: File mẫu cho biến môi trường

### 2. Biến môi trường

Tạo file `.env` trong thư mục `Frontend` với nội dung:

```
VITE_API_BASE_URL=http://localhost:8080
```

### 3. Khi deploy

Thay đổi `VITE_API_BASE_URL` thành URL server thực tế:

```
VITE_API_BASE_URL=https://your-api-domain.com
```

## Cách sử dụng

### Import API endpoints

```javascript
import {
  BaseURL,
  API_ENDPOINTS,
  getAvatarUrl,
  getImageUrl,
} from "../config/api";
```

### Sử dụng endpoints

```javascript
// Thay vì: fetch('http://localhost:8080/api/posts')
fetch(API_ENDPOINTS.POSTS);

// Thay vì: fetch(`http://localhost:8080/api/posts/${id}`)
fetch(API_ENDPOINTS.POST_BY_ID(id));
```

### Helper functions

```javascript
// Xử lý avatar URLs
const avatarUrl = getAvatarUrl(user.avatar);

// Xử lý image URLs
const imageUrl = getImageUrl(imagePath);
```

## Lợi ích

1. **Dễ deploy**: Chỉ cần thay đổi 1 biến môi trường
2. **Bảo trì dễ dàng**: Tất cả API endpoints được quản lý tập trung
3. **Tái sử dụng**: Helper functions cho avatar và image URLs
4. **Type safety**: Có thể dễ dàng thêm TypeScript sau này

## Các file đã được cập nhật

- `src/config/api.js` (mới)
- `vite.config.js`
- `src/pages/home/forum/forum.jsx`
- `src/pages/home/forum/components/PostCard/PostCard.jsx`
- `src/pages/home/forum/components/CommentSection/CommentSection.jsx`
- `src/pages/home/forum/components/MyPostsModal/MyPostsModal.jsx`
- `src/pages/home/forum/components/SearchSidebar/SearchSidebar.jsx`
- `src/pages/home/forum/components/ImageViewerModal/ImageViewerModal.jsx`
- `src/pages/home/forum/components/UserSidebar/UserSidebar.jsx`
- `src/pages/home/forum/components/SavedPostsModal/SavedPostsModal.jsx`
- `src/pages/home/forum/components/PostModal/PostModal.jsx`

## Lưu ý

- Đảm bảo file `.env` được thêm vào `.gitignore`
- Khi deploy, cập nhật `VITE_API_BASE_URL` trong environment variables của hosting platform
- Tất cả các URL đã được thay thế tự động, không cần thay đổi thủ công
