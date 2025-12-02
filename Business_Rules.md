# Business Rules Documentation

This document contains all Business Rules (BR) from BR-01 to BR-73, corresponding to the 73 features across all modules.

---

## 3.2 Authentication Module

### BR-01: Sign In (Login With Email) - FE-01

**Rule Description:** Users with USER or COMPANY roles can authenticate using email and password. The system must verify credentials against the database and ensure the account is active (not UNVERIFIED or BANNED). Only USER and COMPANY roles are permitted to login via email; STAFF and ADMIN must use username login.

**Key Requirements:**

- Email and password fields must not be empty
- Email must match valid format
- Password must meet minimum length (8 characters)
- Account status must be active (not UNVERIFIED or BANNED)
- JWT token is generated upon successful authentication
- User is redirected based on role (USER to landing page, COMPANY to company dashboard, ADMIN/STAFF to admin dashboard)

---

### BR-02: Register - FE-02

**Rule Description:** New users can create accounts by providing username, email, password, and selecting a role (USER or BUSINESS/COMPANY). The system handles duplicate email/username scenarios: if email exists with UNVERIFIED status within 3 days, user info is updated and OTP resent; if older than 3 days, old user is deleted. Username conflicts with UNVERIFIED users result in deletion; conflicts with verified users block registration.

**Key Requirements:**

- Username must start with a letter and cannot contain special characters (except spaces)
- Email must be unique and valid format
- Password must be at least 8 characters (no spaces allowed)
- Confirm password must match password
- User account is created with status UNVERIFIED
- OTP is automatically sent to user's email for verification

---

### BR-03: OAuth Login - FE-03

**Rule Description:** Users can authenticate using third-party OAuth providers (Google or Naver). The system redirects to provider's authentication page, exchanges authorization code for access token, retrieves user info, and creates or updates user account. For existing users, missing avatar/username is updated. For new users, account is created with default role USER and status UNBANNED.

**Key Requirements:**

- OAuth provider must be accessible
- Authorization code must be valid
- Access token exchange must succeed
- User info retrieval from provider must succeed
- JWT token is generated after successful OAuth authentication
- User is automatically logged in and redirected based on role

---

### BR-04: Upload Company Information - FE-04

**Rule Description:** COMPANY role users with status COMPANY_PENDING or WAITING_FOR_APPROVAL can upload business license and ID card documents (front and back) for verification. The system processes ID card front image using FPT AI API to extract information. This is a one-time upload per user. After successful upload, user status changes to WAITING_FOR_APPROVAL.

**Key Requirements:**

- User must have COMPANY role
- User must not have already uploaded business license
- All three files must be provided (business license, ID card front, ID card back)
- Files must be valid image/PDF formats
- ID card information is extracted via FPT AI API
- User status changes to WAITING_FOR_APPROVAL after upload

---

### BR-05: Forgot Password - FE-05

**Rule Description:** Users can reset their password by requesting an OTP via email. The system validates that the email exists, account is not BANNED, and OTP is valid and not expired. After OTP verification, new password must meet requirements (minimum 8 characters) and match confirm password. Success email is sent to user upon password reset.

**Key Requirements:**

- Email must exist in database
- Account must not be BANNED
- OTP must be valid and not expired
- OTP purpose must be FORGOT_PASSWORD
- New password must meet minimum requirements (8 characters)
- New password and confirm password must match
- Success email is sent after password reset

---

### BR-06: Login With Username - FE-06

**Rule Description:** STAFF and ADMIN users authenticate using username and password. This is a separate login flow from regular user login. Only STAFF and ADMIN roles are permitted to use this login method; USER and COMPANY must use email login. Account must be active (not BANNED).

**Key Requirements:**

- Username and password fields must not be empty
- Username must exist in database
- Password must match stored password
- User role must be STAFF or ADMIN
- Account must be active (not BANNED)
- User is redirected to admin dashboard upon successful login

---

## 3.3 Forum Module

### BR-07: View Posts - FE-07

**Rule Description:** Users can view forum posts with pagination and infinite scroll. Posts display content, images, hashtags, author information, reaction counts, comment counts, and save counts. Posts can be filtered by keyword search and hashtags, and sorted by creation date (descending by default).

**Key Requirements:**

- Posts are fetched with pagination (default 10 per page)
- Posts can be filtered by keyword search
- Posts can be filtered by hashtags
- Posts are sorted by creation date (descending by default)
- User's own reaction status is displayed if authenticated

---

### BR-08: Create Post - FE-08

**Rule Description:** Authenticated users can create forum posts with optional title, content, images, hashtags, and link preview metadata. Either title or content must be provided (not both empty). If content contains only links, title is not required. If content has text other than links, title is required. Hashtags are normalized to lowercase and deduplicated.

**Key Requirements:**

- User must be authenticated
- Either title or content must be provided
- If content contains only links, title is not required
- If content has text other than links, title is required
- Images must be valid image formats
- Hashtags are normalized to lowercase and deduplicated
- User action is logged

---

### BR-09: Update Post - FE-09

**Rule Description:** Post owners can update their existing posts. Users can modify title, content, images, and hashtags. Old images and hashtags are replaced with new ones. User must be the post owner to update.

**Key Requirements:**

- User must be authenticated
- User must be the post owner
- Post must exist
- Either title or content must be provided
- Old images are deleted, new ones uploaded
- Old hashtags are removed, new ones added

---

### BR-10: Delete Post - FE-10

**Rule Description:** Post owners, admins, or staff can delete posts. When a post is deleted, all related saved posts, comments, reactions, and images are also deleted (cascade delete). STAFF cannot delete ADMIN posts.

**Key Requirements:**

- User must be authenticated
- User must be post owner, ADMIN, or STAFF
- STAFF cannot delete ADMIN posts
- Post must exist
- All related data (saved posts, comments, reactions, images) are deleted

---

### BR-11: Save Post - FE-11

**Rule Description:** Authenticated users can save posts to their personal collection for later viewing. Users can save any post, including their own posts. Saved posts can include an optional note. Each user can only save each post once.

**Key Requirements:**

- User must be authenticated
- Post must exist
- User must not have already saved this post
- Post can be saved even if user is the author
- Save count for the post increases

---

### BR-12: Report Post - FE-12

**Rule Description:** Users can report posts that violate community guidelines. Reports are submitted to admins/staff for review. Users can only report each post once. Report status is set to PENDING upon creation.

**Key Requirements:**

- User must be authenticated
- Post must exist
- User must not have already reported this post
- Report reason should not be empty
- Report status is set to PENDING

---

### BR-13: React Post - FE-13

**Rule Description:** Users can react to posts with LIKE or DISLIKE reactions. Users can toggle their reaction: clicking the same reaction removes it, clicking a different reaction changes it. Reaction counts are displayed and updated in real-time.

**Key Requirements:**

- User must be authenticated
- Post must exist
- Reaction type must be LIKE or DISLIKE
- If user already reacted with same type, reaction is removed
- If user already reacted with different type, reaction is updated
- Post reaction count is updated

---

### BR-14: Search Posts - FE-14

**Rule Description:** Users can search for posts by keyword and/or filter by hashtags. Search results are paginated and sorted by relevance or date. Search keyword can be empty (shows all posts).

**Key Requirements:**

- Search keyword can be empty (searches all posts)
- Hashtags are normalized to lowercase
- Pagination parameters must be valid
- Sort field must be valid
- Results are displayed with pagination

---

### BR-15: Translate Post - FE-15

**Rule Description:** Users can translate post content into Korean using Gemini AI. The translated text is displayed below the original content. Users can toggle between showing and hiding the translation. Translation is cached if already translated.

**Key Requirements:**

- Post content must not be empty
- Gemini API must be accessible
- Translation request must be valid
- Translated text is displayed below original content
- User can toggle translation visibility

---

### BR-16: View Comments - FE-16

**Rule Description:** Users can view comments associated with a post. Comments can have replies (nested comments). Comments show author information, content, images, reaction counts, and creation timestamp. Comments are displayed in chronological order.

**Key Requirements:**

- Post must exist
- Comments are loaded for the specific post
- Replies are loaded for parent comments
- Comments are displayed in chronological order
- Reaction counts are accurate

---

### BR-17: Create Comment - FE-17

**Rule Description:** Authenticated users can create comments on posts. Comments can be top-level comments or replies to other comments. Comments can include text content and optional images. Comment content must not be empty.

**Key Requirements:**

- User must be authenticated
- Post must exist
- Comment content must not be empty
- If parent comment ID is provided, parent comment must exist
- Image must be valid format (if provided)
- User action is logged

---

### BR-18: Update Comment - FE-18

**Rule Description:** Comment owners can update their existing comments. Users can modify content and image. User must be the comment owner to update. Updated content must not be empty.

**Key Requirements:**

- User must be authenticated
- User must be the comment owner
- Comment must exist
- Updated content must not be empty

---

### BR-19: Delete Comment - FE-19

**Rule Description:** Comment owners, admins, or staff can delete comments. When a comment is deleted, all replies to that comment are also deleted (cascade delete). STAFF cannot delete ADMIN comments.

**Key Requirements:**

- User must be authenticated
- User must be comment owner, ADMIN, or STAFF
- STAFF cannot delete ADMIN comments
- Comment must exist
- All replies are deleted (cascade)

---

### BR-20: React Comment - FE-20

**Rule Description:** Users can react to comments with LIKE or DISLIKE reactions. Same toggle behavior as post reactions: clicking the same reaction removes it, clicking a different reaction changes it. Comment reaction count is updated.

**Key Requirements:**

- User must be authenticated
- Comment must exist
- Reaction type must be LIKE or DISLIKE
- Same toggle behavior as post reactions
- Comment reaction count is updated

---

### BR-21: Report Comment - FE-21

**Rule Description:** Users can report comments that violate community guidelines. Same functionality as reporting posts, but for comments. Users can only report each comment once.

**Key Requirements:**

- User must be authenticated
- Comment must exist
- User must not have already reported this comment
- Report reason should not be empty
- Report status is set to PENDING

---

### BR-22: Translate Comment - FE-22

**Rule Description:** Users can translate comment content into Korean using Gemini AI. Same functionality as translating posts, but for comments. Translated text is displayed below original content.

**Key Requirements:**

- Comment content must not be empty
- Gemini API must be accessible
- Translation request must be valid
- Translated text is displayed below original content
- User can toggle translation visibility

---

### BR-23: View Hashtags - FE-23

**Rule Description:** Users can view popular hashtags based on post count and total reactions. Hashtags are sorted by popularity (post count and reactions). Users can search for hashtags by keyword. Hashtags can be clicked to filter posts.

**Key Requirements:**

- Hashtags are sorted by popularity (post count and reactions)
- Hashtags can be searched by keyword
- Limit parameter controls how many hashtags are shown (default: 10)
- Hashtag statistics are accurate
- User can click hashtag to filter posts

---

## 3.4 Article Module

### BR-24: View Approved Articles - FE-24

**Rule Description:** Users can view articles that have been approved by admins/staff. Articles are crawled from external sources (DanangXanh) and translated into English and Korean. Only articles with status APPROVED are visible to regular users. Articles are displayed in user's selected language.

**Key Requirements:**

- Articles must have status APPROVED to be visible
- Articles are displayed in user's selected language
- Articles can be filtered by status (for admins/staff)
- Thumbnail images are displayed correctly

---

### BR-25: View List Of Upcoming Articles - FE-25

**Rule Description:** Admins/staff can view articles that are pending approval or have been crawled but not yet approved. This view is only accessible to admins and staff for content moderation. Articles with status PENDING are shown.

**Key Requirements:**

- User must have ADMIN or STAFF role
- Articles with status PENDING are shown
- Articles can be filtered by status
- Articles show original Vietnamese content and translated versions

---

### BR-26: Crawl Article - FE-26

**Rule Description:** System crawls articles from DanangXanh website, extracts article content, translates it to English and Korean using Gemini AI, and stores them in database with status PENDING for admin review. Crawler checks for existing articles to avoid duplicates and limits crawl to 2 articles per run.

**Key Requirements:**

- Crawler checks for existing articles to avoid duplicates
- Only crawls new articles (stops when existing article found)
- Limits crawl to 2 articles per run (configurable)
- Article content must be valid HTML
- Translation must succeed for article to be saved
- Articles are saved with status PENDING

---

### BR-27: Search Article - FE-27

**Rule Description:** Users can search for articles by keyword. Search can be performed on article titles, descriptions, and content across all languages (Vietnamese, English, Korean). Only APPROVED articles are returned for regular users. Admins/staff can search all statuses.

**Key Requirements:**

- Search keyword can be empty (shows all articles)
- Search is performed across all language versions
- Only APPROVED articles are returned for regular users
- Admins/staff can search all statuses
- Results are relevant to search query

---

### BR-28: Reject Articles - FE-28

**Rule Description:** Admins/staff can reject articles that don't meet quality standards or violate content policies. Rejected articles are not visible to regular users. Staff must have task: APPROVE_TOUR_BOOKING_AND_APPROVE_ARTICLE. Article status must be PENDING.

**Key Requirements:**

- User must have ADMIN or STAFF role
- Staff must have task: APPROVE_TOUR_BOOKING_AND_APPROVE_ARTICLE
- Article must exist
- Article status must be PENDING
- Article status changed to REJECTED
- Article remains in database for audit

---

### BR-29: Approve Articles - FE-29

**Rule Description:** Admins/staff can approve articles for public viewing. Approved articles become visible to all users on the articles page. Staff must have task: APPROVE_TOUR_BOOKING_AND_APPROVE_ARTICLE. Article must have valid content and translations.

**Key Requirements:**

- User must have ADMIN or STAFF role
- Staff must have task: APPROVE_TOUR_BOOKING_AND_APPROVE_ARTICLE
- Article must exist
- Article status must be PENDING
- Article must have valid content and translations
- Article status changed to APPROVED
- Article becomes visible to all users

---

### BR-30: Comment Article - FE-30

**Rule Description:** Users can create forum posts related to articles. Users can share their thoughts, ask questions, or discuss article content. This creates a forum post that references or discusses the article. Same validation as creating regular forum posts.

**Key Requirements:**

- User must be authenticated
- Post content must not be empty
- Article must exist (if referenced)
- Same validation as creating regular forum posts
- Post appears in forum
- Discussion about article begins

---

## 3.5 Tour Booking Module

### BR-31: View Tours - FE-31

**Rule Description:** Users can view public tours that have been approved by admins/staff. Tours display name, description, images, prices, duration, departure point, and ratings. Only tours with status PUBLIC are visible. Tours can be filtered by keyword, price range, and minimum rating.

**Key Requirements:**

- Tours must have status PUBLIC to be visible
- Tours can be filtered by keyword, price range, and minimum rating
- Tours support pagination
- Tour images are displayed correctly
- Tour ratings and reviews are shown

---

### BR-32: Rate Tour - FE-32

**Rule Description:** Users can rate and review tours they have booked. Users can provide a rating (1-5 stars), written review, and optional images. Users can only rate each tour once. Tour average rating is updated when new rating is added.

**Key Requirements:**

- User must be authenticated
- User must have role USER
- Tour must exist
- User can only rate each tour once
- Rating must be between 1 and 5
- Review text is optional but recommended
- Tour average rating is updated

---

### BR-33: Book Tour - FE-33

**Rule Description:** Users can create a booking for a tour. The booking process includes selecting departure date, providing guest information, contact details, and payment. Departure date must be valid (after deadline + 1 day, before expiration date). Guest counts must match actual guest information provided. At least one adult guest required.

**Key Requirements:**

- User must be authenticated with role USER
- Tour must exist and be PUBLIC
- Departure date must be valid (after deadline + 1 day, before expiration date)
- Guest counts must match actual guest information provided
- At least one adult guest required
- Contact information must be valid
- Booking status is PENDING_PAYMENT
- Auto-failed date is set (deadline days from now)

---

### BR-34: View Tour Rates - FE-34

**Rule Description:** Users can view all ratings and reviews for a specific tour, including user names, ratings, review text, images, and creation dates. Average rating for the tour is calculated and displayed. Only approved/completed bookings can have ratings.

**Key Requirements:**

- Tour must exist
- Ratings are loaded for the specific tour
- Only approved/completed bookings can have ratings
- Ratings are displayed in chronological order
- Average rating is calculated correctly

---

### BR-35: View Available Vouchers For Tour - FE-35

**Rule Description:** Users can view vouchers that are available for a specific tour. Vouchers can be company-wide or tour-specific. Vouchers must be ACTIVE, within valid date range, have remaining quantity, and meet minimum order value (if specified).

**Key Requirements:**

- Tour must exist
- Vouchers must belong to the tour's company
- Vouchers must be ACTIVE
- Vouchers must be within valid date range
- Vouchers must have remaining quantity
- Vouchers must meet minimum order value (if specified)

---

### BR-36: View Available Vouchers For Booking - FE-36

**Rule Description:** During booking process, users can view vouchers available for the current booking, showing preview of discount amount and final total. Booking must be in PENDING_PAYMENT status. Vouchers must be valid for the booking's tour and meet minimum order value.

**Key Requirements:**

- Booking must exist
- Booking must be in PENDING_PAYMENT status
- Vouchers must be valid for the booking's tour
- Voucher must meet minimum order value
- Booking total must be calculated correctly
- Discount is calculated correctly
- Final total updates when voucher is selected

---

### BR-37: View All Vouchers - FE-37

**Rule Description:** Users can view all vouchers in the system. Admins can view all vouchers. Companies can only view their own vouchers. Vouchers display code, company name, discount information, valid date range, status, remaining quantity, and associated tours.

**Key Requirements:**

- User must be authenticated
- Admins can view all vouchers
- Companies can only view their own vouchers
- Vouchers are displayed with all information
- User can filter/search vouchers

---

### BR-38: Update Booking - FE-38

**Rule Description:** Users can update booking information when company requests changes. Booking status must be WAITING_FOR_UPDATE. Users can modify guest information, contact details, and other booking fields. Guest counts must match. After update, booking status changes to WAITING_FOR_APPROVED.

**Key Requirements:**

- User must be authenticated
- Booking must exist
- Booking status must be WAITING_FOR_UPDATE
- User must be the booking owner
- Updated information must be valid
- Guest counts must match
- Booking status changes to WAITING_FOR_APPROVED after update

---

### BR-39: View Booking History - FE-39

**Rule Description:** Users can view all bookings made by them, showing booking status, tour information, dates, and amounts. Bookings are filtered by user email and sorted by creation date (newest first).

**Key Requirements:**

- User must be authenticated
- Bookings are filtered by user email
- Bookings are sorted by creation date (newest first)
- Booking statuses are accurate
- Payment information is displayed

---

### BR-40: Create Complaint - FE-40

**Rule Description:** Users can create complaints about bookings that have been completed. Booking status must be BOOKING_SUCCESS_WAIT_FOR_CONFIRMED. Complaints are reviewed by admins/staff for resolution. Complaint message must not be empty. Booking status changes to BOOKING_UNDER_COMPLAINT.

**Key Requirements:**

- User must be authenticated with role USER
- Booking must exist
- Booking status must be BOOKING_SUCCESS_WAIT_FOR_CONFIRMED
- Complaint message must not be empty
- Booking status changes to BOOKING_UNDER_COMPLAINT
- Complaint is visible to admins/staff

---

## 3.6 User Module

### BR-41: View And Update Personal Information - FE-41

**Rule Description:** Users can view and update their personal information including username, email, phone, address, avatar, and other profile details. Email cannot be changed. Username and phone must be unique if changed. Avatar must be valid image format.

**Key Requirements:**

- User must be authenticated
- Username must be unique (if changed)
- Phone must be unique (if changed)
- Avatar must be valid image format
- Email cannot be changed
- Changes are saved successfully

---

### BR-42: View List Of Messages - FE-42

**Rule Description:** Users can view a list of conversations/messages they have participated in. Messages are filtered by user. Conversations are sorted by last message time. Users can see all their chat conversations with other users.

**Key Requirements:**

- User must be authenticated
- Messages are filtered by user
- Conversations are sorted by last message time
- Unread message count is displayed
- User can click conversation to view messages

---

### BR-43: View List Of Notifications - FE-43

**Rule Description:** Users can view all notifications including booking updates, new messages, system announcements, etc. Notifications can be marked as read/unread. Notifications are filtered by user, paginated, and sorted by creation date (newest first). Real-time notifications via WebSocket.

**Key Requirements:**

- User must be authenticated
- Notifications are filtered by user
- Notifications are paginated
- Notifications are sorted by creation date (newest first)
- Unread count is displayed
- Real-time notifications via WebSocket

---

### BR-44: View Transaction History - FE-44

**Rule Description:** Users can view all financial transactions made by them, including payments for bookings, refunds, and other transactions. Transactions are filtered by user ID and sorted by date (newest first). Users can filter transactions by status.

**Key Requirements:**

- User must be authenticated
- Transactions are filtered by user ID
- Transactions are sorted by date (newest first)
- Transaction amounts are accurate
- User can filter transactions by status

---

### BR-45: Chat Realtime - FE-45

**Rule Description:** Users can send and receive messages instantly using WebSocket. Users can see typing indicators and receive message delivery status. WebSocket connection must be established. Message text must not be empty. Receiver must exist.

**Key Requirements:**

- User must be authenticated
- Receiver must exist
- Message text must not be empty
- WebSocket connection must be established
- Messages are sent successfully
- Messages are received in real-time
- Message history is loaded

---

### BR-46: Create Ticket For System - FE-46

**Rule Description:** Users can create support tickets for system issues, questions, or requests. Tickets are sent to admins/staff for handling. Ticket subject and description must not be empty. User receives confirmation after ticket creation.

**Key Requirements:**

- User must be authenticated
- Ticket subject must not be empty
- Ticket description must not be empty
- Ticket is sent to admins/staff
- User receives confirmation

---

### BR-47: Approve Tour Completed - FE-47

**Rule Description:** Users can confirm that a tour has been completed. Booking status must be BOOKING_SUCCESS_WAIT_FOR_CONFIRMED. Tour end date must have passed. Both user and company can confirm. If both confirm (or one confirms and 3 days pass), payment is released to company.

**Key Requirements:**

- User must be authenticated
- Booking must exist
- Booking status must be BOOKING_SUCCESS_WAIT_FOR_CONFIRMED
- Tour end date must have passed
- If both confirm, booking status changes to BOOKING_SUCCESS
- Payment is distributed to company

---

### BR-48: Change Password - FE-48

**Rule Description:** Authenticated users can change their password by providing current password and new password. Current password must be correct. New password must meet requirements (minimum 8 characters). New password and confirm password must match. New password cannot be the same as current password.

**Key Requirements:**

- User must be authenticated
- Current password must be correct
- New password must meet requirements (minimum 8 characters)
- New password and confirm password must match
- New password cannot be the same as current password
- Password changed successfully

---

### BR-49: Sign Out - FE-49

**Rule Description:** Users can log out of the system. JWT token is invalidated (blacklisted). User session is cleared. User is redirected to login page. Token must be valid for logout to succeed.

**Key Requirements:**

- User must be authenticated
- Token must be valid
- JWT token is invalidated (blacklisted)
- User session is cleared
- User is redirected to login page

---

## 3.7 Company Dashboard Module

### BR-50: Create Tour - FE-50

**Rule Description:** COMPANY role users can create new tours with detailed information. Main tour image is required. Tour expiration date must be after deadline + 1 day. All required fields must be filled. Prices must be valid numbers. Tour status is set to NOT_APPROVED upon creation.

**Key Requirements:**

- User must have COMPANY role
- Main tour image is required
- Tour expiration date must be after deadline + 1 day
- All required fields must be filled
- Prices must be valid numbers
- Tour status is set to NOT_APPROVED
- Tour images are uploaded
- Tour contents are saved

---

### BR-51: Update Tour - FE-51

**Rule Description:** COMPANY role users can update their existing tours. User must own the tour. All tour fields can be modified. Old contents are cleared, new ones added. Optional new main image replaces old one. Same validation rules as create tour apply.

**Key Requirements:**

- User must be COMPANY role
- User must own the tour
- Tour must exist
- Old contents are cleared
- New contents are saved
- Images are updated
- Same validation rules as create tour

---

### BR-52: Delete Tour - FE-52

**Rule Description:** COMPANY role users can delete their tours. User must own the tour. If tour has bookings, it's disabled instead of deleted. If no bookings, it's permanently deleted. All related data is removed.

**Key Requirements:**

- User must be COMPANY role
- User must own the tour
- Tour must exist
- If tour has bookings: Tour status changes to DISABLED
- If tour has no bookings: Tour is permanently deleted

---

### BR-53: View Own Tour - FE-53

**Rule Description:** COMPANY role users can view all tours created by them, showing tour status, booking counts, and other tour information. Tours are filtered by company ID. Company can see all their tours regardless of status.

**Key Requirements:**

- User must be COMPANY role
- Tours are filtered by company ID
- Tours are displayed with status information
- Booking counts are displayed

---

### BR-54: View Tour's Bookings - FE-54

**Rule Description:** COMPANY role users can view all bookings for a specific tour. Tour must belong to the company. Bookings are filtered by tour ID. Bookings display status, guest information, dates, and amounts.

**Key Requirements:**

- User must be COMPANY role
- Tour must belong to the company
- Bookings are filtered by tour ID
- Bookings are displayed with all information
- Company can filter bookings by status

---

### BR-55: View Tour's Booking Details - FE-55

**Rule Description:** COMPANY role users can view detailed information about a specific booking. Booking must belong to company's tour. Details include all guest information, contact details, insurance status, and booking history. Company can see insurance status for each guest.

**Key Requirements:**

- User must be COMPANY role
- Booking must belong to company's tour
- All guest information is displayed
- Company can see insurance status for each guest
- Company can update insurance status

---

### BR-56: Approve Booking - FE-56

**Rule Description:** COMPANY role users can approve bookings. Booking must belong to company's tour. Booking status must be WAITING_FOR_APPROVED. Booking status changes to BOOKING_SUCCESS_PENDING (waiting for payment) or BOOKING_SUCCESS_WAIT_FOR_CONFIRMED (if already paid). Customer is notified via email and notification.

**Key Requirements:**

- User must be COMPANY role
- Booking must belong to company's tour
- Booking status must be WAITING_FOR_APPROVED
- Customer is notified via email and notification
- Booking moves to next status

---

### BR-57: Reject Booking - FE-57

**Rule Description:** COMPANY role users can reject bookings with an optional reason message. Booking must belong to company's tour. Booking status must be WAITING_FOR_APPROVED. Booking status changes to BOOKING_REJECTED. Customer is notified via email and notification.

**Key Requirements:**

- User must be COMPANY role
- Booking must belong to company's tour
- Booking status must be WAITING_FOR_APPROVED
- Booking status updated to REJECTED
- Customer is notified via email and notification
- Booking is removed from active bookings

---

### BR-58: Create Booking Update Request - FE-58

**Rule Description:** COMPANY role users can request customers to update their booking information. Booking must belong to company's tour. Booking status must be WAITING_FOR_APPROVED. Booking status changes to WAITING_FOR_UPDATE. Customer is notified via email and notification.

**Key Requirements:**

- User must be COMPANY role
- Booking must belong to company's tour
- Booking status must be WAITING_FOR_APPROVED
- Message should not be empty
- Booking status updated to WAITING_FOR_UPDATE
- Customer is notified via email and notification

---

### BR-59: Create Voucher - FE-59

**Rule Description:** COMPANY role users can create discount vouchers for their tours. Voucher code must be unique for the company. Discount can be percentage-based or fixed amount. Voucher can be linked to specific tours or apply to all company tours. Remaining quantity equals total quantity initially.

**Key Requirements:**

- User must be COMPANY role
- Voucher code must be unique for the company
- Discount value must be positive
- End date must be after start date
- Total quantity must be positive
- Voucher is linked to specified tours (or all company tours)
- Remaining quantity equals total quantity initially

---

### BR-60: View Company's Vouchers - FE-60

**Rule Description:** COMPANY role users can view all vouchers created by them, showing voucher details, usage statistics, and status. Vouchers are filtered by company ID. Company can see usage statistics.

**Key Requirements:**

- User must be COMPANY role
- Vouchers are filtered by company ID
- Vouchers are displayed with all information
- Company can see usage statistics

---

### BR-61: Approve Tour Completed - FE-61

**Rule Description:** COMPANY role users can confirm that a tour has been completed. Booking must belong to company's tour. Booking status must be BOOKING_SUCCESS_WAIT_FOR_CONFIRMED. Tour end date must have passed. If both user and company confirm, booking status changes to BOOKING_SUCCESS and payment is distributed to company (90%) and admin (10%).

**Key Requirements:**

- User must be COMPANY role
- Booking must belong to company's tour
- Booking status must be BOOKING_SUCCESS_WAIT_FOR_CONFIRMED
- Tour end date must have passed
- If both confirm, booking status changes to BOOKING_SUCCESS
- Payment is distributed to company (90%) and admin (10%)

---

### BR-62: Share Tour - FE-62

**Rule Description:** COMPANY role users can share their tours via social media, email, or copy link. A shareable URL is generated for the tour. Tour must exist and belong to company. Share modal displays tour preview.

**Key Requirements:**

- User must be COMPANY role
- Tour must exist
- Tour must belong to company
- Share URL is generated successfully
- User can copy link
- User can share via social media

---

### BR-63: Change Booking Guest Insurance Status - FE-63

**Rule Description:** COMPANY role users can update the insurance status for individual guests in a booking. Booking guest must exist. Booking must belong to company's tour. Insurance status can be Success, Failed, or Pending. Status change is saved.

**Key Requirements:**

- User must be COMPANY role
- Booking guest must exist
- Booking must belong to company's tour
- Insurance status must be valid enum value
- Status change is saved
- Updated status is displayed in booking details

---

## 3.8 Admin Dashboard Module

### BR-64: View List Of Users - FE-64

**Rule Description:** ADMIN role users can view all users in the system, showing user information, roles, status, and allowing admins to manage users. Users are displayed with pagination. Users can be filtered by role and status.

**Key Requirements:**

- User must have ADMIN role
- Users are displayed with pagination
- Users can be filtered by role and status
- All user information is displayed
- Admin can view user details

---

### BR-65: View List Of Reports - FE-66

**Rule Description:** ADMIN or STAFF role users can view all reports submitted by users for forum posts and comments. Staff must have task: FORUM_REPORT_AND_BOOKING_COMPLAINT. Reports are paginated and can be filtered by status. Reports show reporter information, target type, target preview, report reason, and status.

**Key Requirements:**

- User must have ADMIN or STAFF role
- Staff must have task: FORUM_REPORT_AND_BOOKING_COMPLAINT
- Reports are paginated
- Reports can be filtered by status
- Reports are displayed with all information
- Report statistics are displayed

---

### BR-66: View System Transaction - FE-67

**Rule Description:** ADMIN role users can view all financial transactions in the system, including payments, refunds, and revenue distribution. Transactions are displayed with pagination. Transactions can be filtered by status and date. Revenue distribution (company share, admin share) is shown.

**Key Requirements:**

- User must have ADMIN role
- Transactions are displayed with pagination
- Transactions can be filtered by status and date
- All transaction details are displayed
- Admin can view transaction statistics

---

### BR-67: Create Staff Account - FE-68

**Rule Description:** ADMIN role users can create new staff accounts with specific tasks/permissions. Username and email must be unique. Password must meet requirements. At least one staff task must be assigned. Staff has role STAFF and can login with username.

**Key Requirements:**

- User must have ADMIN role
- Username must be unique
- Email must be unique
- Password must meet requirements
- At least one staff task must be assigned
- Staff has role STAFF
- Staff can login with username

---

### BR-68: Delete Staff Account - FE-69

**Rule Description:** ADMIN role users can delete staff accounts. Staff account must exist. Cannot delete own account (if admin is also staff). Deleted staff accounts can no longer access the system.

**Key Requirements:**

- User must have ADMIN role
- Staff account must exist
- Cannot delete own account
- Staff can no longer login
- Staff is removed from staff list

---

### BR-69: Update Staff's Task - FE-70

**Rule Description:** ADMIN role users can update the tasks/permissions assigned to staff accounts. Staff account must exist. At least one task must be assigned. Staff tasks determine what administrative functions staff can perform.

**Key Requirements:**

- User must have ADMIN role
- Staff account must exist
- At least one task must be assigned
- Staff permissions are updated
- Staff can now perform new tasks

---

### BR-70: Change User Status - FE-71

**Rule Description:** ADMIN or STAFF role users can ban or unban users. User account must exist. Cannot ban/unban own account. Cannot change own role. Banned users cannot login or use the system. Unbanned users can login again.

**Key Requirements:**

- User must have ADMIN or STAFF role
- User account must exist
- Cannot modify own account
- If banned: User cannot login
- If unbanned: User can login again
- User status is reflected in user list

---

### BR-71: Change Tour Status - FE-72

**Rule Description:** ADMIN or STAFF role users can approve or reject tours created by companies. Staff must have task: APPROVE_TOUR_BOOKING_AND_APPROVE_ARTICLE. Tour must exist. If approved, tour becomes PUBLIC and visible to users. If rejected, tour remains NOT_APPROVED. Company is notified.

**Key Requirements:**

- User must have ADMIN or STAFF role
- Staff must have task: APPROVE_TOUR_BOOKING_AND_APPROVE_ARTICLE
- Tour must exist
- If approved: Tour becomes PUBLIC and visible to users
- If rejected: Tour remains NOT_APPROVED
- Company is notified

---

### BR-72: Send Notifications - FE-73

**Rule Description:** ADMIN role users can send system-wide notifications to all users or specific user groups. Title and message must not be empty. Target users must be valid. Notifications are delivered via in-app notification and WebSocket. Users receive notification via WebSocket and notification appears in users' notification list.

**Key Requirements:**

- User must have ADMIN role
- Title must not be empty
- Message must not be empty
- Target users must be valid
- Notification is delivered to target users
- Users receive notification via WebSocket
- Notification appears in users' notification list

---

### BR-73: View All Complaints - FE-74

**Rule Description:** ADMIN or authorized STAFF users can view all booking complaints submitted by users. Complaints are shown with booking context and current resolution status, supporting triage and workload management.

**Key Requirements:**

- User must have ADMIN or STAFF role
- Staff must have appropriate task/permission to handle booking complaints
- Complaints are paginated and can be filtered (by status, date, tour/company, etc.)
- Each complaint shows booking ID, user, message, and status

---

### BR-74: View Complaint Detail - FE-75

**Rule Description:** ADMIN or authorized STAFF can view detailed information of a specific booking complaint, including full complaint content, linked booking data, and resolution information, to support informed decision-making.

**Key Requirements:**

- User must have ADMIN or STAFF role
- Staff must have appropriate task/permission
- Complaint ID must exist
- Linked booking must exist and be loaded correctly
- All key fields (complaint message, created date, booking summary, current resolution) are displayed

---

### BR-75: Resolve Booking Complaint - FE-76

**Rule Description:** ADMIN or authorized STAFF can resolve booking complaints by selecting a resolution type (e.g., USER_FAULT, COMPANY_FAULT, NO_FAULT). The system updates complaint resolution info, may update booking status, and can trigger revenue distribution when appropriate.

**Key Requirements:**

- User must have ADMIN or STAFF role
- Staff must have task/permission: FORUM_REPORT_AND_BOOKING_COMPLAINT
- Complaint must exist and not already be resolved
- Resolution type must be a valid enum value
- Booking linked to complaint must exist
- Booking status is updated based on resolution type (ví dụ: chuyển về BOOKING_SUCCESS cho USER_FAULT/NO_FAULT)
- Revenue distribution logic is executed when complaint is resolved in favor of company/admin

## Summary

This document contains all 75 Business Rules (BR-01 to BR-75) corresponding to the features (FE-01 to FE-76, excluding FE-65) across all modules:

- **Authentication Module:** BR-01 to BR-06 (6 rules)
- **Forum Module:** BR-07 to BR-23 (17 rules)
- **Article Module:** BR-24 to BR-30 (7 rules)
- **Tour Booking Module:** BR-31 to BR-40 (10 rules)
- **User Module:** BR-41 to BR-49 (9 rules)
- **Company Dashboard Module:** BR-50 to BR-63 (14 rules)
- **Admin Dashboard Module:** BR-64 to BR-75 (12 rules)

**Note:** FE-65 is not included in the original feature list, so BR-65 corresponds to FE-66 (View List Of Reports). Total: 75 Business Rules covering 76 features.
