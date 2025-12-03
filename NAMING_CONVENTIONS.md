# React.js Naming Conventions

## Files & Folders

### Components
- **Components**: PascalCase
  - `Modal.jsx`, `Navbar.jsx`

### Pages
- **Main Folders**: camelCase
  - `authentication/`, `adminDashboard/`, `businessInfo/`, `userProfile/`
- **Sub Folders**: camelCase
  - `authentication/login/`, `authentication/register/`, `authentication/staffLogin/`
- **Files**: camelCase
  - `adminDashboard.jsx`, `businessInfo.jsx`, `userProfile.jsx`
  - `login.jsx`, `register.jsx`, `staffLogin.jsx`
- **CSS Files**: camelCase
  - `adminDashboard.css`, `businessInfo.css`, `userProfile.css`
  - `login.css`, `register.css`, `staffLogin.css`

### Contexts
- **Files**: PascalCase
  - `AuthContext.jsx`

### Hooks (Future)
- **Files**: camelCase
  - `useUserData.jsx`, `useLocalStorage.jsx`

### Utils (Future)
- **Files**: camelCase
  - `apiHelpers.js`, `dateUtils.js`

### Constants (Future)
- **Files**: UPPER_SNAKE_CASE
  - `API_ENDPOINTS.js`, `ROUTES.js`

## Variables & Functions

### Variables
- **camelCase**: `userData`, `handleSubmit`, `isLoading`, `formatDate`
- **Boolean variables**: `isVisible`, `hasError`, `canEdit`

### Functions
- **Event handlers**: `handleClick`, `onSubmit`, `onUserSelect`
- **Regular functions**: `formatDate`, `validateEmail`, `getUserData`

## CSS/Styling

### CSS Modules
- **Files**: `ComponentName.module.css`
  - `UserProfile.module.css`, `AdminDashboard.module.css`

## Current Project Structure

```
src/
├── components/
│   ├── Modal.jsx
│   └── Navbar.jsx
├── contexts/
│   └── AuthContext.jsx
├── pages/
│   ├── adminDashboard/
│   │   ├── adminDashboard.jsx
│   │   └── adminDashboard.css
│   ├── businessInfo/
│   │   ├── businessInfo.jsx
│   │   └── businessInfo.css
│   ├── forgotPassword/
│   │   ├── forgotPassword.jsx
│   │   └── forgotPassword.css
│   ├── homepage/
│   │   ├── homepage.jsx
│   │   └── homepage.css
│   ├── login/
│   │   ├── login.jsx
│   │   └── login.css
│   ├── payment/
│   │   ├── payment.jsx
│   │   └── payment.css
│   ├── register/
│   │   ├── register.jsx
│   │   └── register.css
│   ├── resetPassword/
│   │   ├── resetPassword.jsx
│   │   └── resetPassword.css
│   ├── staffLogin/
│   │   ├── staffLogin.jsx
│   │   └── staffLogin.css
│   └── userProfile/
│       ├── userProfile.jsx
│       └── userProfile.css
├── App.jsx
├── main.jsx
└── index.css
```

## Import Examples

```javascript
// Page imports
import Homepage from './pages/homepage/homepage';
import Login from './pages/login/login';
import AdminDashboard from './pages/adminDashboard/adminDashboard';

// Component imports
import Navbar from './components/Navbar';
import Modal from './components/Modal';

// Context imports
import { AuthProvider } from './contexts/AuthContext';

// CSS imports (within components)
import './adminDashboard.css';
import './login.css';
```

## Benefits of This Structure

1. **Consistency**: All naming follows established conventions
2. **Scalability**: Easy to add new pages and components
3. **Maintainability**: Clear separation of concerns
4. **Readability**: Intuitive file and folder names
5. **Modularity**: Each page has its own folder with related files
