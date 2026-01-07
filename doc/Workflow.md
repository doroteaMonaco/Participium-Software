# Story 15 — Already done

Status: ✅ Done

---

# Story 27 — Confirm registration with a code

## Goal

Allow a user to confirm registration via a code, making the account valid/verified.

## Technical decision (DB)

Use a separate `PendingVerificationUser` table for unverified users. After successful verification, create an entry in the main `user` table and remove the pending entry.

## Backend

### Registration flow

- [ ] On registration: create entry in `PendingVerificationUser` with username, email, hashed password
- [ ] Generate an OTP (e.g., 6 digits), store **hash**, expiry (30 min), verificationAttempts in `PendingVerificationUser`
- [ ] Send the code via email (or “dev mode” fallback: log to console)  
       Note: never store the plain code in the DB.

### API

- [ ] `POST /auth/...` (see swagger)
  - body: `{ emailOrUsername, code }`
  - behavior:
    - pending user not found → 404 ("No pending registration found")
    - expired/missing verification code → 400 (clear message)
    - wrong verification code → increment `verificationAttempts`, block after N attempts (e.g., 5)
    - correct code → create entry in `user` table, delete from `PendingVerificationUser`
- [ ] `POST /auth/...`
  - body: `{ emailOrUsername }`
  - generates a new code and invalidates the previous one
  - logical rate limit (e.g., max 3 resends/hour per pending user)

### Login / Access control

- [ ] Update login: check that user exists in `user` table (not in `PendingVerificationUser`)
- [ ] If found in `PendingVerificationUser` → reject (401/403) with "account not verified"
- [ ] Ensure "citizen" routes require a verified user (account in `user` table)

### Tests

- [ ] Service tests: confirm OK, wrong, expired, pending user not found, too many attempts
- [ ] Integration tests: confirm + resend, verify entry moved from pending to user table

## Frontend

- [ ] Add a “Confirm registration” page:
  - code input
  - submit → `POST /auth/...`
  - CTA “Resend code” → `POST /auth/...`
- [ ] Routing:
  - after registration → redirect to confirmation page
  - after confirmation → redirect to login or home (based on your UX)
- [ ] UX states: loading/error/success

## Acceptance Criteria

- A `user` cannot use the system (login or “citizen” features) until the code is confirmed
- A valid, non-expired code verifies the account
- Resend invalidates the previous code and respects rate limits

---

# Story 28 — View approved reports on an interactive map

## Goal

Allow an unregistered user to see “approved” reports on an interactive map.

### API
There is a new route to retrieve the reports and show them on the map. See the swagger for details

`GET /reports/reports-map`

### Tests

- [ ] Integration test: endpoint returns only “approved” statuses
- [ ] bbox test: points outside area are excluded

## Acceptance Criteria

- An unregistered user can view a pan/zoom interactive map
- Markers show only “approved/public” reports
- Moving/zooming the map refreshes markers

---

# Story 30 — Search reports by address (address → coordinates → recenter map)

## Goal

Allow citizen/unregistered users to type an address, recenter the map, and explore reports in that area.

## Technical decision: geocoding

Recommended: backend proxy (avoids CORS issues, centralizes rate limiting, does not expose keys if used).

## Backend (backend/)

- [ ] Endpoint: `GET /geocode?query=...`
  - returns top N results (e.g., 5): `{ displayName, lat, lng }`
- [ ] Implement call to the chosen geocoding provider
- [ ] Tests: valid query → results; nonsense query → empty; provider down → handled 502

## Frontend (frontend/)

- [ ] Address search bar above the map:
  - input + search button / enter
- [ ] Call `GET /geocode`:
  - if multiple results → selectable dropdown/list
  - if single result → auto-select
- [ ] Recenter map to chosen coordinates + reasonable zoom
- [ ] After recenter: trigger bbox fetch (integration with Story 28)
- [ ] UX states:
  - “No results”
  - “Geocoding error”
  - loading

## Acceptance Criteria

- A valid address recenters the map correctly
- Markers refresh and show reports in the target area
- Errors and “no results” are handled with clear feedback

---
