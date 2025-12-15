# Story 15 — Already done
Status: ✅ Done  

---

# Story 27 — Confirm registration with a code

## Goal
Allow a user (Prisma model `user`) to confirm registration via a code, making the account valid/verified.

## Technical decision (DB)
Add verification fields directly to `user`

### Prisma changes (backend/prisma/schema.prisma)
- [ ] Add to `model user`:
  - `isVerified Boolean @default(false)`
  - `verificationCodeHash String?`
  - `verificationCodeExpiresAt DateTime?`
  - `verificationAttempts Int @default(0)`
  - `verificationCodeSentAt DateTime?` (optional but useful)
- [ ] Create migration + regenerate client:
  - `npx prisma migrate dev -n add_user_verification_fields`
  - `npx prisma generate`

## Backend
### Registration flow
- [ ] On registration: set `isVerified=false`, generate an OTP (e.g., 6 digits), store **hash** + expiry (e.g., 10–15 min)
- [ ] Send the code via email (or “dev mode” fallback: log to console)  
  Note: never store the plain code in the DB.

### API
- [ ] `POST /auth/confirm-registration`
  - body: `{ emailOrUsername, code }`
  - behavior:
    - user not found → 404/400
    - already verified → 200 (idempotent)
    - expired/missing code → 400 (clear message)
    - wrong code → increment `verificationAttempts`, block after N attempts (e.g., 5)
    - correct code → `isVerified=true`, clear code fields (hash/expiry/attempts)
- [ ] `POST /auth/resend-confirmation-code`
  - body: `{ emailOrUsername }`
  - generates a new code and invalidates the previous one
  - logical rate limit (e.g., max 3 resends/hour per user)

### Login / Access control
- [ ] Update login: if `isVerified=false` → reject (401/403) with “account not verified”
- [ ] Ensure “citizen” routes require a verified user (if you have auth middleware, enforce it there)

### Tests
- [ ] Service tests: confirm OK, wrong, expired, already verified, too many attempts
- [ ] Integration tests: confirm + resend

## Frontend
- [ ] Add a “Confirm registration” page:
  - code input
  - submit → `POST /auth/confirm-registration`
  - CTA “Resend code” → `POST /auth/resend-confirmation-code`
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

### ToDo
Just un adjustment to allow the view of the reports to an unregistered user

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
