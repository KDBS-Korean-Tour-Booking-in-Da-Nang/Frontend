# VNPay Payment Flow Documentation

## Overview
This document describes the complete VNPay payment flow implementation for the tour booking system.

## Flow Architecture

### 1. Booking Process
```
TourDetailPage → TourBookingWizard → VNPayPaymentPage → VNPay Gateway → Backend → TransactionResultPage
```

### 2. Component Structure

#### **VNPayPaymentPage** (`/payment/vnpay`)
- **Purpose**: Display booking summary and initiate VNPay payment
- **Features**:
  - Fetches tour prices from API
  - Calculates total amount dynamically
  - Validates user email matches booking email
  - Creates booking in database first
  - Initiates VNPay payment
  - Redirects to VNPay gateway

#### **VNPayReturnPage** (`/api/vnpay/return`)
- **Purpose**: Placeholder page for VNPay return (backend redirects to `/transaction-result`)
- **Features**:
  - Simple loading page
  - Fallback link to `/transaction-result`
  - Minimal processing (backend handles redirect)

#### **TransactionResultPage** (`/transaction-result`)
- **Purpose**: Route handler that determines success/failure and renders appropriate page
- **Features**:
  - Parses URL parameters from backend redirect
  - Determines payment status based on `responseCode`
  - Renders `VNPaySuccessPage` or `VNPayFailPage`

#### **VNPaySuccessPage**
- **Purpose**: Display successful payment and booking confirmation
- **Features**:
  - Shows transaction details
  - Displays booking information
  - Lists guest details
  - Provides action buttons (view booking, go to tour, go home)
  - Auto-redirect countdown
  - Email confirmation notice

#### **VNPayFailPage**
- **Purpose**: Display failed payment with error details and recovery options
- **Features**:
  - Shows error details based on VNPay response codes
  - Provides specific error messages and suggestions
  - Action buttons (retry payment, go to tour, go home)
  - Support contact information
  - Auto-redirect countdown

## Backend Integration

### VNPay Controller Endpoints
- **POST** `/api/booking/payment` - Create VNPay payment
- **GET** `/api/vnpay/return` - Handle VNPay return (redirects to `/transaction-result`)

### Redirect Flow
```
VNPay Gateway → Backend (/api/vnpay/return) → Frontend (/transaction-result)
```

## URL Parameters

### Transaction Result Page Parameters
- `orderId` - Transaction order ID
- `paymentMethod` - Payment method (vnpay)
- `responseCode` - VNPay response code
  - `00` = Success
  - Other codes = Failure (with specific error messages)

## Error Handling

### VNPay Response Codes
- **00**: Success
- **07**: Transaction suspected (fraud)
- **09**: Card/Account not registered for InternetBanking
- **10**: Incorrect card/account info (3+ attempts)
- **11**: Payment timeout
- **12**: Transaction cancelled
- **24**: Customer cancelled
- **51**: Insufficient balance
- **65**: Daily transaction limit exceeded
- **75**: Bank maintenance
- **79**: Wrong password (too many attempts)

### Error Recovery
- Specific error messages for each response code
- Actionable suggestions for users
- Support contact information
- Retry payment option

## State Management

### Session Storage
- `pendingBooking` - Stores booking data during payment process
- Cleared after successful/failed payment processing

### Context Integration
- Uses `TourBookingContext` for booking data
- Uses `AuthContext` for user authentication
- Uses `ToastContext` for notifications

## Security Features

### Authentication
- Bearer token required for payment creation
- User email validation against booking email
- Automatic token cleanup on 401 errors

### Data Validation
- Booking data validation before payment
- Tour price validation from API
- Guest information validation

## Responsive Design

### Mobile Optimization
- Responsive layouts for all payment pages
- Touch-friendly buttons and forms
- Optimized table displays for small screens

### Accessibility
- Proper ARIA labels
- Keyboard navigation support
- Screen reader compatibility

## Testing Scenarios

### Success Flow
1. Complete booking wizard
2. Navigate to payment page
3. Verify booking details
4. Click "Thanh toán VNPay"
5. Complete VNPay payment
6. Verify success page display
7. Test navigation buttons

### Failure Flow
1. Complete booking wizard
2. Navigate to payment page
3. Cancel or fail VNPay payment
4. Verify failure page display
5. Test retry functionality
6. Test support options

### Edge Cases
- Network failures during payment
- Invalid booking data
- Authentication token expiration
- Missing tour prices
- Browser back/forward navigation

## Future Enhancements

### Potential Improvements
- Payment retry with different methods
- Booking modification after payment
- Email/SMS notifications
- Payment history tracking
- Refund processing
- Multi-language support

### Performance Optimizations
- Lazy loading of payment pages
- Caching of tour prices
- Optimized API calls
- Progressive web app features

## Troubleshooting

### Common Issues
1. **Payment page shows "Đang tải..."**
   - Check tour price API endpoint
   - Verify tour ID in URL
   - Check network connectivity

2. **Authentication errors**
   - Verify user is logged in
   - Check token validity
   - Clear browser storage if needed

3. **Redirect issues**
   - Verify backend redirect configuration
   - Check `/transaction-result` route
   - Verify URL parameters

4. **Booking data missing**
   - Check sessionStorage for `pendingBooking`
   - Verify booking creation API
   - Check browser storage permissions

### Debug Information
- Console logs for all major steps
- Network tab for API calls
- Application tab for sessionStorage
- URL parameters for payment status
