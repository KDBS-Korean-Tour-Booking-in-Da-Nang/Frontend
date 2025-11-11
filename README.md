## Toss Payment Frontend Flow

### Scope
- Implemented booking payment initiation UI and Toss widget container in `src/pages/payment/BookingCheckPaymentPage.jsx` and `src/components/payment/TossWidgetContainer.jsx`.
- Added payment result handling page at `src/pages/payment/PaymentResultPage.jsx` and wired new routes in `src/App.jsx`.
- Introduced service layer `src/services/paymentService.js` plus supporting tests and configuration updates (`vite.config.js`, test setup, package scripts).
- Added automated tests under `src/services/__tests__/` and `src/pages/payment/__tests__/`.

### Backend Contracts Referenced
- `POST /api/booking/payment` from `Backend/src/main/java/com/example/KDBS/controller/BookingController.java` (uses `BookingPaymentRequest`, returns `TossCreateOrderResponse`).
- Toss success/fail redirect handlers defined in `Backend/src/main/java/com/example/KDBS/controller/TossController.java`, which redirect the browser to `<frontendUrl>/transaction-result?orderId=...&paymentMethod=...&status=...&amount=...`.

### Frontend Routes
- `/booking/:bookingId/payment` renders `BookingCheckPaymentPage`.
- `/transaction-result` renders `PaymentResultPage` and must remain aligned with the redirect target constructed inside `TossController#getFrontendRedirect`.

### Run Locally
```bash
npm start
```

### Tests
- Unit tests & mocked E2E coverage:
  - Run once: `npm test`
  - Watch mode: `npm test:watch`
- `PaymentFlow` test simulates booking → Toss widget mount → backend redirect back to `/transaction-result`.

### Notes
- Toss widget currency defaults to `KRW`; override via `VITE_TOSS_CURRENCY` if required.
- API base URL follows `VITE_API_BASE_URL` with fallback `http://localhost:8080`.

