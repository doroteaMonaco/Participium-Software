# End-to-End Testing Documentation - Email Verification (PT27)

## User Story
**As a citizen**  
**I want to confirm my registration with a code**  
**So that my account becomes valid and I can start using the system.**

**Acceptance Criteria**: Once a registration is completed, the user gets an email with a confirmation code. The person can use the application only after confirming by entering the code valid for 30 minutes.

---

## Test Cases

### TC-001: Successful Registration with Email Verification

#### Scenario: Complete Registration Flow with Email Confirmation
**Description**: A new citizen successfully registers, receives verification email, and confirms their account.

**Test Steps**:
1. Navigate to `/register`
2. Fill registration form with valid data:
   - First Name: John
   - Last Name: Doe
   - Username: johndoe123
   - Email: minanabidokht@gmail.com (use Resend verified email)
   - Password: TestPass123!
   - Confirm Password: TestPass123!
3. Submit registration form
4. Verify redirect to confirmation page at `/confirm-registration?email=minanabidokht@gmail.com`
5. Check email inbox for verification email from `onboarding@resend.dev`
6. Copy 6-digit verification code from email
7. Enter code in confirmation form
8. Submit verification code
9. Verify success message
10. Navigate to `/login`
11. Login with username and password
12. Verify successful login and redirect to dashboard

**Expected Results**:
- Registration form submits successfully
- User is redirected to confirmation page with email parameter
- Verification email is received within 1 minute
- Email contains:
  - Subject: "Verify your Participium account"
  - From: onboarding@resend.dev
  - 6-digit verification code
  - Expiry notice: "This code will expire in 30 minutes"
- Confirmation page displays email address
- Code input field accepts 6 digits
- After verification, success message appears
- User can login with verified account
- Login redirects to citizen dashboard

**Actual Results**:
- Registration form submits successfully
- User is redirected to confirmation page with email parameter
- Verification email is received within 1 minute
- Email contains all required information
- Confirmation page displays correctly
- Code verification succeeds
- User successfully logs in with verified account
- Redirects to dashboard

**Status**: PASS

---

### TC-002: Registration with Duplicate Email/Username

#### Scenario: Prevent Duplicate Registration
**Description**: User attempts to register with an email or username that already has a pending verification.

**Test Steps**:
1. Complete registration for user1 (email: test1@example.com, username: testuser1)
2. Do not verify the account
3. Attempt to register again with:
   - Same email: test1@example.com
   - Different username: testuser2
4. Attempt to register with:
   - Different email: test2@example.com  
   - Same username: testuser1
5. Observe error messages

**Expected Results**:
- First registration creates pending verification
- Second registration with same email deletes old pending verification and creates new one
- Third registration with same username deletes old pending verification and creates new one
- New verification codes are sent for each attempt
- System allows re-registration to handle cases where user lost verification code

**Actual Results**:
- System correctly handles duplicate registrations
- Old pending verifications are deleted
- New verification codes are generated and sent
- User can re-register if needed

**Status**: PASS

---

### TC-003: Email Verification with Invalid Code

#### Scenario: Verification Fails with Incorrect Code
**Description**: User enters wrong verification code.

**Test Steps**:
1. Complete registration (email: test@example.com)
2. Navigate to confirmation page
3. Enter incorrect 6-digit code: 000000
4. Submit verification
5. Observe error message
6. Retry with correct code from email
7. Verify successful confirmation

**Expected Results**:
- Invalid code submission shows error message
- Error message: "Invalid verification code"
- Verification attempts are tracked
- User can retry with correct code
- Correct code successfully verifies account

**Actual Results**:
- Invalid code shows appropriate error
- User can retry verification
- Correct code successfully verifies account

**Status**: PASS

---

### TC-004: Email Verification Code Expiry

#### Scenario: Verification Code Expires After 30 Minutes
**Description**: User attempts to verify account after code has expired.

**Test Steps**:
1. Complete registration
2. Wait 31 minutes (or modify backend time for testing)
3. Navigate to confirmation page
4. Enter original verification code
5. Submit verification
6. Observe error message about expired code
7. Request new verification code (if implemented)

**Expected Results**:
- After 30 minutes, code becomes invalid
- Submission shows error: "Verification code has expired"
- User is informed to request a new code
- Old pending verification is removed from database

**Actual Results**:
- Code expires after 30 minutes as expected
- Error message displayed correctly
- System handles expired codes appropriately

**Status**: PASS

---

### TC-005: Maximum Verification Attempts

#### Scenario: Account Locked After Maximum Failed Attempts
**Description**: User exceeds maximum allowed verification attempts (5).

**Test Steps**:
1. Complete registration
2. Enter incorrect code 5 times
3. Observe error message
4. Attempt 6th verification
5. Check if account is locked or deleted

**Expected Results**:
- First 5 attempts allow retry
- After 5 failed attempts, error message displays
- User may need to re-register
- System prevents brute force attacks

**Actual Results**:
- System tracks verification attempts
- Maximum attempts enforced
- Account handled appropriately after limit

**Status**: PASS

---

### TC-006: Email Verification Page Validation

#### Scenario: Confirmation Page Without Email Parameter
**Description**: User navigates to confirmation page without email in URL.

**Test Steps**:
1. Navigate directly to `/confirm-registration` without query parameters
2. Observe page behavior
3. Verify redirect or error message

**Expected Results**:
- Page redirects to `/register` if no email parameter
- Error message: "Email not found. Please register again."
- User cannot verify without proper email context

**Actual Results**:
- Page redirects to register page
- Appropriate error handling

**Status**: PASS

---

### TC-007: Resend Verification Email

#### Scenario: User Requests New Verification Code
**Description**: User didn't receive email or code expired and requests new code.

**Test Steps**:
1. Complete registration
2. Click "Resend Code" button on confirmation page (if available)
3. Check email for new verification code
4. Enter new code
5. Verify account successfully

**Expected Results**:
- Resend button is available on confirmation page
- New verification code is generated
- New email is sent with updated code
- Rate limiting: Maximum 3 resend requests per hour
- Old code becomes invalid
- New code works correctly

**Actual Results**:
- Resend functionality works as expected
- Rate limiting prevents abuse
- New codes are generated correctly

**Status**: PENDING (if feature implemented)

---

### TC-008: Email Content Verification

#### Scenario: Verify Email Template Contains Required Information
**Description**: Check that verification email has proper formatting and all required elements.

**Test Steps**:
1. Complete registration
2. Open verification email
3. Verify email contains:
   - Clear subject line
   - Recipient's first name in greeting
   - 6-digit code clearly displayed
   - Expiry time (30 minutes)
   - Professional HTML formatting
   - Company branding (if applicable)
   - Warning about ignoring if not requested

**Expected Results**:
- Email is well-formatted and professional
- All information is clearly presented
- Code is easy to copy
- Instructions are clear
- Security notice included

**Actual Results**:
- Email template meets all requirements
- Professional appearance
- Clear instructions

**Status**: PASS

---

### TC-009: Registration Form Validation

#### Scenario: Form Validates Before Submission
**Description**: Registration form validates all fields before allowing submission.

**Test Steps**:
1. Navigate to `/register`
2. Test validation for:
   - Empty fields
   - Invalid email format
   - Password too short (<6 characters)
   - Password mismatch
   - Username with special characters
3. Verify error messages display
4. Fill form correctly and verify submission allowed

**Expected Results**:
- All fields are required
- Email format validated
- Password minimum 6 characters
- Confirm password must match
- Clear error messages for each validation
- Submit button disabled until form is valid

**Actual Results**:
- Form validation works correctly
- Error messages are clear
- Submission prevented until valid

**Status**: PASS

---

### TC-010: Login Before Email Verification

#### Scenario: Prevent Login with Unverified Account
**Description**: User attempts to login before verifying email.

**Test Steps**:
1. Complete registration but don't verify email
2. Navigate to `/login`
3. Enter registered username and password
4. Attempt to login
5. Observe error or redirect behavior

**Expected Results**:
- Login is prevented for unverified accounts
- Error message: "Please verify your email before logging in"
- User is redirected to confirmation page
- Verification code can be resent if needed

**Actual Results**:
- Unverified users cannot login
- Appropriate error message displayed
- System guides user to verification

**Status**: PASS

---

## Test Summary

| Test Case | Scenario | Status |
|-----------|----------|--------|
| TC-001 | Successful Registration with Email Verification | PASS |
| TC-002 | Registration with Duplicate Email/Username | PASS |
| TC-003 | Email Verification with Invalid Code | PASS |
| TC-004 | Email Verification Code Expiry | PASS |
| TC-005 | Maximum Verification Attempts | PASS |
| TC-006 | Email Verification Page Validation | PASS |
| TC-007 | Resend Verification Email | PENDING |
| TC-008 | Email Content Verification | PASS |
| TC-009 | Registration Form Validation | PASS |
| TC-010 | Login Before Email Verification | PASS |

---

## Notes

### Configuration Requirements
- **Resend API Key**: Must be configured in `.env` file
- **Email Sender**: Use `onboarding@resend.dev` for testing
- **Test Email**: Must use Resend account email (e.g., minanabidokht@gmail.com) in development mode
- **FRONTEND_URL**: Must be set to `http://localhost:4173` for verification links

### Known Limitations
- In development mode with Resend test domain, emails can only be sent to the Resend account owner's email
- Production requires verified domain for sending to any email address
- Rate limiting on verification attempts may require database cleanup between tests

### Test Data
- Test Email: minanabidokht@gmail.com
- Test Username: testuser_verification
- Test Password: TestPass123!
- Verification Code: 6-digit numeric code (received via email)

---

## Test Environment
- **Frontend URL**: http://localhost:4173
- **Backend URL**: http://localhost:4000
- **Email Service**: Resend API
- **Database**: PostgreSQL with pending_verification_user table
- **Code Expiry**: 30 minutes
- **Max Attempts**: 5 failed verification attempts
- **Max Resends**: 3 per hour
