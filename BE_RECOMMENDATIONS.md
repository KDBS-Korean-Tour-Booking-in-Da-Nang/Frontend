# Backend Recommendations for Company Booking Management

## 1. BookingGuestResponse Missing Fields

### Issue
`BookingGuestResponse` DTO does not include the `insuranceStatus` field, even though the `BookingGuest` model has it.

### Recommendation
Add `insuranceStatus` field to `BookingGuestResponse`:

```java
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookingGuestResponse {
    private Long bookingGuestId;
    private String fullName;
    private LocalDate birthDate;
    private Gender gender;
    private String idNumber;
    private String nationality;
    private BookingGuestType bookingGuestType;
    private InsuranceStatus insuranceStatus; // ADD THIS
}
```

Update the mapper to include this field when mapping from `BookingGuest` to `BookingGuestResponse`.

## 2. Tour Completion Feature (After Booking Success)

### Issue
The workflow requires:
- After booking success, system should track tour completion based on departure date + tour duration
- Both company and user can confirm tour completion
- Payment should be transferred to company after tour completion
- Auto-confirmation after 3 days if one party confirms

### Missing Components

#### 2.1 Tour Duration Field
- **Issue**: Tour model/response doesn't include duration field
- **Recommendation**: Add `duration` field (in days) to `Tour` model and `TourResponse` DTO

#### 2.2 Tour Completion Endpoint
- **Issue**: No endpoint to confirm tour completion
- **Recommendation**: Create endpoints:
  - `PUT /api/booking/{bookingId}/confirm-tour-completion` - For company to confirm
  - `PUT /api/booking/{bookingId}/user/confirm-tour-completion` - For user to confirm
  - `GET /api/booking/{bookingId}/tour-completion-status` - Get completion status

#### 2.3 Tour Completion Status Model
- **Recommendation**: Add a `TourCompletion` entity or fields to `Booking`:
  ```java
  @Column(name = "company_confirmed_completion")
  private Boolean companyConfirmedCompletion;
  
  @Column(name = "user_confirmed_completion")
  private Boolean userConfirmedCompletion;
  
  @Column(name = "tour_end_date")
  private LocalDate tourEndDate;
  
  @Column(name = "auto_confirmed_date")
  private LocalDate autoConfirmedDate;
  ```

#### 2.4 Scheduler for Auto-Confirmation
- **Recommendation**: Create a scheduled task that:
  - Runs daily
  - Checks for tours that ended 3 days ago
  - If one party confirmed but not the other, auto-confirm
  - Trigger payment transfer after auto-confirmation

#### 2.5 Payment Transfer Logic
- **Recommendation**: After tour completion confirmation:
  - Transfer payment from escrow/hold to company account
  - Update booking status or create a completion record
  - Send notification to both parties

#### 2.6 Notification System
- **Recommendation**: Send notifications:
  - When tour completion can be confirmed (tour end date reached)
  - When one party confirms completion
  - When tour is auto-confirmed
  - When payment is transferred

## 3. Booking Status Enum

### Issue
Frontend uses `WAITING_FOR_APPROVED` but backend enum has `WAITING_FOR_APPROVED` which is correct. However, the frontend should handle this consistently.

### Recommendation
- Ensure all status checks use the correct enum value: `WAITING_FOR_APPROVED` (not `WAITING_FOR_APPROVAL`)

## 4. Insurance Status Enum

### Issue
Frontend uses `SUCCESS`/`FAILED` but backend enum uses `Success`/`Failed`/`Pending`.

### Recommendation
- Frontend should map correctly: `Success` (backend) = `SUCCESS` (frontend display)
- Ensure API accepts the correct enum values: `Success`, `Failed`, `Pending`

## 5. Booking Response - Include Guests with Insurance Status

### Issue
When fetching booking by ID, the guests should include insurance status.

### Recommendation
- Ensure `getBookingById` includes guests with insurance status
- Update mapper to include insurance status in guest responses

## 6. Notification for WAITING_FOR_UPDATE Status

### Issue
Backend has TODO comment for sending notification when status changes to `WAITING_FOR_UPDATE`.

### Recommendation
- Implement notification service to send email/notification to user
- Include link to update booking page
- Store notification record in database

## 7. Additional Recommendations

### 7.1 Error Handling
- Add more specific error messages for booking status transitions
- Validate that status transitions are allowed (e.g., can't go from REJECTED to SUCCESS)

### 7.2 Audit Trail
- Add audit log for booking status changes
- Track who changed the status and when
- Track insurance status changes

### 7.3 Validation
- Validate that all guests have insurance status before moving to step 3
- Validate that booking can only move to next step if previous step is completed

### 7.4 Performance
- Consider caching tour data when fetching bookings
- Optimize queries for fetching bookings by tour ID
- Add pagination if needed for large booking lists

## Summary

Priority 1 (Critical):
1. Add `insuranceStatus` to `BookingGuestResponse`
2. Include insurance status when fetching booking guests

Priority 2 (Important):
1. Add tour duration to Tour model/response
2. Create tour completion endpoints
3. Implement tour completion status tracking

Priority 3 (Nice to have):
1. Implement scheduler for auto-confirmation
2. Implement payment transfer logic
3. Implement notification system
4. Add audit trail
5. Add validation for status transitions

