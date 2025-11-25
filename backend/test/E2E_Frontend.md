# End-to-End Testing Documentation for Participium Frontend

## Test Scenarios

### 1. User Registration and Authentication

#### Scenario: Citizen Registration
**Description**: A new citizen registers for an account and logs in successfully.

**Steps**:
1. Navigate to the registration page
2. Navigate to login page
3. Enter credentials and login
4. Verify dashboard access

**Results**:
- Registration form accepts valid input
- Login successful with valid credentials
- User profile information displayed in dashboard

### 2. Report Creation Workflow

#### Scenario: Citizen Submits a New Report
**Description**: An authenticated citizen creates a new report with photos and location data.

**Steps**:
1. Login as a citizen user
2. Navigate to the report creation page
3. Fill in report details:
   - Title
   - Description
   - Category (dropdown selection)
   - Location (map click or coordinate input)
4. Upload 1-3 photos
5. Submit the report
6. Verify success confirmation

**Results**:
- Form validation works correctly
- Map integration allows location selection
- Report appears in the map

### 3. Municipal Authority Workflow

#### Scenario: Municipality User Manages Reports
**Description**: A municipality user reviews, approves, or rejects pending reports.

**Steps**:
1. Login as municipality user
2. Access municipality dashboard
3. View pending reports list
4. Select a report for review
5. Approve the report (assign to office)

**Expected Results**:
- Municipality dashboard shows pending reports
- Report details include all submitted information
- Approval assigns report to appropriate office

### 5. Administrative Functions

#### Scenario: Admin Manages Users and System
**Description**: An admin user manages user accounts and system settings.

**Steps**:
1. Login as admin user
2. Access admin panel
3. Create municipality user account

**Expected Results**:
- Admin panel accessible only to admins
- User creation forms work correctly
