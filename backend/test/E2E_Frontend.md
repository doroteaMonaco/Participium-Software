# End-to-End Testing Documentation for Participium Frontend

## Test Cases

### TC-001: User Registration and Authentication

#### Scenario: Successful Citizen Registration
**Description**: A new citizen successfully registers and logs in.

**Test Steps**:
1. Navigate to `/register`
2. Fill registration form with valid data:
   - Username: testuser001
   - Email: testuser001@example.com
   - Password: TestPass123!
   - First Name: John
   - Last Name: Doe
3. Submit registration
4. Navigate to `/login`
5. Enter credentials (username/email and password)
6. Click login button
7. Verify dashboard access

**Expected Results**:
- Registration succeeds with success message
- User is redirected to login page
- Login succeeds and redirects to dashboard

**Actual Results**:
- Registration succeeds with success message
- User is redirected to login page
- Login succeeds and redirects to dashboard

**Status**: PASS

#### Scenario: Registration with Invalid Data
**Description**: Registration fails with invalid input.

**Test Steps**:
1. Navigate to `/register`
2. Attempt registration with:
   - Invalid email format
   - Password too short (<6 characters)
   - Empty required fields
3. Submit form

**Expected Results**:
- Form validation prevents submission
- Error messages displayed for each invalid field
- Registration does not proceed

**Actual Results**:
- Form validation prevents submission
- Error messages displayed for each invalid field
- Registration does not proceed

**Status**: PASS

### TC-002: Report Creation Workflow
**Expected Results**:
- Registration succeeds with success message
- User is redirected to login page
- Login succeeds and redirects to dashboard

**Actual Results**:
- Registration succeeds with success message
- User is redirected to login page
- Login succeeds and redirects to dashboard

**Status**: PASS

#### Scenario: Registration with Invalid Data
**Description**: Registration fails with invalid input.

**Test Steps**:
1. Navigate to `/register`
2. Attempt registration with:
   - Invalid email format
   - Password too short (<6 characters)
   - Empty required fields
3. Submit form

**Expected Results**:
- Form validation prevents submission
- Error messages displayed for each invalid field
- Registration does not proceed

**Actual Results**:
- Form validation prevents submission
- Error messages displayed for each invalid field
- Registration does not proceed

**Status**: PASS

### TC-002: Report Creation Workflow

#### Scenario: Successful Report Submission
**Description**: Authenticated citizen creates and submits a report.

**Test Steps**:
1. Navigate to `/reports/new`
2. Fill report form:
   - Title: "Pothole on Main Street"
   - Description: "Large pothole causing traffic hazard"
   - Category: Select "Road Damage"
   - Location: Click on map at coordinates (45.123, 7.456)
3. Upload 2 photos
4. Submit report
5. Verify success confirmation
6. Check report appears on map

**Expected Results**:
- Form accepts all inputs
- Map shows selected location
- Photos upload successfully with preview
- Submission succeeds with confirmation message
- Report appears on main map with correct details
- Report status shows as "Pending Approval"

**Actual Results**:
 Form accepts all inputs
- Map shows selected location
- Photos upload successfully with preview
- Submission succeeds with confirmation message
- Report appears on main map with correct details
- Report status shows as "Pending Approval"

**Status**: PASS

#### Scenario: Report Submission with Validation Errors
**Description**: Report submission fails due to validation errors.

**Test Steps**:
1. Navigate to `/reports/new`
2. Attempt submission with:
   - Empty title
   - Description too short (<10 characters)
   - No photos uploaded
   - Invalid file type for photos
3. Submit form

**Expected Results**:
- Validation errors displayed for each invalid field
- Form prevents submission until errors are fixed
- Clear error messages guide user to correct inputs

**Actual Results**:
- Validation errors displayed for each invalid field
- Form prevents submission until errors are fixed
- Clear error messages guide user to correct inputs

**Status**: PASS

#### Scenario: Report with Maximum Photos
**Description**: User uploads maximum allowed photos (3).

**Test Steps**:
1. Navigate to `/reports/new`
2. Fill valid report details
3. Upload exactly 3 photos
4. Attempt to upload 4th photo
5. Submit report

**Expected Results**:
- First 3 photos upload successfully
- 4th photo upload is rejected with error message
- Report submits successfully with 3 photos

**Actual Results**:
- First 3 photos upload successfully
- 4th photo upload is rejected with error message
- Report submits successfully with 3 photos

**Status**: PASS

### TC-003: Municipal Authority Workflow

#### Scenario: Municipality User Reviews Pending Reports
**Description**: Municipality user views and approves pending reports.

**Test Steps**:
1. Navigate to `/municipality/dashboard`
2. View list of pending reports
3. Click on a pending report
4. Review report details and photos
5. Select "Approve" action

**Expected Results**:
- Dashboard shows pending reports list
- Report detail view shows all information and photos
- Approval succeeds and report status changes to "Assigned"

**Actual Results**:
- - Dashboard shows pending reports list
- Report detail view shows all information and photos
- Approval succeeds and report status changes to "Assigned"

**Status**: PASS

#### Scenario: Municipality User Rejects Report
**Description**: Municipality user rejects a report with reason.

**Test Steps**:
1. Access municipality dashboard
2. Select pending report
3. Choose "Reject" action
4. Enter rejection reason
5. Submit rejection

**Expected Results**:
- Report status changes to "Rejected"
- Rejection reason is recorded
- Report removed from pending list

**Actual Results**:
- - Report status changes to "Rejected"
- Rejection reason is recorded
- Report removed from pending list

**Status**: PASS

### TC-004: Administrative Functions

#### Scenario: Admin Creates Municipality User
**Description**: Admin creates a new municipality user account.

**Test Steps**:
1. Navigate to `/admin/users`
2. Click "Create User"
3. Fill form for municipality user:
   - Username, email, password
   - Role: Municipality
   - Municipality details
4. Submit creation

**Expected Results**:
- User creation succeeds
- New user can login with provided credentials
- User has municipality role permissions

**Actual Results**:
- - User creation succeeds
- New user can login with provided credentials
- User has municipality role permissions

**Status**: PASS

### TC-005: Citizen Dashboard and Profile Management

#### Scenario: Citizen Views Dashboard Statistics
**Description**: Citizen views their personal dashboard with reports.

**Test Steps**:
1. Login as citizen user
2. Navigate to dashboard
3. View total, approved and rejected reports

**Expected Results**:
- Dashboard loads the correct number of reports and specify which are approved and which are rejected

**Actual Results**:
- Dashboard loads the correct number of reports and specify which are approved and which are rejected


**Status**: PASS

#### Scenario: Citizen Updates Profile Information
**Description**: Citizen modifies their profile settings.

**Test Steps**:
1. Navigate to user settings
2. Update Telegram username
3. Toggle notification preferences
4. Upload profile photo
5. Save changes

**Expected Results**:
- Profile information updates successfully
- Changes persist across sessions
- Photo uploads and displays correctly

**Actual Results**:
- Profile information updates successfully
- Changes persist across sessions
- Photo uploads and displays correctly

**Status**: PASS

### TC-006: Report Details and Status Tracking

#### Scenario: Citizen Views Report Details
**Description**: Citizen examines detailed information about their submitted report.

**Test Steps**:
1. Navigate to dashboard
2. Click on a report from the list
3. View report details page
4. Check all information (title, description, photos, location, status)
5. Verify map shows correct location

**Expected Results**:
- Report details page loads completely
- All report information displays correctly
- Map integration shows report location
- Status updates are visible

**Actual Results**:
- Report details page loads completely
- All report information displays correctly
- Map integration shows report location
- Status updates are visible

**Status**: PASS

#### Scenario: Report Status Updates
**Description**: Citizen observes status changes as report progresses through workflow.

**Test Steps**:
1. Submit a new report
2. Note initial status (Pending Approval)
3. Have municipality user approve report
4. Check status changes to "Assigned"
5. Have technical user update to "In Progress"
6. Verify status reflects current state

**Expected Results**:
- Status updates correctly through workflow
- Citizen can see status changes in real-time
- Status history is maintained

**Actual Results**:
- Status updates correctly through workflow
- Citizen can see status changes in real-time
- Status history is maintained

**Status**: PASS

### TC-007: Municipality Role-Based Access

#### Scenario: Public Relations Officer Access
**Description**: Municipality user with public relations role accesses appropriate dashboard.

**Test Steps**:
1. Login as municipality user with "municipal public relations officer" role
2. Verify dashboard shows reports section
3. Check access to pending reports
4. Attempt access to technical reports (should be denied)

**Expected Results**:
- User redirected to reports dashboard
- Can view and manage pending reports
- Access restricted based on role

**Actual Results**:
- User redirected to reports dashboard
- Can view and manage pending reports
- Access restricted based on role

**Status**: PASS

#### Scenario: Technical Office Staff Access
**Description**: Municipality user with technical role accesses assigned reports.

**Test Steps**:
1. Login as municipality user with technical role
2. Verify dashboard shows technical reports section
3. View reports assigned to their office
4. Update report status (In Progress, Resolved)
5. Verify status changes persist

**Expected Results**:
- User redirected to technical dashboard
- Can view office-specific reports
- Status updates work correctly
- Changes visible to citizens

**Actual Results**:
- User redirected to technical dashboard
- Can view office-specific reports
- Status updates work correctly
- Changes visible to citizens

**Status**: PASS

### TC-008: Map Integration and Location Features

#### Scenario: Interactive Map Navigation
**Description**: User interacts with map for location selection and report viewing.

**Test Steps**:
1. Navigate to report creation page
2. Interact with map:
   - Zoom in/out
   - Pan to different areas
   - Click to select location
3. Verify coordinates are captured
4. Submit report and view on main map

**Expected Results**:
- Map responds to user interactions
- Location selection works accurately
- Coordinates stored correctly
- Reports display on map at correct locations

**Actual Results**:
- Map responds to user interactions
- Location selection works accurately
- Coordinates stored correctly
- Reports display on map at correct locations

**Status**: PASS

