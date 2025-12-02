# Frontend Package Diagram

This document describes the main frontend packages (modules) of the KDBS application and their relationships. It is derived purely from the frontend structure and FE features (FE-01 → FE-76).

---

## 1. High-Level Package Overview

At a high level, the frontend is organized into the following packages:

- **Core Application (`src/App.jsx`, `src/main.jsx`)**  
  Responsible for bootstrapping the React app, routing configuration, and global layout.

- **Authentication Package (`src/pages/authentication`, `src/contexts/AuthContext.jsx`)**  
  Handles login (email/username), registration, email verification, password recovery, and OAuth callbacks.

- **Forum Package (`src/pages/forum`, `src/components/modals/...`, shared components)**  
  Provides forum features (view/create/update/delete posts, comments, reactions, reports, hashtags, translations, saved posts).

- **Article (News) Package (`src/pages/news`, `src/services/articleService.js`)**  
  Displays approved and upcoming articles, article details and related UX.

- **Tour & Booking Package (`src/pages/tour`, `src/pages/payment`, `src/contexts/TourBookingContext.jsx`, `src/services/bookingAPI.js`, `src/services/voucherAPI.js`)**  
  Handles tour listing, tour details, booking wizard, vouchers, payment flows and booking summaries.

- **User Package (`src/pages/user`, `src/services/userService.js`)**  
  Manages user profile, booking history, booking details & complaints, personal settings, and change password.

- **Company Dashboard Package (`src/pages/company`, `src/utils/companyUtils.js`, `src/services/bookingAPI.js`, `src/services/voucherAPI.js`)**  
  Provides company-side management for tours, bookings, vouchers, company info, and tour completion confirmation.

- **Admin Dashboard Package (`src/pages/admin`)**  
  Provides admin/staff consoles for managing users, companies, staff, tours, forum, complaints, tickets, reports and transactions.

- **Shared UI Components (`src/components`)**  
  Reusable UI elements: navigation bars, modals, chat widgets, notification dropdowns, toast, scroll-to-top, etc.

- **Cross-Cutting Infrastructure**
  - **Contexts**: `AuthContext`, `NotificationContext`, `ChatContext`, `TourBookingContext`, `TourWizardContext`, `ToastContext`
  - **Services**: `articleService`, `bookingAPI`, `voucherAPI`, `userService`, `chatApiService`, `notificationService`, `paymentService`, `weatherService`, `websocketService`
  - **Utilities**: `apiErrorHandler`, `emailValidator`, `bookingFormatter`, `companyUtils`, `priceRules`, `sanitizeHtml`, etc.
  - **i18n**: `src/i18n`, `src/locales/*/common.json` for multi-language support.

---

## 2. Package Structure

### 2.1 Core Application Package

**Location:**

- `src/main.jsx`
- `src/App.jsx`

**Responsibilities:**

- Initialize React application and render root component
- Configure React Router routes for all feature packages
- Provide top-level providers (e.g., `AuthProvider`, `NotificationProvider`, `ToastProvider`, `ChatProvider`, `TourBookingProvider`)
- Mount global layout (navigation, footers, global modals, etc.)

**Depends on:**

- Authentication Package (for guarded routes and login state)
- Forum, Article, Tour, User, Company, Admin pages for routing
- Shared UI Components
- Context Packages

---

### 2.2 Authentication Package

**Location:**

- `src/pages/authentication/*`
- `src/contexts/AuthContext.jsx`
- `src/utils/emailValidator.js`
- `src/config/api.js`

**Sub-packages / Screens:**

- `login/` – FE-01 (Sign In with email)
- `register/` – FE-02 (Register user/company)
- `oauthCallback/` – FE-03 (OAuth login: Google, Naver)
- `resetPassword/` & `forgotPassword/` – FE-05 (Forgot/Reset password)
- `verifyEmail/` – email verification after registration
- `staffLogin/`, `adminLogin/` – FE-06 (Login with username for staff/admin)

**Key Responsibilities:**

- Manage authentication flows using `AuthContext` and JWT tokens
- Persist user & token to `localStorage`/`sessionStorage` with remember-me and inactivity logout
- Integrate with backend auth endpoints via `api.js` and `apiErrorHandler`
- Emit auth-related toast notifications and redirect to appropriate dashboards

**Depends on:**

- **Core Application** (routing and providers)
- **Shared UI Components** (`Navbar`, `Toast`, modals)
- **User Service** (`userService.js` for registration/verification)
- **Notification & Toast Contexts** (for feedback)

**Used by:**

- All other packages via `useAuth()` for current user, role-based routing and guards

---

### 2.3 Forum Package

**Location:**

- `src/pages/forum/*`
- `src/components/modals/*` (e.g. `PostModal`, `EditPostModal`, `ReportModal`, `SavedPostsModal`)
- `src/services/chatApiService.js` (for user mentions / chat integration)
- `src/utils/sanitizeHtml.js`, `htmlConverter.js`

**Sub-packages / Screens:**

- `forum/forum.jsx` – FE-07 (View Posts, Search, Infinite Scroll)
- `components/PostModal` – FE-08 (Create Post)
- `components/EditPostModal` – FE-09 (Update Post)
- `components/PostCard` – FE-07/08/09/10/11/13/14/15
- `components/CommentSection` – FE-16 → FE-22
- `components/ReportModal`, `CommentReportModal` – FE-12, FE-21
- `components/SavedPostsModal` – FE-11
- `components/SearchSidebar` – FE-14

**Key Responsibilities:**

- Manage all forum-related UI for posts, comments, reactions, reports and hashtags
- Integrate with backend forum endpoints via `bookingAPI`/dedicated forum services (via `config/api.js`)
- Use Gemini translation endpoint via `api.js` (for FE-15, FE-22)
- Use `NotificationContext` to show real-time updates (e.g. new reactions, reports)

**Depends on:**

- **Authentication** (requires logged-in user for create/update/delete, react, report)
- **Shared UI Components** (modals, toasts, dropdowns)
- **Notification Context** (to refresh counts after actions)
- **Utils** (HTML sanitization, link detection, formatting)

**Used by:**

- Admin Dashboard (Forum Management & Report Management views)

---

### 2.4 Article (News) Package

**Location:**

- `src/pages/news/*`
- `src/services/articleService.js`

**Sub-packages / Screens:**

- `News.jsx` – FE-24 (View Approved Articles)
- `NewsDetail/NewsDetail.jsx` – FE-25, FE-27, FE-30

**Key Responsibilities:**

- Display list of approved and upcoming articles (with filters & search)
- Show article details and translated content (VN/EN/KR)
- Link from articles to related forum discussions (FE-30)

**Depends on:**

- **Shared UI Components** (cards, loaders, error states)
- **Authentication** (for tracking article reads per user)
- **i18n** (multi-language article display)

**Used by:**

- Admin Dashboard (News/Article management screens)

---

### 2.5 Tour & Booking Package

**Location:**

- `src/pages/tour/*`
- `src/pages/payment/*`
- `src/contexts/TourBookingContext.jsx`, `TourWizardContext.jsx`
- `src/services/bookingAPI.js`, `paymentService.js`, `voucherAPI.js`, `weatherService.js`
- `src/hooks/useTours.js`, `useToursAPI.js`, `useBookingAPI.js`, `useBookingStepValidation.js`, `useTourRated.js`

**Sub-packages / Screens:**

- `TourList`, `Tour.jsx` – FE-31 (View Tours)
- `TourDetailPage` – FE-31, FE-34, FE-35 (vouchers for tour)
- `TourBookingWizard` (steps 1–3) – FE-33, FE-36 (vouchers for booking)
- `VoucherList`, `VoucherDetailPage` – FE-35/36/37
- `BookingCheckPaymentPage`, `TossPaymentPage`, `PaymentResultPage` – FE-33 + payment flows

**Key Responsibilities:**

- Search and display tours with filters (price, rating, etc.)
- Manage booking wizard life-cycle (contact, guests, review, payment)
- Integrate with payment provider via `paymentService`
- Apply and preview vouchers via `voucherAPI`
- Show tour ratings and reviews (FE-32, FE-34)
- Fetch weather and context info via `weatherService` and `lib/geo`

**Depends on:**

- **Authentication** (USER role for booking & rating)
- **User Package** (booking history & details)
- **Company Dashboard** (company tours & bookings feed back to user views)
- **Notification Context** (booking status changes, payment results)
- **Utils** (`bookingFormatter`, `priceRules`)

**Used by:**

- Company Dashboard (to display bookings per tour)
- Admin Dashboard (transaction views, booking complaints management)

---

### 2.6 User Package

**Location:**

- `src/pages/user/*`
- `src/services/userService.js`

**Sub-packages / Screens:**

- `userProfile/UserProfile.jsx` – FE-41, FE-48 (profile & change password)
- `bookingHistory/BookingHistory.jsx` – FE-39 (View Booking History)
- `bookingDetail/BookingDetail.jsx`, `ComplaintModal.jsx`, `EditBookingModal.jsx` – FE-38, FE-40, FE-47

**Key Responsibilities:**

- Display and update personal information (name, phone, address, avatar)
- Show user booking history and individual booking details
- Support booking updates and complaint creation
- Allow changing password (FE-48)

**Depends on:**

- **Authentication** (current user identity)
- **Tour & Booking Package** (reading booking data via `bookingAPI`)
- **Shared UI Components** (modals, forms, toasts)

**Used by:**

- Admin Dashboard (User Management & Customer Support views)

---

### 2.7 Company Dashboard Package

**Location:**

- `src/pages/company/*`
- `src/utils/companyUtils.js`, `companyToursStorage.js`
- `src/services/bookingAPI.js`, `voucherAPI.js`, `userService.js`

**Sub-packages / Screens:**

- `CompanyLayout.jsx` & `dashboard/Dashboard.jsx` – FE-50–63 entry
- `tours/tour-management/TourManagement.jsx` & `wizard/TourWizard.jsx` – FE-50 (Create), FE-51 (Update), FE-52 (Delete), FE-53 (View Own Tours)
- `bookings/` screens – FE-54–58, FE-63 (View/Approve/Reject/Update bookings, change insurance)
- `vouchers/VoucherManagement.jsx`, `VoucherCreateModal.jsx` – FE-59–60
- `companyInfo/companyInfo.jsx` – FE-04 (upload company information), FE-61 (Approve Tour Completed from company side)

**Key Responsibilities:**

- Provide an operator UI for tour creation and management
- Manage bookings, booking updates, approvals, rejections, and complaints (company side)
- Manage company vouchers and pricing strategies
- Confirm tour completion and trigger revenue settlement from the company perspective

**Depends on:**

- **Authentication** (COMPANY/BUSINESS roles)
- **Tour & Booking Package** (tours & bookings data via services)
- **User Service** (company profile details)
- **Shared UI Components** (dashboards, tables, modals)

**Used by:**

- Admin Dashboard (Company Management & oversight)

---

### 2.8 Admin Dashboard Package

**Location:**

- `src/pages/admin/*`

**Sub-packages / Screens (mapped to FE-64 → FE-76):**

- **User & Company Management**
  - `UserManagement/UserManagement.jsx` – FE-64 (View List Of Users), FE-71 (Change User Status)
  - `CompanyManagement/*` – manage company accounts, roles, statuses
  - `StaffManagement/*` – FE-68 (Create Staff), FE-69 (Delete Staff), FE-70 (Update Staff’s Task)
- **Tour & Transaction Management**
  - `TourManagement/*` – FE-72 (Change Tour Status)
  - `TransactionManagement/*` – FE-67 (View System Transaction)
- **Forum & Report Management**
  - `ForumManagement/*`, `ForumReportManagement/*` – FE-66 (View List Of Reports) + forum moderation
- **Complaint & Ticket Management**
  - `ComplaintManagement/*` – FE-74 (View All Complaints), FE-75 (View Complaint Detail), FE-76 (Resolve Booking Complaint)
  - `ResolveTicketManagement/*` – FE-46 (Create/Resolve Tickets from admin side)
- **News Management**
  - `NewsManagement/*` – FE-24–29 from admin perspective (approve/reject articles)
- **Dashboard**
  - `Dashboard/Dashboard.jsx` – summary KPIs for bookings, users, tours, complaints, revenue

**Key Responsibilities:**

- Central control panel for all administrative workflows
- User, staff, company, and role management
- Tour lifecycle control (approval, disabling)
- Forum report review & moderation
- Booking complaint resolution (FE-76) and ticket handling
- System transaction monitoring and financial oversight
- Sending system-wide notifications (FE-73)

**Depends on:**

- **Authentication** (ADMIN/STAFF roles)
- **All domain packages** (Forum, Article, Tour, User, Company) via their services
- **Shared UI Components** (tables, filters, modals, charts)

---

### 2.9 Shared UI & Infrastructure Packages

**Shared Components (`src/components`)**

- Navigation: `navbar-user`, `navbar-company`, `navbar-conditional`
- Layout helpers: `Footer`, `ScrollToTopButton`, `WebSocketStatus`
- Interaction: `Modal`, `ConfirmLeaveModal`, `DeleteConfirmModal`, `LoginRequiredModal`
- Feedback: `toast/Toast`, `NotificationDropdown`, `ChatBox`, `ChatDropdown`

**Contexts (`src/contexts`)**

- `AuthContext` – authentication & session state
- `NotificationContext` – real-time notifications and counters
- `ChatContext` – WebSocket connection and chat state (FE-45, FE-42)
- `TourBookingContext` & `TourWizardContext` – booking state management
- `ToastContext` – global toast management

**Services (`src/services`)**

- `articleService` – article/news API integration
- `bookingAPI` – bookings, guests, complaints, completion confirmation
- `voucherAPI` – voucher listing, preview & apply
- `userService` – user & profile operations
- `chatApiService` & `websocketService` – chat and WebSocket handling
- `notificationService` – fetching & marking notifications
- `paymentService` – payment-related calls
- `weatherService` – external weather data for tours

**Utilities (`src/utils`)**

- `apiErrorHandler` – centralized HTTP error handling
- `emailValidator` – email pattern checks
- `bookingFormatter`, `priceRules` – formatting & pricing logic
- `companyUtils`, `companyToursStorage` – company-specific helpers
- `sanitizeHtml`, `htmlConverter` – safe HTML rendering for forum/posts/articles

**i18n (`src/i18n`, `src/locales`)**

- Multi-language support (VI, EN, KO) for all UI text and domain labels

---

## 3. Package Dependency Summary

- **Core Application** depends on: Authentication, all Feature Packages, Shared UI, Contexts.
- **Authentication** is a foundational package; almost all other packages depend on it for identity and authorization.
- **Forum, Article, Tour, User, Company, Admin** all depend on Shared UI, Contexts, Services and Utils.
- **Admin Dashboard** depends on **all** domain packages (Forum, Article, Tour, User, Company) to provide oversight and management.
- **Company Dashboard** and **User** packages both depend on the **Tour & Booking** and **Voucher** services, creating a bidirectional conceptual relationship (company manages bookings; users create and view them).

This structure ensures that domain-specific UI (Authentication, Forum, Article, Tour, User, Company, Admin) is cleanly separated, while shared concerns (routing, state management, services, utils, and design system components) are centralized and reused across all FE features.

---

## 4. Textual Package Map (Diagram Equivalent)

This section presents a compact, text-only view of the frontend package diagram, matching the actual folder structure and main dependencies.

- **providers**

  - `AuthContext`
  - `ToastContext`
  - `ChatContext`
  - `NotificationContext`
  - `TourBookingContext`
  - `TourWizardContext`

- **App (core)**

  - `App.jsx`
  - `main.jsx`

- **Pages**

  - `home`
  - `authentication`
  - `company`
  - `forum`
  - `tour`
  - `user`
  - `payment`
  - `news`
  - `staff`
  - `admin`

- **components**

  - `navbar`
  - `footer`
  - `modals`
  - `toast`
  - `ChatBox`
  - `CozeChat` (Coze AI chatbot widget)
  - `ChatDropdown`
  - `NotificationDropdown`

- **hooks**

  - `useBookingAPI`
  - `useBookingStepValidation`
  - `useStepValidation`
  - `useTourRated`
  - `useTours`
  - `useToursAPI`
  - `useWeatherFromTour`
  - `useWeatherFromDescriptionMulti`

- **utils**

  - `bookingFormatter`
  - `emailValidator`
  - `htmlConverter`
  - `priceRules`
  - `sanitizeHtml`
  - `companyUtils`
  - `companyToursStorage`

- **services**

  - `userService`
  - `bookingAPI`
  - `articleService`
  - `voucherAPI`
  - `chatApiService`
  - `notificationService`
  - `paymentService`
  - `weatherService`
  - `websocketService`

- **config**

  - `api`

- **i18n**

  - `i18n/index`
  - `locales/en`
  - `locales/ko`
  - `locales/vi`

- **store**
  - `tourSlice`
  - `store/index`
