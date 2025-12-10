# End-to-End Testing Documentation - Comment Collaboration Tests

## Test Cases for Bidirectional Comment System between Municipality Users and External Maintainers

### TC-001: Municipality User Adding Comments

#### Scenario: Municipality User Comments on Unassigned Report
**Description**: Municipality user can add comments to reports before they are assigned to external maintainers.

**Test Steps**:
1. Login as municipality user (Mario Rossi - mariorossi_muni)
2. Navigate to municipality dashboard
3. Select a pending report (status: PENDING_APPROVAL)
4. Click "Comments" section
5. Type comment: "This is urgent - main street traffic issue"
6. Submit comment
7. Verify comment appears in thread

**Expected Results**:
- Comment input field is enabled
- Comment submits successfully
- Comment appears in thread with:
  - Timestamp (current date/time)
  - Author name: "Municipality User"
  - Comment text displayed correctly
- Comment is visible to all users viewing the report

**Actual Results**:
- Comment input field is enabled
- Comment submits successfully
- Comment appears in thread with timestamp and author
- Comment is visible to all users

**Status**: PASS

---

#### Scenario: Municipality User Comments on Assigned Report
**Description**: Municipality user can add comments on reports assigned to external maintainers.

**Test Steps**:
1. Login as municipality user
2. Navigate to assigned report (status: ASSIGNED)
3. Scroll to comments section
4. Add comment: "Can you provide an update on progress?"
5. Submit comment
6. Verify comment saved

**Expected Results**:
- Comment input enabled on assigned reports
- Comment saves with timestamp
- Comment visible in thread
- External maintainer can see municipality user's comment

**Actual Results**:
- Comment input enabled
- Comment saves with timestamp
- Comment visible in thread
- External maintainer can see comment

**Status**: PASS

---

#### Scenario: Municipality User Cannot Comment on Resolved Reports
**Description**: Municipality user cannot add comments after report is marked RESOLVED.

**Test Steps**:
1. Login as municipality user
2. Navigate to resolved report (status: RESOLVED)
3. Look for comment input field
4. Attempt to add comment: "Great work!"

**Expected Results**:
- Comment input field is disabled/grayed out
- Tooltip or message displays: "Cannot add comments to resolved reports"
- Submit button is disabled
- No comment can be submitted

**Actual Results**:
- Comment input field is disabled
- Message: "Cannot add comments to resolved reports" displays
- Submit button is disabled
- Error message prevents submission

**Status**: PASS

---

### TC-002: External Maintainer Adding Comments

#### Scenario: External Maintainer Comments on Assigned Report
**Description**: External maintainer can add comments only on reports assigned to them.

**Test Steps**:
1. Login as external maintainer (Marco Rossi - marcorossi_em)
2. Navigate to "My Reports" dashboard
3. Select assigned report (status: ASSIGNED, assigned to this maintainer)
4. Scroll to comments section
5. Type comment: "Work starting tomorrow morning, 8 AM"
6. Submit comment
7. Verify comment appears

**Expected Results**:
- Comment input field is enabled for assigned reports
- Comment submits successfully
- Comment appears with:
  - Timestamp
  - Author: "External Maintainer"
  - Text displayed
- Comment visible to municipality user

**Actual Results**:
- Comment input field enabled
- Comment submits successfully
- Comment appears with timestamp and author
- Municipality user can see comment

**Status**: PASS

---

#### Scenario: External Maintainer Cannot Comment on Unassigned Report
**Description**: External maintainer cannot comment on reports not assigned to them.

**Test Steps**:
1. Login as external maintainer (Marco Rossi - ROADS_URBAN_FURNISHINGS)
2. Try to access report assigned to different maintainer (e.g., WASTE category)
3. If accessible, attempt to add comment

**Expected Results**:
- External maintainer cannot see unassigned reports in dashboard
- If somehow accessing report, comment field is disabled
- Error message: "You can only comment on reports assigned to yourself"
- Cannot submit comment

**Actual Results**:
- Unassigned reports not visible in dashboard
- No access to comment field
- Cannot submit comment

**Status**: PASS

---

#### Scenario: External Maintainer Cannot Comment on Resolved Reports
**Description**: External maintainer cannot add comments after report is resolved.

**Test Steps**:
1. Login as external maintainer
2. Navigate to resolved report (that was previously assigned to them)
3. Check comments section
4. Attempt to add comment

**Expected Results**:
- Comment input is disabled
- Message displays: "Cannot add comments to resolved reports"
- No comment can be added

**Actual Results**:
- Comment input is disabled
- Message displays preventing comments
- No comment submission possible

**Status**: PASS

---

### TC-003: Bidirectional Conversation

#### Scenario: Full Collaboration Workflow with Comments
**Description**: Municipality user and external maintainer have a complete conversation through comments.

**Test Steps**:
1. Login as municipality user
2. Navigate to assigned report (status: ASSIGNED, external_maintainer_id = 2)
3. Add comment: "Pothole is blocking main traffic lane. High priority!"
4. Logout
5. Login as external maintainer (assigned to this report)
6. View the report
7. Read municipality user's comment
8. Add response: "Received! We'll start work today at 3 PM"
9. Logout
10. Login as municipality user again
11. View the same report
12. Read external maintainer's response
13. Add follow-up: "Excellent, thanks for the quick action"
14. Change report status to IN_PROGRESS
15. Both users verify all comments still visible

**Expected Results**:
- All comments visible to both users
- Chronological order maintained (oldest → newest)
- Each comment shows:
  - Author type (Municipality User vs External Maintainer)
  - Timestamp
  - Full comment text
- Comments persist when status changes
- Comment thread shows:
  - "Pothole is blocking..." (Muni User)
  - "Received! We'll start..." (External Maintainer)
  - "Excellent, thanks..." (Muni User)

**Actual Results**:
- All comments visible to both users
- Chronological order maintained
- Each comment shows author type and timestamp
- Comments persist through status change
- Full conversation visible

**Status**: PASS

---

### TC-004: Comment UI/UX

#### Scenario: Comment Section Layout and Display
**Description**: Comments display properly in the UI with good readability.

**Test Steps**:
1. Navigate to report with multiple comments (3+ comments)
2. Check comment section visibility:
   - Comments section loads
   - All comments visible
   - Scroll through comments
3. Check formatting:
   - Author name visible
   - Timestamp readable
   - Comment text clearly displayed
   - Author type indicator present

**Expected Results**:
- Comment section clearly labeled "Comments" or similar
- Each comment shows:
  - Author badge/label (Municipality User / External Maintainer)
  - Timestamp in readable format (e.g., "Dec 10, 2025 at 2:30 PM")
  - Full comment text without truncation (or expand button)
  - Visual separation between comments
- Comments list is scrollable if many comments
- No layout issues with long comments or timestamps

**Actual Results**:
- Comment section clearly labeled
- All required fields visible and readable
- Proper formatting and spacing
- No layout issues
- Comments properly separated

**Status**: PASS

---

#### Scenario: Comment Input Disabled State
**Description**: Comment input field is properly disabled when appropriate.

**Test Steps**:
1. Navigate to PENDING_APPROVAL report (unassigned) as external maintainer
2. Check comment field state
3. Navigate to RESOLVED report
4. Check comment field state
5. Navigate to assigned report
6. Check comment field state

**Expected Results**:
- Unassigned + External Maintainer: Field disabled with message
- RESOLVED status: Field disabled with "Cannot comment" message
- Assigned + valid user: Field enabled and functional

**Actual Results**:
- Correct disabled/enabled states
- Appropriate messages displayed
- Field functional when enabled

**Status**: PASS

---

### TC-005: Authorization and Permissions

#### Scenario: External Maintainer Authorization Check
**Description**: External maintainers only see and can comment on their assigned reports.

**Test Steps**:
1. Create 2 reports:
   - Report A: Category ROADS_URBAN_FURNISHINGS, assigned to EM1
   - Report B: Category WASTE, assigned to EM2
2. Login as EM1 (ROADS_URBAN_FURNISHINGS)
3. Check "My Reports" - should show only Report A
4. Verify can comment on Report A
5. Try to access Report B:
   - Via URL manipulation: `/reports/[Report B ID]`
6. Verify cannot comment on Report B

**Expected Results**:
- Dashboard shows only assigned reports (Report A)
- Can add comments to Report A
- Report B not visible in dashboard
- If accessed, comment field disabled with authorization message
- Error message: "You can only comment on reports assigned to yourself"

**Actual Results**:
- Dashboard correctly filtered
- Can comment on assigned report
- Unassigned report restricted
- Authorization message displays

**Status**: PASS

---

#### Scenario: Municipality User Can Comment Anywhere
**Description**: Municipality users can comment on any report in their jurisdiction.

**Test Steps**:
1. Login as municipality user
2. Navigate to:
   - Pending (unassigned) report
   - Assigned report (any external maintainer)
   - In-progress report
   - Suspended report
3. Attempt to add comment on each
4. Navigate to resolved report
5. Attempt to add comment

**Expected Results**:
- Comment field enabled on PENDING_APPROVAL, ASSIGNED, IN_PROGRESS, SUSPENDED
- Comments submit successfully
- Comment field disabled on RESOLVED
- Error prevents commenting on resolved

**Actual Results**:
- Comment field enabled for valid statuses
- Comments submit successfully
- Resolved status blocks comments

**Status**: PASS

---

### TC-006: Comment Persistence and Data

#### Scenario: Comments Persist Across Sessions
**Description**: Comments remain visible after user logout/login.

**Test Steps**:
1. Municipality user adds comment: "Starting work"
2. External maintainer adds response: "Received"
3. Municipality user logs out
4. Municipality user logs back in
5. Navigate to same report
6. Verify both comments still visible
7. Add another comment: "Thanks"
8. External maintainer logs in
9. Navigate to same report
10. Verify all 3 comments visible

**Expected Results**:
- Comments persist in database
- All 3 comments visible after logout/login
- No comments lost
- Order maintained (chronological)
- Timestamps preserved

**Actual Results**:
- All comments persist correctly
- Visible after logout/login
- Order and timestamps maintained

**Status**: PASS

---

#### Scenario: Comments Display Correct Author Information
**Description**: Comments show correct author details without leaking sensitive info.

**Test Steps**:
1. Municipality user (name: "Mario Rossi") adds comment
2. External maintainer (name: "Marco Rossi") adds comment
3. Verify comment authors display correctly
4. Verify no sensitive data leaked (emails, IDs, etc.)

**Expected Results**:
- Municipality comment shows: "Mario Rossi (Municipality User)"
- External comment shows: "Marco Rossi (External Maintainer)"
- No emails or user IDs displayed
- Only necessary information visible

**Actual Results**:
- Authors display correctly
- No sensitive data leaked
- Clean presentation

**Status**: PASS

---

### TC-007: Status Updates with Comments

#### Scenario: Comments Visible During Status Transitions
**Description**: Comments remain visible when report status is updated.

**Test Steps**:
1. Report has 3 comments (various authors)
2. External maintainer changes status ASSIGNED → IN_PROGRESS
3. Verify comments still visible
4. Municipality user adds new comment while IN_PROGRESS
5. External maintainer changes status IN_PROGRESS → RESOLVED
6. Verify all 4 comments still visible
7. Municipality user tries to add comment → should fail

**Expected Results**:
- Comments persist through status changes
- Can add comments until RESOLVED
- RESOLVED status blocks new comments
- All previous comments visible even on RESOLVED report

**Actual Results**:
- Comments visible throughout lifecycle
- Can comment until resolution
- Resolved blocks new comments
- Historical comments preserved

**Status**: PASS