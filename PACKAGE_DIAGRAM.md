# Frontend Package Dependency Diagram

## Cấu trúc Package (Textual Structure)

```
app (Entry Point)
├── imports → store
├── imports → providers (contexts)
│   ├── AuthContext
│   ├── ToastContext
│   ├── ChatContext
│   ├── ThemeContext
│   └── TourBookingContext
├── imports → components
│   ├── navbar
│   ├── modals
│   ├── Footer
│   ├── ChatBox
│   ├── ChatDropdown
│   ├── NotificationDropdown
│   └── WebSocketStatus
├── imports → pages
│   ├── home
│   ├── authentication
│   ├── business
│   ├── tour
│   ├── forum
│   ├── user
│   ├── payment
│   └── news
└── imports → i18n

components
├── imports → providers (contexts)
├── imports → config
└── imports → utils

pages
├── imports → components
├── imports → providers
├── imports → services
├── imports → utils
├── imports → hooks
├── imports → config
└── imports → store

services
└── imports → config

hooks
├── imports → services
└── imports → config

utils
└── (standalone, no internal imports)

config
└── (standalone, no internal imports)

store
└── (standalone, uses Redux)

i18n
└── imports → locales
```

## Chi tiết các Package

### 1. app (Điểm vào chính)

- **Files**: `App.jsx`, `main.jsx`
- **Chức năng**: Khởi tạo ứng dụng, cấu hình routing
- **Import từ**: store, providers, components, pages, i18n

### 2. providers (contexts/)

- **Chứa**: AuthContext, ToastContext, ChatContext, ThemeContext, TourBookingContext
- **Chức năng**: Quản lý state toàn cục
- **Import từ**: config, services

### 3. store

- **Chứa**: tourSlice, index
- **Chức năng**: Redux store cho tour management
- **Standalone**: Không import module nào trong app

### 4. components

- **Chứa**: Navbar, Footer, Modals, Toast, ChatBox, ChatDropdown, NotificationDropdown, WebSocketStatus
- **Chức năng**: UI components tái sử dụng
- **Import từ**: providers, config, utils

### 5. pages

- **Chứa**: home, authentication, business, dashboard, forum, tour, user, payment, news, staff
- **Chức năng**: Route-based page components
- **Import từ**: components, providers, services, utils, hooks, config, store

### 6. services

- **Chứa**: userService, bookingAPI, articleService, chatApiService, websocketService
- **Chức năng**: API communication layer
- **Import từ**: config

### 7. hooks

- **Chứa**: useBookingAPI, useBookingStepValidation, useStepValidation, useTourRated, useTours, useToursAPI
- **Chức năng**: Custom React hooks
- **Import từ**: services, config

### 8. utils

- **Chứa**: bookingFormatter, emailValidator, htmlConverter, priceRules, sanitizeHtml, businessToursStorage
- **Chức năng**: Pure utility functions
- **Standalone**: Không import module nào trong app

### 9. config

- **Chứa**: api.js (API endpoints và configuration)
- **Chức năng**: Centralized configuration
- **Standalone**: Không import module nào trong app

### 10. i18n

- **Chứa**: i18n setup
- **Chức năng**: Internationalization
- **Import từ**: locales

### 11. locales

- **Chứa**: en/common.json, ko/common.json, vi/common.json
- **Chức năng**: Translation files

## Luồng phụ thuộc (Dependency Flow)

```
app (Tầng 1 - Entry Point)
  ↓ imports
providers, store (Tầng 2 - State Management)
  ↓ imports
components, pages (Tầng 3 - UI Layer)
  ↓ imports
hooks, services (Tầng 4 - Business Logic)
  ↓ imports
utils, config (Tầng 5 - Utilities)
```

## Mối quan hệ import chi tiết

- **app** imports: → store, providers, components, pages, i18n
- **providers** imports: → config, services
- **components** imports: → providers, config, utils
- **pages** imports: → components, providers, services, utils, hooks, config, store
- **services** imports: → config
- **hooks** imports: → services, config
- **utils**: standalone
- **config**: standalone
- **store**: standalone
- **i18n** imports: → locales

## Ghi chú

- ✅ **Không có circular dependencies**: Cấu trúc phân tầng rõ ràng
- ✅ **Separation of concerns**: Mỗi tầng có trách nhiệm riêng
- ✅ **Tái sử dụng**: Components và utils được share giữa các pages
- ✅ **State management**: Kết hợp React Context và Redux
- ✅ **Configuration**: Centralized trong thư mục config
