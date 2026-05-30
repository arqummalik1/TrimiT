# Requirements Document

## Introduction

TrimiT is a live, multi-million-dollar-trajectory salon marketplace for India. It is composed of an Expo SDK 54 / RN 0.81 / React 19 mobile app published on Google Play, a Vite 6 + React 19 web app at `trimit.online`, a FastAPI backend on Render, and a Supabase Postgres / Auth / Realtime / Storage backend. Real customers and salon owners are using it today.

This spec defines a **v1 Release Audit** — a structured, auditable verification of the entire system before the next Play Store / Vercel / Render release is cut. The audit produces a single artifact (the audit report under `docs/audit/`) that asserts, with evidence, that the live app remains safe to ship: live-app safety, booking-flow correctness, auth-flow integrity, realtime UX, mobile UX bar, code quality, schema-migration discipline, deployment posture, documentation freshness, performance, and security. It also flags every blocker (P0) and strongly-recommended fix (P1) that must be resolved before the release rolls out to users.

Out of scope: building new product features, rewriting subsystems, or migrating to new vendors. The audit only verifies, measures, and reports.

## Glossary

- **Audit_Report**: The Markdown document `docs/audit/V1_RELEASE_AUDIT_<YYYY_MM_DD>.md` produced by this feature. Single source of truth for go / no-go on a release.
- **Auditor**: The engineer (human or AI) executing the audit checklist for a given release candidate.
- **Live_App**: The currently deployed combination of mobile app on Google Play, web app on Vercel (`trimit.online`), and backend on Render — the production stack real users interact with.
- **Mobile_App**: The Expo SDK 54 / React Native 0.81 client under `mobile/`.
- **Web_App**: The Vite 6 + React 19 client under `frontend/`.
- **Backend**: The FastAPI service under `backend/` deployed to Render.
- **Database**: The Supabase Postgres instance, including RLS policies, RPCs, and Realtime publication.
- **Booking_RPC**: The atomic booking creation Postgres function `create_atomic_booking` (and its staff-aware sibling `create_atomic_booking_staff`) defined in `database/29_booking_rpc_hardening.sql` and `database/34_create_atomic_booking_staff.sql`.
- **Slot_Hold_RPC**: The Postgres function `reserve_slot_v1` that places a temporary lock on a candidate slot.
- **Idempotency_Key**: A UUIDv4 sent in the `Idempotency-Key` HTTP header on every retryable mutating endpoint listed in `mobile/src/lib/idempotency.ts::IDEMPOTENT_POST_PATHS`.
- **OTP_Flow**: The shared 6-digit email-code login/signup flow used by both customers and owners, implemented in `mobile/src/screens/auth/VerifyOtpScreen.tsx` and `backend/routers/auth.py`.
- **Persisted_Session**: The auth state stored in `secureStorage` (with AsyncStorage fallback) under key `trimit-auth-storage`, restored on cold start by `useAuthStore.initializeAuth`.
- **Realtime_Channel**: A Supabase Realtime `postgres_changes` subscription. The audit covers four channels: customer `MyBookings` (filter `user_id=eq.<self>`), customer `BookingScreen` (filter `salon_id=eq.<id>` scoped to date), owner Dashboard (filter `salon_id=eq.<own>`), and web `BookingPage` slot mirror.
- **EARS_Pattern**: One of the six requirement patterns defined by the EARS method (ubiquitous, event-driven, state-driven, unwanted-event, optional-feature, complex).
- **P0_Issue**: A correctness or security defect that blocks the release (live-app breakage, data integrity, auth bypass, RLS hole).
- **P1_Issue**: A strongly-recommended fix that does not block v1 launch but must be tracked with an owner and target date.
- **Forward_Only_Migration**: A SQL migration file under `database/` that is appended (never edited after apply) and follows the existing `NN_description.sql` numbering.
- **Release_Candidate**: The exact `main` commit SHA on the `mobile`, `frontend`, and `backend` trees that the audit is gating.
- **Audit_Checklist**: The ordered list of verification steps (one per requirement in this spec) that the Auditor executes against the Release_Candidate.

## Requirements

### Requirement 1: Audit deliverable and ownership

**User Story:** As a release manager, I want a single Audit_Report file that captures the v1 audit results with evidence, so that I have one auditable artifact to gate the Play Store / Vercel / Render rollout on.

#### Acceptance Criteria

1. THE Auditor SHALL create exactly one Audit_Report at `docs/audit/V1_RELEASE_AUDIT_<YYYY_MM_DD>.md` per audit pass, named with the UTC date the audit started.
2. THE Audit_Report SHALL record the Release_Candidate commit SHA for each of `mobile/`, `frontend/`, and `backend/`.
3. THE Audit_Report SHALL contain one section per requirement in this spec, with a verdict of `pass`, `fail`, or `not-applicable`, plus the evidence (command output, file path, screenshot reference, or link).
4. THE Audit_Report SHALL list every P0_Issue and P1_Issue discovered during the audit, each with an owner, severity, file reference, and target resolution date.
5. WHEN the Audit_Report is finalized, THE Auditor SHALL update `docs/REMAINING_ISSUES.md` so that every P0_Issue and P1_Issue from the audit is reflected there.
6. WHEN the Audit_Report is finalized, THE Auditor SHALL append a session entry to `docs/PROGRESS.md` referencing the Audit_Report by filename.
7. IF any P0_Issue is recorded in the Audit_Report, THEN THE Audit_Report SHALL declare the Release_Candidate as `BLOCKED` in its summary section.

### Requirement 2: Live-app safety verification (highest priority)

**User Story:** As the on-call engineer, I want the audit to refuse to pass while any change can break the Live_App, so that real users do not lose access to login, bookings, push, or their data.

#### Acceptance Criteria

1. THE Auditor SHALL verify that the Release_Candidate's `/health` endpoint returns HTTP 200 from the production Render URL.
2. THE Auditor SHALL execute a smoke booking flow against the production Backend using a test customer account and record the resulting `booking_id` in the Audit_Report.
3. THE Auditor SHALL verify that `mobile/src/lib/api.ts`, `mobile/src/services/apiClient.ts`, and `frontend/src/lib/api.js` send no removed or renamed fields versus the previous release tag, and that any added request fields are optional.
4. THE Auditor SHALL verify that no applied migration file under `database/` (i.e. any file already present in `main` at the previous release tag) has been edited in the Release_Candidate.
5. IF any applied migration has been edited in the Release_Candidate, THEN THE Auditor SHALL record a P0_Issue and mark the Release_Candidate as `BLOCKED`.
6. THE Auditor SHALL verify that the Persisted_Session of an existing customer survives a swipe-kill cold-start on a release APK installed from the Release_Candidate without prompting login.
7. THE Auditor SHALL verify that the booking-confirmation push and the broadcast push are delivered on separate Android notification channels (`bookings` and `promotions`) on a release APK.
8. WHEN the Auditor encounters a check that would require modifying production data or production secrets, THE Auditor SHALL pause and request explicit user confirmation before proceeding, recording the confirmation in the Audit_Report.

### Requirement 3: Booking-flow correctness invariants

**User Story:** As a customer, I want the booking flow to remain race-safe, atomic, and idempotent under concurrent demand, so that I never get double-booked, charged twice, or stuck holding an expired slot.

#### Acceptance Criteria

1. THE Auditor SHALL verify that `database/29_booking_rpc_hardening.sql` is the latest authoritative definition of `create_atomic_booking` and that it acquires `FOR UPDATE` locks on the candidate slot rows.
2. THE Auditor SHALL verify that capacity and concurrency enforcement live inside `create_atomic_booking` and `create_atomic_booking_staff`, and that no enforcement has been moved up into `backend/routers/bookings.py`.
3. THE Auditor SHALL verify that every POST path listed in `mobile/src/lib/idempotency.ts::IDEMPOTENT_POST_PATHS` is enforced as `@idempotency_required` on the corresponding FastAPI route handler.
4. THE Auditor SHALL execute two concurrent `POST /api/v1/bookings/` requests for the same `(salon_id, service_id, booking_date, time_slot)` from two different test customers and verify that exactly one returns HTTP 2xx and the other returns HTTP 409 with a structured `{code, message}` body.
5. THE Auditor SHALL execute the same retryable `POST /api/v1/bookings/` request twice with an identical `Idempotency-Key` header and verify that both responses reference the same `booking_id`.
6. WHEN the slot-hold timer expires before confirm, THE Mobile_App SHALL clear the held slot, reset the idempotency-key ref, and prompt the user to pick a slot again, as implemented in `mobile/src/screens/customer/BookingScreen.tsx`.
7. IF the Booking_RPC returns a conflict on confirm, THEN THE Mobile_App SHALL invalidate the `slots` query, refetch, clear the selected slot, and present a structured user-facing error.
8. THE Auditor SHALL verify that `reschedule_booking_atomic` rejects a destination slot that overlaps another active booking for the same salon, slot, and (where applicable) staff, by executing the verification SQL from `database/35_reschedule_holds_capacity.sql`.

### Requirement 4: Authentication-flow invariants

**User Story:** As an existing user, I want my login to persist across swipe-kill, my role to be immutable after signup, and my session to clear only on a confirmed 401, so that I never get logged out by a flaky network.

#### Acceptance Criteria

1. THE OTP_Flow SHALL be the single authentication mechanism for both customer and owner roles, and THE Backend SHALL reject any non-OTP authentication attempt (e.g., password, magic link) with an error response indicating that the authentication method is not supported.
2. WHEN a verify-otp call is received and no `public.users` row exists for the authenticated user id, THE Backend SHALL set `public.users.role` from the client-supplied role hint, persist the row, and treat any subsequent verify-otp call for that same user id as case-3 below.
3. IF a verify-otp call is received for a user whose `public.users` row already exists, THEN THE Backend SHALL ignore any role hint in the request body, SHALL NOT modify `public.users.role`, and SHALL return the existing role unchanged in the response.
4. WHEN the Mobile_App cold-starts and a Persisted_Session is present, THE Mobile_App SHALL mark the user as authenticated using the persisted token, render the post-login landing screen within 1 second, dispatch a background `/auth/me` request within 5 seconds of cold-start, and SHALL NOT block any navigation, screen render, or user interaction on the completion of that request.
5. IF the background `/auth/me` call returns an HTTP 401 response, THEN THE Mobile_App SHALL clear the Persisted_Session from `safeAuthStorage`, surface the SessionExpiredModal, and route the user to the login screen.
6. IF the background `/auth/me` call fails with a network error, a request timeout, or any HTTP 5xx response, THEN THE Mobile_App SHALL retain the Persisted_Session intact, keep the user authenticated, SHALL NOT surface the SessionExpiredModal, and SHALL NOT route the user to the login screen.
7. THE Mobile_App SHALL persist auth state through `safeAuthStorage`, which routes through `secureStorage` for payloads up to the SecureStore 2KB limit and falls back to AsyncStorage when that limit is exceeded, so that no auth payload is dropped due to storage size.
8. WHEN the Backend receives a signup request for a phone or email whose account exists but has not yet completed OTP verification, THE Backend SHALL resend a new OTP to that recipient, return a success response indicating that an OTP has been sent, and SHALL NOT return a duplicate-account error.
9. THE Mobile_App and THE Web_App SHALL derive the authenticated user object — including the `role`, `name`, and `phone` fields — exclusively from the response body of `/auth/me`, and SHALL NOT read or compute these fields from the raw Supabase auth user object.
10. WHEN the user enters a digit on the OtpScreen, THE OtpScreen SHALL accept the input only if it is a single numeric character (0-9), advance keyboard focus to the next of six boxes, and display the recipient email in masked form per `VerifyOtpScreen.tsx::maskedEmail`.
11. WHEN the user pastes a string into any of the six OTP input boxes, THE OtpScreen SHALL accept the paste only if the string is exactly 6 numeric digits, distribute one digit per box in left-to-right order, and set focus to the last box; IF the pasted string is not exactly 6 numeric digits, THEN THE OtpScreen SHALL ignore the paste and leave all input boxes unchanged.
12. WHEN the user requests OTP resend on the OtpScreen, THE OtpScreen SHALL trigger a resend, disable the resend control for exactly 60 seconds, display the remaining cooldown in whole seconds, and re-enable the resend control once the cooldown reaches 0.

### Requirement 5: Realtime UX parity

**User Story:** As a user (customer or owner), I want booking lists, slot availability, and the owner dashboard to update in real time without pull-to-refresh, so that the app feels live like Zomato, Blinkit, or Uber.

#### Acceptance Criteria

1. WHEN a booking row owned by the current customer changes status in the Database, THE Mobile_App MyBookings tab SHALL reflect the new status within 3 seconds via the `subscribeToUserBookings` channel.
2. WHEN a concurrent customer creates a booking for a slot the current customer is viewing, THE Mobile_App BookingScreen SHALL mark that slot unavailable within 3 seconds and SHALL clear the “just booked” marker after 3 seconds, per `mobile/src/store/bookingStore.ts`.
3. WHEN a new booking is inserted for an owner's salon, THE Mobile_App OwnerDashboard SHALL trigger the in-app booking modal and the alert sound within 3 seconds via `subscribeToSalonBookings`.
4. WHILE a Realtime_Channel is open with a valid Supabase JWT, THE Mobile_App SHALL keep the channel attached to the user's auth via `syncSupabaseAuthSession` so RLS-protected `postgres_changes` events are delivered.
5. IF the Web_App `BookingPage` does not subscribe to slot changes for the same `(salon_id, date)` filter as the Mobile_App, THEN THE Auditor SHALL record a P1_Issue.
6. THE Mobile_App SHALL deduplicate booking-event in-app alerts per `(booking_id, event_type)` for 30 seconds via `mobile/src/lib/notificationDedupe.ts`.
7. WHEN the user signs out, THE Mobile_App SHALL unsubscribe from every Realtime_Channel and clear the Supabase auth on the Realtime client.

### Requirement 6: Mobile UX bar

**User Story:** As a user on a real Indian network, I want the mobile app to feel like Zomato/Blinkit/Uber: fast cold start, persistent login, skeletons not spinners, brand-consistent in light and dark, and never showing raw error strings.

#### Acceptance Criteria

1. WHEN the Mobile_App cold-starts on a warm cache for an authenticated user, THE Mobile_App SHALL render the discover screen's first contentful paint within 1000 ms on a Pixel-class device.
2. THE Mobile_App SHALL display skeletons (not spinners) on every list and detail screen with a registered skeleton component under `mobile/src/components/skeletons/`.
3. THE Mobile_App SHALL surface every backend error through `getUserFacingMessage` (`mobile/src/lib/userFacingError.ts`) and SHALL NOT display the raw axios message, raw `error.message`, or the literal string "An unexpected error occurred" in any user-visible Alert, Toast, or banner.
4. THE Mobile_App SHALL support both light and dark themes via the tokens in `mobile/src/theme/tokens.ts`, and screen files SHALL NOT use raw color literals outside the theme.
5. WHEN the device reports `isConnected === false` via NetInfo, THE Mobile_App SHALL show the OfflineBanner and SHALL reject mutating requests with a structured `{kind: 'network', code: 'OFFLINE'}` error.
6. WHEN a backend response carries `{error: {code, message}}` or `{detail: {code, message}}`, THE Mobile_App SHALL parse and surface that structured error per `mobile/src/lib/errorHandler.ts`.
7. THE Auditor SHALL verify that no `.tsx` view file under `mobile/src/screens/` calls `axios` or `api.*` directly without going through `mobile/src/repositories/` or `mobile/src/services/`.

### Requirement 7: Code quality bar

**User Story:** As a maintainer, I want the codebase to enforce no-`any` TypeScript, MVVM separation, structured errors, and zero dead code, so that the next pass of work doesn't compound technical debt.

#### Acceptance Criteria

1. THE Mobile_App SHALL pass `npm run typecheck` (which runs `tsc --noEmit`) with zero errors against the Release_Candidate.
2. THE Auditor SHALL verify that no file under `mobile/src/` introduces a new `: any` type annotation versus the previous release tag.
3. THE Auditor SHALL verify that every type referenced by mobile screens or services lives under `mobile/src/types/`.
4. THE Auditor SHALL verify that every mutating endpoint a user could retry (every path in `IDEMPOTENT_POST_PATHS`) is covered by a corresponding test under `backend/tests/` that asserts identical `Idempotency-Key` returns the same resource.
5. WHEN middleware, hooks, repositories, services, or feature flags are defined but not referenced from production code paths, THE Auditor SHALL record each as a P1_Issue with the file path and a recommendation to either wire it or delete it.
6. THE Auditor SHALL verify that every `service-role` Supabase call site under `backend/` is documented with an inline comment justifying the bypass and that the bypass is scoped to the smallest possible operation.
7. THE Auditor SHALL run the mobile Jest suite (`cd mobile && npm test -- --runInBand --watch=false`) and record the pass/fail count in the Audit_Report.

### Requirement 8: Schema migration discipline

**User Story:** As the database owner, I want every schema change to be a forward-only, numbered migration that the audit can verify was applied to production, so that staging and prod never drift.

#### Acceptance Criteria

1. THE Auditor SHALL verify that every new SQL file in `database/` follows the `NN_description.sql` numbering convention with `NN` strictly greater than the highest number present at the previous release tag.
2. IF any applied migration file (a file present in the previous release tag) has been edited in the Release_Candidate, THEN THE Auditor SHALL record a P0_Issue and BLOCK the Release_Candidate.
3. WHEN a new migration is added in the Release_Candidate, THE Audit_Report SHALL state explicitly that the migration must be applied manually in the Supabase SQL Editor and SHALL list each new file by name.
4. THE Auditor SHALL verify that every new migration's content has been executed against the production Supabase project, by running the verification SQL committed alongside the migration (e.g. `database/verify_phase2_migration.sql`) or by inspecting the Supabase migration history.
5. THE Auditor SHALL verify that RLS is enabled on every table that contains user data (`bookings`, `users`, `salons`, `services`, `reviews`, `slot_holds`, `idempotency_keys`, `staff`, `promotions`, `early_access_emails`).
6. WHEN a migration introduces or modifies an RLS policy, THE Auditor SHALL execute a negative test (a request from a user who should be denied) and record the resulting HTTP 401/403 in the Audit_Report.
7. THE Auditor SHALL verify that any `SECURITY DEFINER` function added in the Release_Candidate is `REVOKE EXECUTE ... FROM anon` and validates `auth.uid()` against its caller-id parameter.

### Requirement 9: Deployment posture

**User Story:** As the release manager, I want the audit to confirm Render, Vercel, and EAS are all on the right commit and configured correctly, so that pushing main goes live cleanly.

#### Acceptance Criteria

1. THE Auditor SHALL verify, via the Render dashboard or Render API, that the production Render service for `backend/` is configured to auto-deploy from `main` and that its currently active deployed commit SHA is byte-for-byte identical to the Release_Candidate SHA, and SHALL record both the configured source branch and the active commit SHA in the Audit_Report.
2. THE Auditor SHALL verify, via the Vercel dashboard or Vercel API, that the production Vercel project for `frontend/` is configured to auto-deploy from `main` and that its current production deployment commit SHA is byte-for-byte identical to the Release_Candidate SHA, and SHALL record both the configured source branch and the active commit SHA in the Audit_Report.
3. WHEN the Auditor merges `zero-point-ten` into `main`, THE Auditor SHALL push both branches to origin and SHALL confirm within 10 minutes that Render and Vercel each show a new deploy triggered from the resulting merge commit, recording each deploy identifier and trigger commit SHA in the Audit_Report.
4. IF either Render or Vercel has not started a new deploy within 10 minutes of the push, OR if a triggered deploy finishes with a non-success status, THEN THE Auditor SHALL record a P0_Issue identifying the affected platform, the deploy identifier, and the failure indicator, and SHALL NOT mark the deployment-trigger step as passing.
5. THE Auditor SHALL execute `curl -sS --max-time 10 https://trimit-az5h.onrender.com/health`, record the HTTP status code and the full response body in the Audit_Report, and SHALL treat the check as passing only when the HTTP status equals 200 and the response body indicates a healthy state; IF the status is not 200, the body does not indicate health, or the request fails or times out within 10 seconds, THEN THE Auditor SHALL record a P0_Issue.
6. THE Auditor SHALL execute `curl -sSI --max-time 10 https://trimit.online/`, record the HTTP status and the values (or explicit absence) of the `Content-Security-Policy`, `X-Frame-Options`, `Strict-Transport-Security`, and `X-Content-Type-Options` response headers in the Audit_Report; IF the HTTP status is outside the 200-299 range, OR if either `Strict-Transport-Security` or `X-Content-Type-Options` is absent, THEN THE Auditor SHALL record a P0_Issue.
7. THE Auditor SHALL verify that the Mobile_App release artifact (AAB or APK) was produced via `npm run build:aab:local` or `npm run build:apk:local` from the Release_Candidate SHA, and SHALL record the exact build command used, the artifact filename, and the source commit SHA in the Audit_Report.
8. IF `app.config.js` does not abort the release build when any of `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`, `EXPO_PUBLIC_SUPABASE_URL`, or `EXPO_PUBLIC_SUPABASE_ANON_KEY` is unset or empty on a release profile, THEN THE Auditor SHALL record a P0_Issue identifying the missing variable and the release profile, and SHALL mark the Mobile_App release as not passing.
9. WHERE the Mobile_App release build is produced without a non-empty Sentry DSN environment variable on the active release profile, THE Auditor SHALL record a P1_Issue in the Audit_Report noting that production telemetry is degraded and SHALL include the affected build profile name.
10. WHEN both the Render and Vercel deploys for the Release_Candidate SHA report success, THE Auditor SHALL execute one authenticated sanity request `GET /api/v1/auth/me` with a test user's bearer token using `curl -sS --max-time 10`, record the HTTP status, the measured response time in milliseconds, and whether the response body contains the test user's identity in the Audit_Report; IF the response status is not 200, the request times out within 10 seconds, or the response does not contain the expected test user's identity, THEN THE Auditor SHALL record a P0_Issue.

### Requirement 10: Documentation discipline

**User Story:** As a future engineer joining a session, I want the canonical docs to reflect what the audit verified, so that the next pass starts from accurate state.

#### Acceptance Criteria

1. THE Audit_Report SHALL link to the exact commit SHA of `RULES.md` it was audited against.
2. WHEN the audit closes a P0_Issue or P1_Issue that was previously open, THE Auditor SHALL move that item to the "Recently fixed" section of `docs/REMAINING_ISSUES.md` with the date and pass number, in the same commit as the fix.
3. THE Auditor SHALL append a session log entry to `docs/PROGRESS.md` describing what the audit verified, what it changed, and what remains open, in the same commit as the Audit_Report.
4. WHEN any of `RULES.md`, `.cursorrules`, `CLAUDE.md`, or `.kiro/steering/production-rules.md` drift from each other, THE Auditor SHALL record a P3_Issue and re-sync the steering files from `RULES.md` (the single source of truth).
5. THE Auditor SHALL verify that `docs/V1_FEATURE_FLAGS.md` accurately reflects the values of `ENABLE_ONLINE_PAY`, `ENABLE_STAFF_SELECTION`, `ENABLE_MULTI_BOOKING_PER_SLOT`, and `ENABLE_OWNER_PROMO_MANAGEMENT` as set in the Mobile_App release artifact.
6. THE Auditor SHALL verify that `docs/REMAINING_ISSUES.md` lists every issue that the Audit_Report records, with matching severity labels.

### Requirement 11: Performance bar

**User Story:** As a user on a 4G connection in a metro Indian city, I want screens to feel instant, so that the app is competitive with Zomato and Blinkit.

#### Acceptance Criteria

1. WHEN the Mobile_App cold-starts on a warm cache for an authenticated customer, THE Mobile_App SHALL render the Discover screen first contentful paint within 1000 ms on a Pixel 6 or equivalent.
2. WHEN the Mobile_App fetches `GET /api/v1/salons` for the customer Discover screen, THE Backend SHALL return a response in under 600 ms at the 95th percentile, measured from the Render access logs over the last 24 hours.
3. WHEN the Mobile_App fetches `GET /api/v1/bookings/slots`, THE Backend SHALL return a response in under 500 ms at the 95th percentile.
4. WHEN the Mobile_App calls `POST /api/v1/bookings/`, THE Backend SHALL return a response in under 1500 ms at the 95th percentile, including the `create_atomic_booking` RPC round-trip.
5. THE Auditor SHALL record the 50th, 95th, and 99th percentile latency for each endpoint above in the Audit_Report.
6. THE Auditor SHALL verify that the Mobile_App's main JavaScript bundle size has not grown by more than 10% versus the previous release tag, measured from the EAS build artifact.
7. THE Auditor SHALL verify that `react-query` `staleTime` and `gcTime` settings in `mobile/App.tsx` match the values documented in `docs/architecture/` and that no view file overrides them with shorter intervals that would cause excess refetches.

### Requirement 12: Security bar

**User Story:** As the data owner, I want the audit to verify that RLS is the last line of defense, secrets are not leaked into client builds, and no obvious auth or rate-limit holes exist, so that user data stays protected.

#### Acceptance Criteria

1. THE Auditor SHALL verify that no service-role Supabase key, Razorpay secret, Sentry DSN with a write scope, or signing secret appears as a plaintext string in any JavaScript bundle, native library, asset file, or sourcemap shipped in the Mobile_App release artifact or Web_App build output.
2. THE Auditor SHALL verify that the Mobile_App release `.env` and EAS production environment do not contain any value with a key starting with `SUPABASE_SERVICE_ROLE_` or `RAZORPAY_KEY_SECRET`, and SHALL record a P1_Issue for each such key found.
3. THE Auditor SHALL execute a negative-RLS test for each user data table by reading another user's `bookings` row, `users` row, and `notification preferences` row using the customer's anon JWT, and SHALL confirm each request returns either an empty result set or an HTTP 401 or 403 response.
4. THE Auditor SHALL verify that every public endpoint annotated with `@limiter.limit(...)` in `backend/` has its router included in `backend/server.py` and that `core/limiter.py` is registered on the FastAPI app via `app.state.limiter` assignment and middleware installation through `app.add_middleware(...)`.
5. IF rate-limit middleware, signature middleware, or any other security middleware is defined under `backend/core/` but is not installed via `app.add_middleware(...)` in `backend/server.py`, THEN THE Auditor SHALL record a P1_Issue.
6. THE Auditor SHALL verify in the production Supabase project that leaked-password protection is enabled and that email confirmation is required for signup, and SHALL record a P1_Issue if either setting is disabled.
7. THE Auditor SHALL send one malformed request, defined as a request with an invalid or missing required field or with a non-JSON body where JSON is expected, to each public router in the Backend, and SHALL verify that every resulting error response carries a body matching the structure `{error: {code, message}, request_id}`.
8. THE Auditor SHALL verify that the `Authorization` header value and the `Idempotency-Key` header value are removed or redacted from Sentry breadcrumbs and event payloads by the `before_send` scrubber configured in both the Backend and the Mobile_App Sentry initialization.
9. IF `frontend/vercel.json` does not set a `Content-Security-Policy` header in either enforce or report-only mode, THEN THE Auditor SHALL record a P1_Issue.
10. THE Auditor SHALL verify that `core/idempotency.py` rejects, with an HTTP 4xx error response carrying a structured `{error: {code, message}, request_id}` body, any request where the same `Idempotency-Key` is reused with a different request body on the same path, by submitting two requests with identical `Idempotency-Key` values and differing bodies and confirming the second is rejected.

### Requirement 13: Push notification correctness

**User Story:** As an owner, I want booking pushes and broadcast pushes to be delivered on separate channels and to never duplicate the in-app modal, so that I can mute marketing without losing booking alerts.

#### Acceptance Criteria

1. THE Mobile_App SHALL register two Android notification channels: `bookings` (importance MAX, sound + vibration honoring user prefs) and `promotions` (importance DEFAULT, no badge).
2. WHEN a booking-event push is received, THE Mobile_App SHALL deliver it via the `bookings` channel only, per `mobile/src/lib/notifications.ts`.
3. WHEN a broadcast push is received, THE Mobile_App SHALL deliver it via the `promotions` channel only and SHALL NOT trigger the new-booking modal in the foreground.
4. WHEN an owner's foreground push is received and the owner is already subscribed to a Realtime_Channel for the affected salon, THE Mobile_App SHALL suppress the foreground modal to avoid duplicating the Realtime event, per `mobile/src/lib/realtimeOwnerGuard.ts`.
5. THE Mobile_App SHALL deduplicate booking-event in-app alerts per `(booking_id, event_type)` for 30 seconds.
6. WHEN the user logs out, THE Mobile_App SHALL clear the push token on the Backend by calling `POST /api/v1/auth/push-token` with `push_token: null`.
7. WHEN the OS issues a refreshed Expo push token, THE Mobile_App SHALL re-sync the new token to the Backend automatically via the `addPushTokenListener`.

### Requirement 14: Audit checklist execution discipline

**User Story:** As the Auditor, I want the audit to be reproducible and reviewable by another engineer, so that the verdict is not just one person's opinion.

#### Acceptance Criteria

1. THE Audit_Report SHALL include, for every `pass` verdict, a copy-pasteable command, query, or repro step that another engineer could run to reproduce the result.
2. THE Audit_Report SHALL include, for every `fail` verdict, the exact failure output and a link to the file or commit responsible.
3. WHEN any audit step requires reading or modifying production data, THE Auditor SHALL record the exact query or request and the user-confirmation timestamp in the Audit_Report.
4. IF the Auditor cannot complete a step because of missing access or environment, THEN THE Auditor SHALL mark the step as `not-applicable` with a reason and SHALL NOT mark it as `pass`.
5. WHEN every requirement section in the Audit_Report has a `pass` or `not-applicable` verdict and zero P0_Issues remain open, THE Auditor SHALL declare the Release_Candidate as `READY` in the summary section.
6. IF any P0_Issue remains open at the end of the audit, THEN THE Audit_Report summary SHALL state `BLOCKED` and SHALL NOT be edited to `READY` without resolving every P0_Issue.
