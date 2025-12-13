# Danang Korea Tour - Frontend

> Nền tảng quản lý tour song ngữ Hàn - Việt cho doanh nghiệp tại Đà Nẵng

## 📋 Giới thiệu

**Danang Korea Tour (KDBS)** là hệ thống đặt tour và quản lý booking real-time dành cho doanh nghiệp du lịch tại Đà Nẵng phục vụ khách hàng Hàn Quốc. Hệ thống cung cấp giao diện song ngữ (Tiếng Việt - Tiếng Hàn) với các tính năng quản lý tour, booking, thanh toán, forum, và chatbot AI hỗ trợ.

### Đối tượng sử dụng

- **USER**: Khách hàng đặt tour
- **COMPANY/BUSINESS**: Doanh nghiệp quản lý tour và booking
- **STAFF**: Nhân viên hỗ trợ khách hàng
- **ADMIN**: Quản trị viên hệ thống

## 🛠️ Tech Stack

### Core
- **React** 19.1.0
- **Vite** 5.4.21 (Build tool)
- **React Router DOM** 7.6.3 (Routing)

### State Management
- **Redux Toolkit** 2.9.0
- **React Context API** (Auth, Toast, Chat, Notification)

### UI Libraries
- **Tailwind CSS** 3.4.17
- **Bootstrap** 5.3.3
- **Headless UI** 2.2.4
- **Heroicons** 2.2.0
- **Lucide React** 0.554.0

### Data Visualization
- **ApexCharts** 5.3.6
- **Chart.js** 4.5.0
- **React ApexCharts** 1.7.0
- **React ChartJS 2** 5.3.0

### Real-time & Communication
- **WebSocket** (@stomp/stompjs 7.2.1, sockjs-client 1.6.1)

### Rich Text Editor
- **TinyMCE** 8.0.2

### Internationalization
- **i18next** 25.4.0
- **react-i18next** 15.7.1
- **i18next-browser-languagedetector** 8.2.0

### HTTP Client
- **Axios** 1.13.1

### Animation
- **GSAP** 3.13.0

### Other Libraries
- **date-fns** 4.1.0 (Date formatting)
- **react-date-range** 2.0.1 (Date picker)
- **react-simple-maps** (Map visualization)
- **embla-carousel-react** 8.6.0 (Carousel)

## 📦 Cài đặt & Chạy dự án

### Yêu cầu môi trường

- **Node.js** >= 18.x
- **npm** >= 9.x (hoặc yarn/pnpm)

### Bước 1: Clone repository

```bash
git clone <repository-url>
cd Frontend
```

### Bước 2: Cài đặt dependencies

```bash
npm install
```

### Bước 3: Cấu hình môi trường

Tạo file `.env` trong thư mục `Frontend/`:

```env
# API Backend URL
VITE_API_BASE_URL=http://localhost:8080

# Frontend URL (optional, default: http://localhost:3000)
VITE_FRONTEND_URL=http://localhost:3000
```

**Lưu ý**: 
- Development: Sử dụng `VITE_API_BASE_URL` hoặc để trống để dùng proxy mặc định
- Production: **Bắt buộc** phải set `VITE_API_BASE_URL` với URL backend production

### Bước 4: Chạy development server

```bash
npm run dev
```

Ứng dụng sẽ chạy tại: `http://localhost:3000`

### Các lệnh khác

```bash
# Build production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint

# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## 📁 Cấu trúc dự án

```
Frontend/
├── public/                 # Static assets
├── src/
│   ├── assets/            # Images, data files
│   ├── components/        # Reusable components
│   │   ├── chatAI/        # AI Chat bubble
│   │   ├── modals/        # Modal components
│   │   ├── navbar/        # Navigation bars
│   │   └── ...
│   ├── config/            # Configuration files
│   │   └── api.js         # API endpoints config
│   ├── contexts/          # React Context providers
│   │   ├── AuthContext.jsx
│   │   ├── ChatContext.jsx
│   │   ├── ToastContext.jsx
│   │   └── NotificationContext.jsx
│   ├── hooks/             # Custom React hooks
│   ├── i18n/              # i18next configuration
│   ├── locales/           # Translation files (vi, ko, en)
│   ├── pages/             # Page components
│   │   ├── admin/         # Admin dashboard
│   │   ├── authentication/ # Login, Register, OAuth
│   │   ├── company/       # Company dashboard
│   │   ├── forum/         # Forum pages
│   │   ├── tour/          # Tour pages
│   │   ├── user/          # User profile, booking history
│   │   ├── payment/       # Payment pages
│   │   └── staff/         # Staff dashboard
│   ├── services/          # API service layers
│   ├── store/             # Redux store & slices
│   ├── utils/             # Utility functions
│   ├── App.jsx            # Main App component
│   └── main.jsx           # Entry point
├── .env                   # Environment variables (create this)
├── vite.config.js         # Vite configuration
├── tailwind.config.js     # Tailwind CSS configuration
└── package.json
```

## 🔧 Cấu hình

### Vite Proxy (Development)

Trong `vite.config.js`, proxy được cấu hình để forward các request:

- `/api/*` → Backend API
- `/uploads/*` → Backend uploads
- `/ws/*` → WebSocket connections

### API Configuration

File `src/config/api.js` chứa:
- Base URL configuration
- API endpoints mapping
- Helper functions cho avatar/image URLs
- Auth headers creation

### Đa ngôn ngữ

Hỗ trợ 3 ngôn ngữ:
- Tiếng Việt (vi)
- Tiếng Hàn (ko)
- Tiếng Anh (en)

Translation files tại: `src/locales/{locale}/common.json`

## 🏗️ Kiến trúc / Module

### Authentication Module
- Login/Register (Email, OAuth: Google, Naver)
- Email verification
- Forgot/Reset password
- Role-based access control (USER, COMPANY, STAFF, ADMIN)

### Tour Management Module
- Tour listing & search
- Tour detail & booking wizard
- Tour management (Company dashboard)
- Tour statistics & analytics

### Booking Module
- Booking wizard (multi-step form)
- Booking management (Company)
- Booking history (User)
- Booking status tracking

### Payment Module
- Toss Payment integration
- Payment verification
- Transaction management

### Forum Module
- Post creation & management
- Comments & replies
- Reactions (like, etc.)
- Hashtags
- Saved posts
- Report system

### Article Module
- Article listing
- Article detail with comments
- Article suggestions based on tour

### Chat Module
- Real-time chat (User-Staff)
- AI Chat Assistant (BubbleChatAI)
- WebSocket integration

### Notification Module
- Real-time notifications
- Notification dropdown
- WebSocket notifications

### Admin Module
- Dashboard & statistics
- User/Company/Staff management
- Tour management & approval
- Forum moderation
- Report management
- Transaction management
- Article management

### Company Module
- Business dashboard
- Tour management & wizard
- Booking management
- Voucher management
- Statistics & analytics

### Staff Module
- Customer contact management
- Task management
- Ticket resolution

## 🔐 Tài khoản test

> **Lưu ý**: Thông tin tài khoản test sẽ được cung cấp bởi Backend team hoặc Admin.

Các role có sẵn:
- **ADMIN**: Quản trị hệ thống
- **STAFF**: Nhân viên hỗ trợ
- **COMPANY/BUSINESS**: Doanh nghiệp du lịch
- **USER**: Khách hàng

## 🔗 Links liên quan

- **Backend API**: Xem README trong thư mục Backend
- **API Documentation**: Swagger UI (nếu có) tại `/api/swagger-ui.html`
- **Figma Design**: (Link Figma nếu có)
- **Demo Website**: (Link demo nếu có)

## 📝 Lưu ý

### Development
- Backend phải chạy trước (port 8080 mặc định)
- CORS được xử lý bởi Backend
- WebSocket yêu cầu Backend hỗ trợ STOMP protocol

### Production
- **Bắt buộc** set `VITE_API_BASE_URL` trong `.env.production`
- Build output tại thư mục `dist/`
- Có thể deploy lên Vercel, Netlify, hoặc bất kỳ static hosting nào

### OAuth Configuration
- Google OAuth: Cần config Client ID trong Backend
- Naver OAuth: Cần config Client ID trong Backend
- Callback URLs: `/google/callback`, `/naver/callback`

### Payment Integration
- Toss Payment: Cần config trong Backend
- Payment flow: `/booking/payment` → `/booking/payment/checkout` → `/transaction-result`

## 🐛 Troubleshooting

### Port 3000 đã được sử dụng
```bash
# Thay đổi port trong vite.config.js hoặc
npm run dev -- --port 3001
```

### API calls fail trong development
- Kiểm tra Backend có đang chạy không
- Kiểm tra `VITE_API_BASE_URL` trong `.env`
- Kiểm tra CORS settings ở Backend

### WebSocket không kết nối
- Kiểm tra Backend WebSocket endpoint
- Kiểm tra proxy config trong `vite.config.js` cho `/ws`

## 📄 License

(Cập nhật license nếu có)

---

**Tác giả**: Capstone Team  
**Năm**: 2024

