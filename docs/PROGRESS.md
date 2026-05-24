# TrimiT — Project Progress

> Living handoff file for humans and AI tools.  
> Update this file after every meaningful prompt, code change, migration, deploy, or QA pass.

## Current State

**Last updated:** 2026-05-24  
**Project type:** Live production monorepo  
**Primary surfaces:** Backend API, Web app, Mobile app  
**Deployments:** Backend on Render, Web on Vercel, Database/Auth on Supabase, Mobile on Play Store testing  
**Main audit baseline:** `docs/audit/PRODUCTION_AUDIT_2026_05_24.md` and `docs/audit/PRODUCTION_AUDIT_2026_05_24_REV2.md`

## Product Context

TrimiT is a salon marketplace and booking platform with:

- Customer discovery and booking
- Salon owner management flows
- Email/password auth and email OTP verification
- Cash and online booking flows
- Real-time booking invalidation on mobile
- FastAPI backend in front of Supabase

## Architecture Snapshot

### Backend

- Stack: FastAPI, PostgREST/Supabase, PL/pgSQL RPCs
- Entry point: `backend/server.py`
- Routers: `backend/routers/`
- Core concerns:
  - Auth via Supabase JWT
  - Booking creation via atomic RPCs
  - Payments via Razorpay
  - Rate limiting via `slowapi`
  - Idempotency via `idempotency_keys`

### Web

- Stack: React 19, Vite 6, React Router, TanStack Query
- Path: `frontend/`
- Production site: `https://trimit.online`
- Current role:
  - Marketing pages
  - Customer auth
  - Customer booking flow
  - Owner dashboard

### Mobile

- Stack: Expo SDK 54, React Native 0.81, React 19, Zustand, TanStack Query
- Path: `mobile/`
- Current role:
  - Customer app
  - Owner app
  - Realtime booking sync
  - Push notifications

### Database

- Stack: Supabase Postgres
- Path: `database/`
- Core design:
  - RLS enabled
  - Business-critical booking logic in SQL RPCs
  - Slot holds
  - Idempotency table
  - Realtime-enabled `bookings`

## Operating Rules

- This is a live app. Prefer safe, additive changes.
- Do not assume a migration is applied until explicitly confirmed.
- Backend, web, mobile, and DB changes must stay in sync.
- Use this file as the first read for future sessions.

## Audit Tracking

### Intentionally Excluded From This Pass

These are known issues and are intentionally not being implemented in the current pass:

- Razorpay webhook
- Refund pathway
- Owner booking UPDATE policy tightening
- Reschedule staff-conflict and duration-overlap hardening
- Web Sentry

### Current Fix Pass Scope

This pass is focused on the selected P1 items:

- Login email enumeration
- OTP implicit account creation
- Rate limiter dead per-user branch
- 401 refresh-and-retry on mobile
- 401 refresh-and-retry on web
- Profile cache token staleness
- Slot expiry cron not enabled
- `salon_cash` validation against salon configuration
- Non-production service-role reservation fallback
- Idempotency processing row TTL
- Idempotency fail-open behavior

## Status Board

### Done Earlier

- Slot generator unbound duration bug fixed
- Request ID propagation fixed between middleware and exception handlers
- Profile upsert recursion bounded
- JWT helper bare-except narrowed

### Fixed In This Pass

- `/auth/login` now returns a generic invalid-credentials response instead of leaking email-confirmation state
- `/auth/send-otp` no longer uses implicit account creation
- `/auth/send-otp` now has a per-email throttle in addition to the route limiter
- Rate limiting now keys by authenticated user ID when a valid bearer token exists, otherwise by forwarded IP / remote IP
- Backend auth cache now rebuilds the response with the current request token, so refreshes do not keep serving stale access tokens
- Mobile API client now attempts silent Supabase session refresh and retries the failed request once before clearing the session
- Web API client now attempts silent Supabase session refresh and retries the failed request once before redirecting to login
- Web auth store now persists refresh tokens and syncs Supabase session state
- Reservation fallback that could use service role outside production has been removed from the live reserve path
- Idempotency processing rows now use TTL through `expires_at`
- Stale idempotency sentinels are now cleared and reclaimable
- Idempotency now fails closed instead of falling back to unsafe non-idempotent execution
- Booking creation now validates payment method against salon-configured methods when that config exists
- Added DB migration to store explicit salon payment methods
- Added DB migration to schedule the pending-online-booking expiry cron
- Web security headers: Added CSP, HSTS, and XSS protection to `vercel.json` (fixed CSP to allow Render backend)
- Web realtime slot invalidation: Added Supabase Realtime subscription to `BookingPage.js` for instant slot invalidation

### Still Pending

- Razorpay webhook
- Refund pathway
- Owner booking UPDATE policy hardening
- Reschedule staff-conflict and duration-overlap validation
- Web Sentry
- Web push notifications
- CLAUDE.md cleanup for Vite/Cra drift

## Database Migration State

### Already In Repo Before This Pass

- `01` to `35` exist in the repository

### Applied In This Pass

- `database/36_salon_payment_methods.sql`
  - Status: **Applied Successfully** on Supabase SQL Editor.
  - Adds `salons.payment_methods` and backfills legacy salons.

- `database/37_enable_expire_pending_online_bookings_cron.sql`
  - Status: **Applied Successfully** on Supabase SQL Editor.
  - Schedules the abandoned online booking expiry job via `pg_cron`.

- [x] **Verified Mobile Implementation**: Silent refresh and retry logic is correctly implemented in `apiClient.ts` and `authStore.ts`.
- [x] **Mobile Build**: Local assembleRelease build completed. APK generated at `mobile/android/app/build/outputs/apk/release/app-release.apk`.

## Practical Outcome Of Current Fixes

### Authentication

- Before: `/login` could tell an attacker whether an email existed but was unconfirmed
- Now: login failures are generalized, reducing enumeration risk

- Before: `/send-otp` could silently create accounts for arbitrary emails
- Now: OTP sending only targets existing eligible accounts and is throttled per email

- Before: both clients logged users out immediately on the first 401
- Now: both clients attempt silent refresh first, reducing surprise logouts

### Backend Safety

- Before: rate limiting was effectively per-IP only
- Now: authenticated traffic can be bucketed per user

- Before: cached auth responses could carry stale access tokens after refresh
- Now: the access token returned by auth dependency always comes from the current request

- Before: reserve fallback could use service-role logic if environment config drifted
- Now: the live reservation path fails safely instead of bypassing booking protections

### Idempotency

- Before: a stuck processing row could block retries indefinitely
- Now: processing rows expire and can be reclaimed

- Before: an internal idempotency-layer error could execute the handler without protection
- Now: the request fails safely instead of risking duplicates

### Booking / Payments Config

- Before: salon payment-method acceptance had no explicit configuration contract
- Now: the schema supports explicit payment methods and booking creation validates against them when configured

- Before: abandoned online pending bookings relied on a commented-out cron instruction
- Now: there is a concrete migration that schedules the job

## Known Risks After This Pass

- Money reconciliation is still incomplete until the Razorpay webhook exists
- Refunds are still manual
- Owners can still update overly broad booking columns until the RLS policy is tightened
- Reschedule correctness still has a staff/duration gap
- Web observability is still incomplete without Sentry

## Session Log

| Date | Summary | Result |
|------|---------|--------|
| 2026-05-24 | Rewrote `docs/PROGRESS.md` into a full project handoff file with architecture, scope, active fixes, done items, remaining items, and migration instructions. | DONE |
| 2026-05-24 | Applied P1 hardening and verified SQL migrations. | DONE |

## Next Recommended Steps

1. Deploy backend to Render.
2. Deploy web to Vercel.
3. QA login refresh on web and mobile.
4. QA OTP send and verify flows.
5. QA booking with `salon_cash`.
6. Re-audit the remaining excluded items (Razorpay Webhook, Refund pathway, etc.).

## Update Protocol

Every future session should do these things:

1. Read this file first
2. Update the `Current Fix Pass Scope` if the task changes
3. Update `Fixed In This Pass` and `Still Pending`
4. Add a new `Session Log` row
5. Keep `Database Migration State` accurate
