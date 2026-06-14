# TrimiT — Remaining Issues (Living Document)

> **READ `/RULES.md` ON EVERY PROMPT.** Engineering rules live at the repo root.
>
> **Last updated:** 2026-05-25
> **Owner of this file:** rolling — keep in sync with `docs/PROGRESS.md`. Whenever
> a Pass closes an item here, move it to "Recently fixed" with the date and pass
> number, then trim that section to the last 60 days.
> **Audit baselines:** `docs/audit/PRODUCTION_AUDIT_2026_05_24_REV2.md`,
> `docs/audit/PRODUCTION_AUDIT_2026_05_24.md`, plus the per-area audit files
> in `docs/audit/`.

This file consolidates every known open issue across the TrimiT monorepo
(backend, web, mobile, database, ops). Each item includes:

- **Severity:** P0 / P1 / P2 / P3
- **Why it matters**
- **Recommended fix**
- **Risk to live app** if we don't fix it / if we do

P0 = correctness or security risk; fix before broadening rollout.
P1 = strongly recommended before broad GA; not blocking v1 launch.
P2 = quality / scale; tackle in 4-8 week horizons.
P3 = cosmetic, hygiene, docs.

---

## Index

1. [Web (frontend) — open issues](#web-frontend--open-issues)
2. [Backend — open issues](#backend--open-issues)
3. [Mobile — open issues](#mobile--open-issues)
4. [Others — database, infra, docs, CI, repo hygiene](#others--database-infra-docs-ci-repo-hygiene)
5. [Recently fixed](#recently-fixed)

---

## Web (frontend) — open issues

### W1. No Sentry on web (P1)
**File(s):** `frontend/src/main.jsx`, `frontend/.env`
**Why it matters:** Backend and mobile both ship Sentry. The web app, which
serves the largest surface (marketing + customer + owner web flows on
trimit.online), is currently flying blind on production exceptions.
**Fix:** Wire `@sentry/react` behind `VITE_SENTRY_DSN` in `main.jsx`. Add a
`before_send` scrubber for `Authorization` headers and obvious credential keys
(mirror what the backend does). Set `tracesSampleRate: 0.1` for now.
**Risk:** none for users; pure additive observability.

### W2. No Content-Security-Policy header (P1)
**File(s):** `frontend/vercel.json`
**Why it matters:** HSTS, X-Frame-Options, X-Content-Type-Options, and
Referrer-Policy are present, but CSP is missing. CSP is the strongest
hardening you can add to a public web surface; it neutralizes most XSS
exploitation paths.
**Fix:** Add a CSP that explicitly allows: own origin, the Render backend
host, Supabase REST + Realtime WebSocket, Sentry ingest, Google Fonts,
Phosphor icons (if remote), and the inline styles emitted by Tailwind/Vite.
Pilot with `Content-Security-Policy-Report-Only` for one week before flipping
to enforce.
**Risk:** wrong policy can break the live site instantly. **Always ship in
report-only mode first.**

### W3. No real-time refresh on customer "My Bookings" (P1)
**File(s):** `frontend/src/pages/customer/MyBookings.js`, `frontend/src/lib/supabase.js`
**Why it matters:** Mobile got this fix in pass 3 (subscribes to
`bookings` filtered by `user_id`). The web equivalent does not — when an
owner accepts/rejects/completes/reschedules a booking, the customer's web
"My Bookings" page sits stale until they navigate away and back.
**Fix:** Mirror the mobile implementation. Add a `subscribeToUserBookings`
helper (already exists in `frontend/src/lib/supabase.js` under
`subscribeToUserBookings`) and call it from a `useEffect` in `MyBookings.js`
to invalidate the React Query cache on every event. Refetch on focus too
(e.g. `useEffect` listening to `document.visibilitychange`).
**Risk:** none for users; UX strictly improves.

### W4. No web push notifications for owners (P1)
**File(s):** `frontend/public/sw.js` (does not exist), `frontend/src/main.jsx`
**Why it matters:** Owners on a desktop browser have no way to receive a
booking alert when the tab isn't focused. Mobile owners do.
**Fix:** Add a service worker, ask for `Notification.permission`, register a
subscription with FCM (Firebase Cloud Messaging) or VAPID Web Push, sync the
endpoint to a new column on `users` (e.g. `web_push_endpoint`), and call it
from `services/push_dispatch.py` when the audience is owner. Or — simpler v1
— play a sound + flash the tab title when a Realtime event arrives while the
tab is open (no service worker required).
**Risk:** if you go full Web Push: low — ship as a setting toggle. If just
the in-tab sound: zero.

### W5. CRA leftovers in package.json (P3)
**File(s):** `frontend/package.json`
**Status:** Closed in pass 2 — `react-scripts` and dead scripts removed; 1,152
transitive packages dropped. Listed here only for cross-reference.

### W6. JSX in `.js` files requires custom Vite plugin (P2)
**File(s):** `frontend/vite.config.js` (`jsxInJs` plugin), every JSX-bearing
`.js` under `frontend/src/`
**Why it matters:** Editors, eslint configs, and contributors expect `.jsx`
for files containing JSX. The custom plugin is fragile and confuses tooling.
**Fix:** Rename `.js` → `.jsx` for files that actually contain JSX. Keep
plain JS files as-is. Drop the `jsxInJs` plugin once the tree is migrated.
Do this in three batches: pages/, components/, then everything else.
**Risk:** rename diffs are noisy; recommend doing it on a quiet day with
careful import-path checks.

### W7. No bundle analysis / manual chunking (P2)
**File(s):** `frontend/vite.config.js`
**Why it matters:** Heavy deps (`framer-motion`, `react-day-picker`,
`@phosphor-icons/react`, `@radix-ui/*`, `date-fns`) are all in the main bundle.
First contentful paint suffers, especially on slow networks (which is most
real-world users in India outside metros).
**Fix:** Add `manualChunks` to split vendor code per route. Lazy-load
non-critical pages with `React.lazy` and `<Suspense>`. Add
`vite-plugin-bundle-visualizer` to a `npm run analyze` script for ongoing
monitoring.
**Risk:** none for correctness; pure performance.

### W8. SeoHead and prerender duplicate `<head>` mutations (P3)
**File(s):** `frontend/src/components/SeoHead.js`, `frontend/scripts/prerender-routes.cjs`
**Why it matters:** Pre-rendering writes static `<title>` / `<meta>` into the
HTML, then `SeoHead` runs at hydration and rewrites them client-side.
Sometimes the two disagree, which (rarely) shows up in Google Search Console.
**Fix:** Pick one source of truth. Either keep prerender as canonical and
make `SeoHead` defer when a `<meta data-prerendered>` marker is present, or
let `SeoHead` always win and stop prerendering meta tags.
**Risk:** small SEO ranking shifts during the transition; coordinate with
search console.

### W9. No web Vitest / Jest harness (P2)
**File(s):** `frontend/package.json`, `frontend/src/__tests__/` (does not exist)
**Why it matters:** Pass 2 deleted CRA's `react-scripts test` because it was
unused. There is no replacement. Web has zero unit-test coverage today.
**Fix:** Add Vitest, set up a single `App.test.jsx` smoke test that mounts
`<App />` inside `MemoryRouter`, then add coverage as features change.
**Risk:** none.

### W10. Mobile has tighter MVVM than web (P2)
**File(s):** `frontend/src/pages/**`
**Why it matters:** Multiple web pages call `api.get/post` directly instead
of going through a repository. Same pattern problem we have on mobile, but
worse: web also has no `repositories/` layer beyond `earlyAccessRepository.js`.
**Fix:** Add `frontend/src/repositories/{salonRepository,bookingRepository,
authRepository}.js` mirroring the mobile structure, then move calls from
pages into the repos.
**Risk:** large diff but low risk per page if done one page at a time.

---

## Backend — open issues

### B1. Owner UPDATE RLS on `bookings` is too broad (P0)
**File(s):** `database/01_schema.sql` (or a new `40_*.sql` migration)
**Why it matters:** The current RLS policy lets owners UPDATE arbitrary
columns on bookings they own. In theory an owner could PATCH `payment_status`
or `amount` directly via PostgREST. Backend orchestration mitigates this
today — every code path goes through the API — but the database is the last
line of defense and should not depend on the API being correct.
**Fix:** Replace the broad UPDATE policy with a column-scoped `WITH CHECK`
that restricts owner UPDATEs to `status` and `notes` only. Or remove the
direct UPDATE policy entirely and force every mutation through RPCs.
**Risk:** medium — RLS changes against live data must be rolled out via
migration with a tested rollback. Test on staging with copy of prod data.

### B3. `SignatureMiddleware` is defined but never installed (P1)
**File(s):** `backend/core/middleware.py`, `backend/server.py`,
`backend/tests/test_priority.py`, `backend/tests/conftest.py`
**Why it matters:** The middleware is half-wired: defined in code,
referenced in tests, documented in docs/API_GUIDE.md, and the mobile build
still references `EXPO_PUBLIC_API_SIGNING_SECRET`. But it is **not** added
to `app.add_middleware(...)` in `server.py`, so request signing is dead in
production. Existing tests (`test_signature_guard_required_on_mutation`,
`test_signature_validation_valid`) pass against a server that doesn't
actually validate signatures — false sense of security.
**Fix:** Decide one of:
  (a) Wire it (`app.add_middleware(SignatureMiddleware)`) and rotate the
      secret. Honestly: low marginal value over TLS + JWT, and any client
      bundled secret is recoverable from an AAB.
  (b) Delete `SignatureMiddleware`, the tests that depend on it, and the
      doc references. Keep transport-security responsibility entirely on
      TLS + Supabase JWT (the right call for v1).
**Risk:** medium — the dead-but-tested state is the worst of both worlds.

### B4. No Razorpay webhook + no refund pathway (P1)
**File(s):** `backend/routers/payments.py`, `database/33_expire_pending_online_bookings.sql`
**Why it matters:** v1 ships **cash-only** at salon, so this is parked.
Reactivate before flipping `ENABLE_ONLINE_PAY` on. Paid customer who quits
the app within 15 minutes of payment will have the booking auto-cancelled
by the existing expiry cron but the charge already settled.
**Fix:** Implement `POST /api/v1/payments/webhook` that validates
`razorpay-signature` HMAC and flips matching `pending` bookings to `paid`
based on `razorpay_order_id`. Add a refund call to `client.payment.refund(...)`
inside the cancellation router with an audit row.
**Risk:** none right now (online pay is off).

### B7. Owner analytics is in-memory aggregation (P1)
**File(s):** `backend/routers/owner.py:get_owner_analytics`
**Why it matters:** Pulls every booking for the period into Python and
aggregates. At ~10k bookings per salon per period, this is slow and
memory-heavy.
**Fix:** Push to a SQL view or RPC `get_owner_analytics(p_period, p_salon_id)`
that uses `count() filter (where status = …)` and groups by service.
**Risk:** none for correctness; new RPC is additive.

### B8. Tests are sparse (P1)
**File(s):** `backend/tests/`
**Why it matters:** Three test files. OTP smoke + early access + priority.
No coverage of booking concurrency, payment HMAC (relevant once Razorpay
relit), RLS denials, idempotency replay, reschedule overlap.
**Fix:** Add `tests/test_booking_concurrency.py`, `tests/test_idempotency.py`,
`tests/test_rls_denials.py` (uses test users with limited RLS scope).
**Risk:** none.

### B9. `python-json-logger` is in requirements but unused (P3)
**File(s):** `backend/requirements.txt`, `backend/server.py`
**Why it matters:** `logging.basicConfig` does not use a JSON formatter, so
the dep is dead weight.
**Fix:** Either install a JSON handler (much better for Render structured
logs) or remove the dep.
**Risk:** none.

### B10. `routers/bookings.py` is 949 lines (P2)
**File(s):** `backend/routers/bookings.py`
**Why it matters:** Hard to navigate, hard to test, hard to merge. Splits
itself naturally: slots, holds, bookings CRUD, status, reschedule, history.
**Fix:** Split into `bookings.py` (CRUD/status), `slots.py`, `holds.py`,
`reschedule.py`. Same with `routers/staff.py` (708) and `auth.py` (431).
**Risk:** small if done with strict diff hygiene; route paths must not
change.

### B11. ADMIN_API_TOKEN — v1 simple bearer auth for admin endpoints (P2)
**File(s):** `backend/config.py`, `backend/routers/admin.py`
**Status:** `ADMIN_API_TOKEN` set in Render env vars ✅. Static bearer token is live.
**Remaining:** When you want a real admin role table + JWT-based admin auth, swap `_require_admin` in `routers/admin.py` to use the JWT-derived user identity and stop relying on the static token.
**Risk:** none — additive.

### B12. Missing backend auth endpoints (FIXED ✅)
`GET /auth/me`, `PATCH /auth/profile`, `POST /auth/push-token`,
`PATCH /auth/notification-preferences`, `DELETE /auth/account` were missing
from `backend/routers/auth.py`. Restored in pass 6 (commit `a02ab79a`).

---

## Mobile — open issues

### M1. Direct API calls inside `.tsx` view files (P1)
**File(s):** `mobile/src/screens/customer/BookingScreen.tsx`,
`MyBookingsScreen.tsx`, `DiscoverScreen.tsx`, `PaymentScreen.tsx`,
`SalonDetailScreen.tsx`, `ServiceDetailScreen.tsx`,
`RescheduleBookingScreen.tsx`, `WriteReviewScreen.tsx`,
`ProfileScreen.tsx`, `ForgotPasswordScreen.tsx`, `ResetPasswordScreen.tsx`,
`ManageBookingsScreen.tsx`, `SettingsScreen.tsx`.
**Why it matters:** The architecture invariant in `CLAUDE.md` and `.cursorrules`
states: no direct `axios` / `api.*` calls in view files. Today many screens
bypass the repository layer. This is what makes contract changes painful and
test coverage hard.
**Fix:** Move every `api.get/post/patch/delete` call into the matching
repository under `mobile/src/repositories/`. Screens consume only
`useQuery` / `useMutation` hooks that reference repository methods.
**Risk:** moderate — large diff. Do it screen-by-screen, starting with
`BookingScreen` and `MyBookingsScreen`. No user-facing change per screen.

### M2. God components (P2)
**File(s):** `BookingScreen.tsx` 1838 lines, `SettingsScreen.tsx` (owner) 965,
`StaffManagementScreen.tsx` 761, `PromoManagementScreen.tsx` 727.
**Why it matters:** Hard to maintain; date picker, slot grid, staff picker,
promo flow, hold timer, idempotency, success view all live in one file
(BookingScreen). Real cause of merge conflicts.
**Fix:** Extract sub-components into `components/booking/`, `components/settings/`,
`components/staff/`. One screen at a time.
**Risk:** low if the extraction is mechanical (move JSX + props, no logic
change).

### M3. No notification permission primer for Android 13+ (P1)
**File(s):** `mobile/src/lib/notifications.ts`,
`mobile/src/components/PermissionPrimer.tsx` (already exists for location)
**Why it matters:** Android 13 introduced `POST_NOTIFICATIONS` runtime
permission. We currently prompt inline at first relevant moment. A primer
screen that explains why measurably lifts opt-in rates (Google's own data
shows 20-40% delta).
**Fix:** Mirror the existing location `PermissionPrimer` for notifications.
Show after onboarding completes, before the first push registration call.
**Risk:** none — pure UX win.

### M4. Splash latency from full font preload (P2)
**File(s):** `mobile/App.tsx`, `mobile/package.json`
**Why it matters:** We `await Font.loadAsync` for Cormorant Garamond + Inter
+ Manrope (multiple weights) before rendering anything. On older phones this
is 600ms+ of black screen.
**Fix:** Preload the **two** weights actually used on the splash + first
screen (e.g. Inter 500 + Cormorant 700). Defer the rest with
`Font.loadAsync` after first interaction. The fallback to system fonts
during the gap is fine.
**Risk:** none — visible improvement on first run.

### M5. `as any` and lingering `any` types (P2)
**File(s):** `mobile/src/services/authService.ts`, `mobile/src/store/authStore.ts`
(verifyOtp return), `mobile/src/screens/owner/StaffManagementScreen.tsx`,
the OTP key-press handler in `VerifyOtpScreen.tsx`.
**Why it matters:** Direct violation of the no-`any` rule in CLAUDE.md.
Hides bugs at the boundary between auth response shapes and state.
**Fix:** Add concrete return types to repositories / services. Type the OTP
key-press handler as `(e: NativeSyntheticEvent<TextInputKeyPressEventData>)`.
**Risk:** none.

### M6. Permission prompt order on first run (P3)
**File(s):** `mobile/App.tsx`, `mobile/src/screens/auth/OnboardingScreen.tsx`
**Why it matters:** Order today: location → app loads → first relevant push
prompt. Better order: location primer (already done) → on first booking attempt
prompt notifications via primer (M3) → push registration.
**Fix:** Same as M3 plus moving the `setupPushNotifications()` call out of
`CustomerTabs`/`OwnerTabs` mount and into a one-time post-primer trigger.
**Risk:** small — ensure existing users don't lose registration during the
swap. Add a "we already have your token" fast path.

### M8. Realtime owner subscription is global (P3)
**File(s):** `mobile/src/hooks/useRealtimeBookings.ts`,
`mobile/src/lib/realtimeOwnerGuard.ts`
**Why it matters:** The owner realtime guard is a module-level boolean. Two
mounts of the same hook would fight for the singleton. Today only the
dashboard mounts it, so this is theoretical.
**Fix:** Make the hook accept a `consumer` key and reference-count
subscriptions inside the guard.
**Risk:** none.

### M9. Slot generator timezone fallback uses UTC (P2)
**File(s):** `backend/routers/bookings.py` (`get_available_slots`)
**Why it matters:** When the client doesn't send `is_local_today` /
`current_time` (ancient builds, or the web app), the past-slot grace window
falls back to UTC. For salons in IST near midnight this can briefly flip
"today" backwards.
**Fix:** Persist a salon timezone (default IST) on the `salons` table and
use it server-side instead of UTC. The mobile app already sends the hint, so
the bug is small in practice.
**Risk:** small — schema change + RPC update. Do alongside spatial index
work (O1).

### M10. Login redesign for customer (planned per Stitch spec) (P2)
**File(s):** `mobile/src/screens/auth/LoginScreen.tsx`,
`docs/STITCH_CUSTOMER_UI_SPEC.md`
**Why it matters:** Customer UI is being redesigned per Stitch spec. Owner
UI is intentionally left alone. Login currently shared.
**Fix:** Per the spec — split shared LoginScreen if branding diverges; keep
owner login current.
**Risk:** UX-coordinated. Plan with the design team.

---

## Others — database, infra, docs, CI, repo hygiene

### O1. No spatial index on `salons (latitude, longitude)` (P2)
**File(s):** `database/01_schema.sql`,
`database/19_get_nearby_salons_v1.sql`
**Why it matters:** Discovery `get_nearby_salons_v1` and the in-Python
fallback `_fallback_nearby_salons` both compute Haversine distance per row.
Sequential scan. At 5k+ salons in a city this is slow.
**Fix:** Add `earthdistance` + GIST or PostGIS, then refactor the RPC to
filter by bounding box first and Haversine-rank within the box.
**Risk:** medium — index creation on a live table contends with writes;
do it `CONCURRENTLY` and off-peak.

### O2. Duplicate-prefix migrations (P3)
**File(s):** `database/03_fix_schema_mismatch.sql` + `03_setup_storage.sql`,
`15_reschedule_atomic_time_compare.sql` + `15_staff_selection.sql`,
`16_fix_staff_availability.sql` + `16_reschedule_remove_booking_updated_at.sql`
**Why it matters:** Run order is ambiguous when a fresh project is
bootstrapped from scratch.
**Fix:** Either rename to `15a_` / `15b_` etc., or merge each pair into a
single file. Don't edit existing applied migrations on production —
reorganize on a new branch and apply only on fresh DBs.
**Risk:** none if done forward-only.

### O3. Migration sprawl (39 files for a v1 app) (P3)
**File(s):** `database/`
**Why it matters:** Hard to bootstrap a new env. After production stabilizes,
consolidate.
**Fix:** Create `00_baseline.sql` that's a pg_dump of the current schema,
then start fresh from the next number. Archive history under
`database/history/`.
**Risk:** none if applied only to brand-new envs.

### O4. Bookings UNIQUE doesn't prevent two users on same single-slot (P2)
**File(s):** `database/01_schema.sql`,
`database/30_fix_active_slot_unique_index.sql`
**Why it matters:** Table-level UNIQUE is per-user, not per-slot. Race
prevention is RPC + holds (which work). Belt-and-braces would add the partial
unique index for single-booking salons. Migration `30` started this; verify.
**Fix:** Confirm the partial unique index is actually applied in production
(`07_check_rls_policies.sql` audit) and add it on any env where it isn't.
**Risk:** small — must run during a quiet window.

### O5. No backend CI (P1)
**File(s):** `.github/workflows/`
**Why it matters:** Mobile CI runs typecheck only. There is no CI for
backend (no pytest, no lint) or for web (no build, no typecheck).
**Fix:** Add `.github/workflows/backend-ci.yml` running ruff + black + pytest
against a Postgres + Supabase mock. Add a frontend workflow running
`npm run build` (already known clean).
**Risk:** none — additive.

### O6. No secret scanning (P1)
**File(s):** `.github/workflows/`, `.pre-commit-config.yaml`
**Why it matters:** Even though we verified the keystore was never committed,
human error is the most common credential leak vector. Gitleaks or trufflehog
in CI catches the next mistake before it lands.
**Fix:** Add a `gitleaks` GitHub Action on every PR.
**Risk:** none.

### O7. Root-level docs drift (P3)
**File(s):** root: `APK_CRASH_DEBUG.md`, `APK_CRASH_FIX.md`,
`BUILD_STATUS.md`, `CHART_RESPONSIVE_FIX.md`, `DATABASE_MIGRATION_GUIDE.md`,
`DEPLOYMENT_CHECKLIST.md`, `DEPLOYMENT_GUIDE.md`, `DOCUMENTATION.md`,
`EXPO_VS_RN_CLI_DECISION.md`, `FINAL_ANSWER.md`, `IMPLEMENTATION_PLAN.md`,
`PRODUCTION_READINESS_AUDIT.md`, `PUSH_NOTIFICATION_SETUP.md`,
`QUICK_REFERENCE.md`, `QUICK_START.md`, `QUICK_START_REALTIME.md`,
`REALTIME_IMPLEMENTATION_SUMMARY.md`, `ROADMAP.md`, `RUN_THIS_FIX.sql`,
`TEST_GUIDE.md`, `URGENT_FIX_SUMMARY.md`, `WEB_SETUP_GUIDE.md`,
`audit_report.md`, `backend_test.py`, `check_db.py`, `lecture.html`,
`test_db.py`, `test_salon_creation.py`.
**Why it matters:** Repo root looks like a debug dump. Hard to find current
docs.
**Fix:** Move historical docs into `docs/history/`, ad-hoc scripts into
`scripts/dev/`. Update cross-references in `CLAUDE.md`, `CONTEXT.md`,
`README.md`.
**Risk:** small — link maintenance.

### O8. Multiple audit docs without canonical "current state" (P3)
**File(s):** `docs/audit/`
**Why it matters:** `production-audit.md`, `PRODUCTION_AUDIT_2026_05_24.md`,
`PRODUCTION_AUDIT_2026_05_24_REV2.md`, plus per-area audits, plus
`audit_report.md` and `PRODUCTION_READINESS_AUDIT.md` at the root.
**Fix:** This file (`docs/REMAINING_ISSUES.md`) is now the canonical
"current open issues" source. Audit docs become time-stamped history.
**Risk:** none.

### O9. CLAUDE.md / CONTEXT.md drift (P3)
**File(s):** `CLAUDE.md`, `CONTEXT.md`, `docs/PROJECT_MASTER_CONTEXT_FOR_AI.md`
**Why it matters:** Pass 1 fixed CRA mentions. CONTEXT.md still cites server.py
line numbers that don't exist after the routers refactor.
**Fix:** Light pass to update line refs and remove obsolete sections.
**Risk:** none.

### O10. Mobile engine pin (P3)
**File(s):** `mobile/package.json` (`engines.node = ">=22.14.0 <23"`)
**Why it matters:** Locks contributors to Node 22.x. Node 23/24 work fine
for Expo SDK 54; the pin produces noisy `EBADENGINE` warnings on every install.
**Fix:** Bump to `">=22.14.0 <25"` (or whatever Expo officially supports).
**Risk:** small — verify Expo SDK 54 docs first.

### O11. Notifications system — broadcast push docs (P3)
**File(s):** `docs/PUSH_NOTIFICATION_SETUP.md`, `docs/REMAINING_ISSUES.md`
**Why it matters:** Broadcast push (Zomato/Blinkit-style) was added in pass 4.
Document the API, channel layout, audience semantics, opt-in toggle, and the
admin token model.
**Fix:** Update `docs/PUSH_NOTIFICATION_SETUP.md` with a "Broadcast push"
section covering `POST /api/v1/admin/broadcast`, the `promotions` Android
channel, and how `users.notify_promotional` gates delivery. Also document
the `ADMIN_API_TOKEN` env var.
**Risk:** none — docs.

---

## Recently fixed

| Date | Pass | Item |
|------|------|------|
| 2026-05-25 | Pass 1 | Backend: `auth.py` `settings.FRONTEND_URL` → `PUBLIC_SITE_URL` (latent crash fix). |
| 2026-05-25 | Pass 1 | Mobile: `error.log` / `*.log` added to `mobile/.gitignore`. |
| 2026-05-25 | Pass 1 | Docs: stale CRA mentions in `CLAUDE.md`, `docs/FRONTEND_DESIGN_CONTEXT_FOR_AI.md`. |
| 2026-05-25 | Pass 2 | Mobile: removed unused `react-native-toast-message`. |
| 2026-05-25 | Pass 2 | Backend: removed unused `supabase==2.29.0` Python SDK. |
| 2026-05-25 | Pass 2 | Backend: replaced startup `print()` with `logger.info` in `server.py`. |
| 2026-05-25 | Pass 2 | Web: removed `react-scripts` and dead scripts; 1,152 transitive packages dropped; `vite build` verified. |
| 2026-05-25 | Pass 3 | Mobile: customer Bookings tab auto-refreshes via `useFocusEffect` + Supabase Realtime (`subscribeToUserBookings`). |
| 2026-05-25 | Pass 3 | Mobile: Discover-tab-after-booking bug fixed via `popToTop` in `navigateToCustomerBookings` + new `resetToCustomerDiscover` helper. |
| 2026-05-25 | Pass 4 | Backend + Mobile + DB: Zomato/Blinkit-style broadcast push (admin endpoint, `promotions` Android channel, `notify_promotional` opt-in, `broadcast_notifications` audit table). |
| 2026-05-25 | Ops | `database/39_broadcast_notifications.sql` applied in Supabase ✅. `ADMIN_API_TOKEN` set in Render env vars ✅. Local APK build triggered (EAS local, preview profile). |
| 2026-05-25 | Pass 5 | Mobile: persistent login across swipe-kill — `secureStorage` now falls back to AsyncStorage on 2KB limit; `initializeAuth` trusts persisted token immediately, only clears on confirmed 401. |
| 2026-05-25 | Pass 6 | Mobile: signup OTP flow routes to `VerifyOtp` screen. `authStore.verifyOtp` now uses `data.profile` (not raw `data.user`). `pendingSignupStore` stashes name+phone; `VerifyOtpScreen` PATCHes profile after verify. Backend: restored 5 missing endpoints (`/auth/me`, `/auth/profile`, `/auth/push-token`, `/auth/notification-preferences`, `/auth/account`). Profile save now works. |
| 2026-05-25 | Pass 7 | Backend + Mobile: owner signup now lands on owner tabs. `VerifyOtpRequest` accepts `role`/`name`/`phone` hints; backend uses them only when no profile row exists (no escalation). Mobile reads from `pendingSignupStore` and passes them on signup verify. Added `.kiro/steering/production-rules.md` for the production posture. |
| 2026-06-14 | Pass 9 | Database: `reschedule_booking_atomic` validates staff active status, working hours, and conflicts (migration 45). |
| 2026-06-14 | Pass 9 | Backend + Mobile + Web: unified email dispatch (Supabase primary, Resend fallback) & OTP flicker fixes. |
| 2026-06-14 | Pass 9 | Backend: `httpx.AsyncClient` reused lazily to resolve performance bottleneck (B5). |
| 2026-06-14 | Pass 9 | Backend: user profile TTLCache TTL reduced to 30s to resolve process inconsistency (B6). |
| 2026-06-14 | Pass 9 | Mobile: removed duplicate dead staff helpers from `lib/api.ts` (M7). |

---

*This file is the canonical open-issue tracker for TrimiT. When you close
an item, move it to "Recently fixed" with the date and pass number, and
trim the section to the last 60 days.*
