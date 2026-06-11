# TrimiT — Project Progress

> **READ `/RULES.md` ON EVERY PROMPT.** Engineering rules live at the repo root.
>
> Living handoff file for humans and AI tools.
> Update this file after every meaningful prompt, code change, migration, deploy, or QA pass.

## Session log

### 2026-06-11 — TrimiT Pro subscriptions (SaaS, Razorpay) — Phase 1 + Phase 2 (flagged)

Added a complete owner-subscription system. **Phase 1 ships observe-only**
(status + banners, NO hard enforcement). **Phase 2** (owner freeze + customer
grey-out + backend 402 gating) is fully built but behind flags, OFF by default.

- **DB (apply manually in Supabase):** `database/41_subscriptions.sql`
  (subscriptions, subscription_payments, subscription_events, webhook_logs,
  `salons.subscription_active`, trial trigger on owner signup, daily
  expire-trials cron) and `database/42_nearby_salons_subscription_active.sql`
  (RPC now returns `subscription_active`).
- **Backend:** `routers/subscriptions.py` (+webhook, +cron reminder runner),
  `services/subscription_service.py` (source of truth), `subscription_billing.py`
  (Razorpay subscriptions), `subscription_notifications.py` (2d/1d/expired +
  lifecycle), `dependencies/subscription.py` (`require_active_subscription`,
  no-op in Phase 1), admin MRR/ARR analytics in `routers/admin.py`. Gate wired
  into owner mutations (booking status, services, staff, promos, analytics).
- **Config/env:** `RAZORPAY_PLAN_ID`, `RAZORPAY_WEBHOOK_SECRET`,
  `SUBSCRIPTION_ENFORCEMENT_ENABLED` (default false).
- **Mobile:** types/repo/service/hooks, `SubscriptionScreen`,
  `SubscriptionCheckoutScreen` (Razorpay WebView), `PaymentHistoryScreen`,
  `SubscriptionBanner`, `SubscriptionGate` (Phase 2 freeze), settings entry,
  dashboard banner, SalonCard grey-out. Flags `ENABLE_SUBSCRIPTIONS` (on),
  `ENABLE_SUBSCRIPTION_ENFORCEMENT` (off).
- **Web:** service/repo/hooks, `/owner/subscription` page (Razorpay checkout),
  settings link, same flags.
- **Verified:** backend imports (74 routes) + py_compile clean; mobile
  `tsc --noEmit` clean; pre-existing test failures confirmed unrelated.

### 2026-06-11 (later) — subscription follow-ups
- **Phase 2 booking block:** `create_booking` now returns `403 SALON_UNAVAILABLE`
  for lapsed salons (flag-gated).
- **Customer "unavailable" UX:** mobile `SalonDetailScreen` + web `SalonDetail`
  show a notice and disable/booking-block when `subscription_active=false`.
- **Resubscribe/reactivation:** verify + `subscription.charged` webhook detect a
  prior lapsed state, reactivate, clear cancellation flags, log `reactivated`,
  send "welcome back" push.
- **Receipt emails (Resend):** `services/subscription_invoice_email.py` sends a
  ₹299 receipt on every successful charge (verify + webhook). Graceful no-op if
  `RESEND_API_KEY` unset. New env: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`.
- Setup guide updated (sections 9–11 + env reference).

## Current State


**Last updated:** 2026-05-25
**Project type:** Live production monorepo
**Primary surfaces:** Backend API, Web app, Mobile app
**Deployments:** Backend on Render, Web on Vercel, Database/Auth on Supabase, Mobile on Play Store testing
**Main audit baseline:** `docs/audit/PRODUCTION_AUDIT_2026_05_24.md` and `docs/audit/PRODUCTION_AUDIT_2026_05_24_REV2.md`
**Open-issue tracker (canonical):** [`docs/REMAINING_ISSUES.md`](REMAINING_ISSUES.md) — split into Web, Backend, Mobile, Others. Update this whenever an item is closed or added.

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
| 2026-05-25 | Pass 1 — fixed latent `settings.FRONTEND_URL` reference in `backend/routers/auth.py` (now uses `PUBLIC_SITE_URL`). Added `error.log` / `*.log` guard to `mobile/.gitignore`. Updated stale CRA mentions in `CLAUDE.md` and `docs/FRONTEND_DESIGN_CONTEXT_FOR_AI.md`. | DONE |
| 2026-05-25 | Pass 2 — removed unused `react-native-toast-message` from `mobile/package.json`; removed unused `supabase==2.29.0` Python SDK from `backend/requirements.txt`; replaced startup `print()` calls in `backend/server.py` with `logger.info`; removed `react-scripts` and dead `build:cra` / `test` scripts from `frontend/package.json` (`npm install` removed 1,152 transitive packages, `vite build` verified). | DONE |
| 2026-05-25 | Pass 3 — fixed two customer-facing bugs: (a) `MyBookingsScreen` now refetches on focus and subscribes to Supabase Realtime (`subscribeToUserBookings`) so the list auto-updates without pull-to-refresh whenever the owner accepts/rejects/completes/reschedules; (b) `navigateToCustomerBookings` now `popToTop` the Discover stack before switching tabs so the next tap on the Discover tab shows the salon list rather than the previous booking success screen. Added `subscribeToUserBookings` helper to `mobile/src/lib/supabase.ts` and `resetToCustomerDiscover` helper to `mobile/src/lib/navigationHelpers.ts`. Mobile `tsc --noEmit` clean. | DONE |
| 2026-05-25 | Pass 4 — added Zomato/Blinkit-style broadcast push notifications (additive; existing booking notifications untouched). New DB migration `database/39_broadcast_notifications.sql` (audit table + RLS lock-out). New backend service `backend/services/broadcast.py` and admin router `backend/routers/admin.py` with `POST /api/v1/admin/broadcast` and `GET /api/v1/admin/broadcast` gated by `ADMIN_API_TOKEN`. New `audience` field — `customers`, `owners`, or `all`. Fan-out via existing Expo push, batched 100/req. New Android channel `promotions` (separate from `bookings`) so users can mute marketing without losing booking alerts. `users.notify_promotional` already gates delivery (default false; visible toggle already in `NotificationSettingsSection`). Mobile foreground handler now ignores broadcast events (no booking-modal pop-up). Created `docs/REMAINING_ISSUES.md` as the canonical open-issue tracker (Web / Backend / Mobile / Others sections). Mobile `tsc --noEmit` clean; backend syntax-check clean. | DONE |
| 2026-05-25 | Ops — `database/39_broadcast_notifications.sql` applied successfully in Supabase. `ADMIN_API_TOKEN` set in Render environment variables (backend redeployed). Local APK build triggered via `npm run build:apk:local` (EAS local, preview profile). | DONE |
| 2026-05-25 | Pass 5 — fixed persistent login across swipe-kill (Zomato/Blinkit-style). Root causes: (1) `expo-secure-store` 2KB limit silently dropped writes; fallback now routes to AsyncStorage. (2) `initializeAuth` was clearing session on any network error at cold start — now trusts persisted token immediately, runs `/auth/me` in background, only clears on confirmed 401. (3) `safeAuthStorage` consolidated to delegate through `secureStorage`. | DONE |
| 2026-05-25 | Pass 6 — fixed signup OTP flow: after 202, app now navigates to `VerifyOtp` screen (6-digit code) instead of legacy "check email link" page. Fixed profile name/phone not saving: (1) `authStore.verifyOtp` was setting `data.user` (raw Supabase auth user, no name/phone) instead of `data.profile` (resolved `public.users` row). (2) New `pendingSignupStore` stashes name+phone at signup submit; `VerifyOtpScreen` consumes it after OTP verify and PATCHes `/auth/profile`. (3) Restored 5 missing backend endpoints that were lost in an earlier refactor: `GET /auth/me`, `PATCH /auth/profile`, `POST /auth/push-token`, `PATCH /auth/notification-preferences`, `DELETE /auth/account`. Profile save now works. | DONE |
| 2026-05-25 | Pass 7 — fixed owner signup landing on customer tabs. Root cause: Supabase does not reliably round-trip `options.data` from `auth/v1/otp` into `user_metadata` at verify time, so backend's `resolve_profile_for_user` never saw the role and defaulted to `customer`. Fix: `VerifyOtpRequest` now accepts optional `role`/`name`/`phone` fields; backend uses them ONLY when no `public.users` row exists (no escalation possible). Mobile `VerifyOtpScreen` reads them from `pendingSignupStore` and passes them on every signup verify. New `.kiro/steering/production-rules.md` codifies the production posture for future sessions. | DONE |
| 2026-05-25 | Pass 8 — created `RULES.md` at the repo root as the single source of truth for engineering rules (persona, live-app safety, quality bar, real-time architecture, booking + auth invariants, deployment, communication). Mirrored the rules into `.kiro/steering/production-rules.md` and `.cursorrules`. Added a banner pointing to `RULES.md` at the top of `CLAUDE.md`, `docs/PROGRESS.md`, and `docs/REMAINING_ISSUES.md`. Reference apps explicitly named: Zomato, Blinkit, Zepto, Swiggy, Uber, Ola, Instagram, Facebook. Top-of-file rule: read `RULES.md` on every prompt. | DONE |

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
