# TrimiT — Full Production Audit Report

**Date:** 24 May 2026
**Auditor:** Senior Architect Review (Backend FastAPI + Supabase, Web React/Vite, Mobile React Native/Expo SDK 54)
**Scope:** Complete review of backend, web, mobile, database, authentication (OTP + password), business logic, payments, push, deployment, observability, UI/UX, accessibility, performance, security
**App state at time of audit:** Live in production. Backend on Render. Web on Vercel (trimit.online). Mobile on Google Play closed testing. Database on Supabase. Email OTP recently introduced across mobile and web.

---

## 1. Executive Summary

TrimiT is in a credible, shippable state for closed-testing and early production. The architecture decisions are mature for an early-stage product: strict MVVM in clients, a single FastAPI gateway in front of Supabase, atomic booking RPCs, idempotency on payment/booking writes, real-time slot invalidation on mobile, and a recently-added email OTP flow that is consistent across web and mobile.

The headline issues are not stylistic — they are concrete production risks concentrated in three areas: (1) **payments reconciliation** has no Razorpay webhook, so money-without-booking and abandoned-but-paid scenarios have no automatic recovery; (2) **booking concurrency** is mostly airtight via the atomic RPC but has a live correctness bug in the slot generator and gaps in reschedule capacity checks; (3) **observability** is partial — a duplicated request-ID ContextVar means all error responses carry a null request ID, breaking the support workflow.

The OTP migration itself is well-implemented end to end. The UX is consistent across web and mobile, server endpoints are rate-limited, and recovery flow integrates with the existing reset-password path. The remaining auth gaps are enumeration oracles on legacy endpoints (login + signup) and an unconstrained `create_user=True` on `/send-otp` that doubles as an email-spam primitive.

Overall production-readiness verdict: **B+. Safe to keep serving the current cohort; do not scale marketing spend until the Razorpay webhook, the slot-generator bug, and the observability gaps are closed.**

---

## 2. Severity Legend

- **P0 — Critical:** Live correctness, money, or security issue. Fix this week.
- **P1 — High:** Production-readiness blocker for scale; fix before broad GA.
- **P2 — Medium:** Quality, maintainability, or UX issue with real user impact.
- **P3 — Low:** Polish, hygiene, debt cleanup.

---

## 3. Critical Issues (P0)

### 3.1 No Razorpay webhook — paid-but-cancelled risk
There is no `/api/payments/webhook` endpoint. If a customer pays at Razorpay but does not return to the app within 15 minutes, the pending booking is auto-cancelled by the abandoned-online-booking expiry job. The Razorpay charge has already settled. The booking is gone, the slot is released, and the customer is silently out of pocket with no automated reconciliation. This is the single largest production risk in the system today.

### 3.2 Slot generator references `duration` before assignment
The slot generation function references the per-service `duration` variable inside the holds loop before it is assigned a few lines later. The first time the loop encounters a hold for a non-self user, the path raises `UnboundLocalError`. Either the path is rarely hit (which means the holds blocking logic is silently dead) or it is being swallowed upstream. Either way, slot accuracy is compromised under contention.

### 3.3 Request ID middleware does not propagate to error handlers
`request_id_var` is declared as a `ContextVar` twice — once in the middleware module and once in the exceptions module. Setting it in one is invisible to the other. The result: every error response returned to clients carries `request_id: null`, defeating the entire support-traceability story. Sentry breadcrumbs still work, but client-side error payloads cannot be cross-referenced.

### 3.4 No refund pathway anywhere
Cancelling a paid booking flips status only. No Razorpay refund call is made. For a live consumer app accepting real money, this is a contractual and compliance risk. Customers currently have to chase the salon owner manually for refunds, and there is no audit trail of what was refunded vs disputed.

### 3.5 Reschedule ignores staff conflicts and service-duration overlaps
The reschedule RPC validates capacity at the salon level but does not check whether the assigned staff member is free at the new time, and it does not check whether the new slot overlaps with a longer-duration booking starting before or after it. A 60-minute service can be rescheduled onto a slot that is already half-occupied by another customer. The booking-creation RPC has the same duration-overlap blind spot — it only checks discrete slot equality.

### 3.6 Owner UPDATE policy on `bookings` is too broad
Salon owners can update any column on bookings they own, including `payment_status` and `amount`. A malicious or compromised owner account can mark unpaid bookings as paid, or adjust historical amounts to manipulate revenue records. Owner mutations should be confined to an explicit set of allowed status transitions via RPC.

---

## 4. High-Priority Issues (P1)

### 4.1 `/login` leaks email-confirmation status
The login endpoint returns a distinct `EMAIL_NOT_CONFIRMED` error code when a real-but-unverified email is supplied. This is an account-enumeration oracle. Either generalize the response to "invalid credentials" or only surface the distinction after a verified password match.

### 4.2 `/send-otp` with implicit account creation
The OTP send endpoint passes `create_user=true` to Supabase, meaning anyone can trigger account creation and email dispatch for any address, throttled only by the per-IP slowapi limit. This is both an email-spam primitive and a way to silently pollute the auth table. Either set `create_user=false` and pre-check existence, or layer a per-email throttle (stored in DB or Redis) on top of the per-IP one.

### 4.3 Rate limiter falls back to per-IP for every user
The slowapi key function prefers `request.state.user["id"]` but no middleware ever populates that before the limiter runs. The per-user branch is dead code. Every limit is effectively per-IP, which mismeasures both NAT clusters and distributed attackers. Behind Render's load balancer this also needs `X-Forwarded-For` trust configuration; if that's not in place, every request shares one bucket.

### 4.4 No token-refresh path on 401 (mobile and web)
Both clients clear the session and bounce the user to login on the first 401. The Supabase refresh token is persisted and `autoRefreshToken: true` is configured, but the client never attempts a refresh-and-retry before tearing down the session. Long-session users will see surprise logouts.

### 4.5 Stranded slots if expiry job not deployed
The unique active-slot index combined with status-based filtering means that a stuck "pending" online booking will permanently occupy a slot until manually cleaned up. Migration 33 introduces the expiry job, but it must be confirmed deployed on production Supabase. Without it, the live database will accumulate slot-blocking ghosts.

### 4.6 `salon_cash` is not validated against salon configuration
A client choosing `salon_cash` as the payment method always succeeds, regardless of whether the salon has opted into cash payments. There is no `payment_methods` column on `salons` and no server-side check. An online-only salon can be tricked into receiving cash bookings it does not service.

### 4.7 Non-production service-role booking fallback exists in the deployable code
A code path in the bookings router uses the service role to reserve a slot without row locking, gated on `ENVIRONMENT != "production"`. One missing or misspelled environment variable away from being live, with all RLS bypassed. Either remove it entirely or gate it on a positive opt-in secret distinct from `ENVIRONMENT`.

### 4.8 Idempotency in-progress sentinel has no TTL
The idempotency wrapper inserts a "processing" sentinel row and is supposed to delete it on exception. If the process is killed between the work completing and the result being stored, the sentinel persists forever. Subsequent retries by the same user with the same key are permanently 409'd. Add a TTL or a sweeper that evicts sentinels older than N seconds.

### 4.9 Idempotency wrapper falls back to non-idempotent execution on internal errors
When the idempotency machinery itself throws (e.g., Supabase transient failure during the lookup), the wrapper falls back to executing the handler without idempotency. Should fail closed, not open — a transient bug here could double-create bookings.

### 4.10 Recursive 409 retry in profile upsert has no depth bound
A persistent constraint mismatch during profile upsert could infinitely recurse. Bound it to a single retry.

### 4.11 No web push notifications
Salon owners using the web dashboard receive no notifications for new bookings unless the tab is open and listening to Realtime. Mobile owners get push; web owners do not. Either ship Service-Worker push or document this gap to owners.

### 4.12 Web has no real-time slot invalidation
Mobile subscribes to Supabase Realtime in BookingScreen and invalidates slot queries when concurrent bookings land. Web does not. The concurrent-booking UX on web is therefore worse than mobile — users may see slots that were taken seconds ago.

### 4.13 Build tool drift: project documented as CRA, is actually Vite
The web app is fully on Vite 6. The `react-scripts 5.0.1` dependency is dead weight, pulls in a vulnerable transitive graph, and CLAUDE.md is stale on this point. Remove `react-scripts` and update documentation.

### 4.14 No security headers on the web app
The Vercel configuration sets only content-types for the sitemap and robots files. There is no CSP, HSTS, X-Frame-Options, Referrer-Policy, or Permissions-Policy. For a consumer-facing site that handles auth and payments, this is below baseline.

### 4.15 No monitoring/Sentry on the web frontend
Backend and mobile both have Sentry. Web has none. Production errors on the most-trafficked surface are invisible. There is a global ErrorBoundary but it only logs in dev.

---

## 5. Authentication & OTP Flow Audit

### 5.1 What works well
- JWT signature verification is real (HS256, audience-checked) in the backend dependency. No `verify_signature=False` in production paths.
- Service-role usage is scoped: signup orchestration, profile bootstrap, and admin account deletion only. Everything else flows through user JWT with RLS applied.
- The OTP flow is implemented symmetrically across web and mobile: 6-digit numeric input, auto-advance, masked email display, 60-second resend cooldown, recovery branch routing into the existing reset-password page, success-toast UX.
- Forgot-password returns a generic message regardless of whether the email exists. Anti-enumeration done right on that endpoint.
- The signup endpoint has multiple recovery paths for the most painful Supabase failure modes (rate limits, partial registration, pending confirmations) and exposes them through readable error codes.
- Push token registration timing is correct on mobile: gated on `isAuthenticated && authBootstrapComplete`, not at app boot.
- Teardown on logout properly clears Supabase session, Realtime auth, push tokens, query cache, and Zustand state.

### 5.2 What needs improvement
- The login endpoint and the signup-already-registered branch are both enumeration oracles. Decide whether the UX tradeoff is worth the leak; for a salon marketplace it is borderline acceptable, but it should be a documented decision.
- The OTP send endpoint's `create_user=true` is the loudest single issue in the OTP flow.
- The profile cache stores the access token keyed by user id with a 5-minute TTL. After a Supabase-side refresh, downstream calls within the cache window may continue using the old token. Either drop the token from the cache or invalidate on every Supabase refresh event.
- The `try_get_user_id_from_authorization` helper catches `Exception` as the final entry in its exception tuple, making it a bare-except. Narrow this to JWT exception types only.
- Mobile auth store dynamically `require()`s sibling modules to dodge import cycles. This works but loses TypeScript narrowing on those imports. Refactor to break the cycles structurally.
- The mobile verify-OTP screen's key-press handler is typed as `any`. The mobile signup service input is typed as `any`. These are direct violations of the "no `any` in TypeScript" invariant.
- Deep-link configuration on mobile only handles `trimit://reset-password` and only when unauthenticated. If a logged-in user taps a reset link, nothing visible happens. Add a top-level handler that forces sign-out before reset.
- OTP boxes (web and mobile) have no per-digit `aria-label`/`accessibilityLabel`. Screen readers read six unlabeled inputs.
- The recovery-OTP success branch on web navigates to `/reset-password?token=${result.session?.access_token}`. The recovery verify response shape needs confirmation — if `access_token` is undefined, the URL becomes `?token=undefined` and the reset page fails token validation. Test this end-to-end.

### 5.3 Missing pieces
- No biometric / device-bound auth on mobile. Returning users still type passwords or wait for OTPs every time. Consider expo-local-authentication for unlock.
- No "trusted device" or "remember this browser" mechanic on OTP login. Every login forces a code round trip, which compounds the email-quota pressure.
- No social login. For a B2C marketplace, Google sign-in alone would materially reduce signup friction, especially on Android.
- No phone-OTP fallback. The docs guide for SMTP and phone OTP exists but the path is not wired. India market expectations skew toward phone OTP, not email.

---

## 6. Business Logic Audit

### 6.1 Booking engine
- The atomic booking RPC uses `SELECT FOR UPDATE` on the salon row inside the function, which correctly serializes concurrent reservers against the same salon. Combined with unique constraints on slot holds, this is the right shape.
- The active-slot unique index was deliberately dropped to support multi-capacity salons. Capacity enforcement now relies entirely on the row lock inside the RPC. This is fine as long as every code path that writes to `bookings` goes through the RPC. Any future admin tool or webhook that bypasses it would silently break capacity guarantees.
- The 5-minute past-time grace period is consistent across both timezone branches in slot generation.
- The slot-generator timezone fallback is wrong outside UTC. The current logic prefers a client-supplied `is_local_today` + `current_time` hint and falls back to UTC. For salons in IST near midnight, the UTC fallback computes the wrong "today." Worse, the client hint is trusted — a buggy or hostile client can submit `00:00` and expose past slots. The salon's local timezone should be stored on the salon record and "today" resolved server-side.
- Service-duration overlap is partly handled in the slot-generation view but not in the booking-creation or reschedule RPCs. A 60-minute service overlapping a 30-minute booking starting later is not blocked at the RPC level. Currently caught by the slot-view filter on the read path, but a determined client can request booking creation for a slot the view would have hidden.

### 6.2 Payments
- Order creation reads the trusted server-stored `amount` from the booking row — clients cannot manipulate the amount during create-order.
- Signature verification uses constant-time comparison on the HMAC and follows up with a Razorpay order fetch to compare paise against the booking's stored amount. This is the correct paranoid posture.
- The order-ID-mismatch check prevents replaying another order's signature against a different booking.
- Idempotency on `/verify` plus an early return when `payment_status == paid` provides double protection against double-tap.
- The gaps are all on the reconciliation side: no webhook (covered above), no refund (covered above), and no periodic reconciliation job that polls Razorpay for pending orders.

### 6.3 Discovery
- Haversine distance is computed server-side, sort happens after. This is correct.
- There is no spatial index. The `salons` GIN-on-jsonb-of-lat/lng index in the initial schema does not accelerate Haversine. A btree on `(latitude, longitude)` with a partial `WHERE latitude IS NOT NULL` would help; PostGIS is the long-term answer. At current volumes this is fine; at 10K+ salons it will become the slowest query in the system.

### 6.4 Promotions
- Promo validation runs in the router before the RPC, then the RPC ignores the client-supplied amount and recomputes the final amount from the service price minus the validated discount. This is correct — the trust boundary is in the right place.
- Whether the promo RPC atomically decrements remaining-uses is not visible from the audit surface. Verify it does so within a transaction; otherwise a parallel-request race can over-use a one-shot code.

### 6.5 Realtime
- Mobile subscribes via Supabase Realtime to invalidate slot queries on concurrent bookings. Web does not — covered above.
- The owner foreground push handler dedupes against Realtime subscription state, so owners on the booking screen do not get a doubled modal. This is a strong design touch.

---

## 7. Database & Migration Audit

### 7.1 Strengths
- RLS is enabled on all primary tables and most policies are sensible.
- Most migrations use `IF NOT EXISTS` and idempotent `DROP POLICY … CREATE POLICY` patterns — safe to re-run.
- Critical hot-path indexes exist on `bookings(user_id)`, `bookings(salon_id)`, `bookings(booking_date)`, `services(salon_id)`, and the active-slot uniqueness index.
- The notification preferences migration ships with privacy-positive defaults (promos off by default).

### 7.2 Weaknesses
- Migrations 03, 15, and 16 each have two files sharing the same numeric prefix. Lexical ordering inside a duplicate prefix is fragile. Rename to monotonic numbering in a future cleanup migration.
- `users` table has no INSERT policy — inserts must come through the service role. This is the intent but is undocumented in the migration.
- `notification_events` has RLS enabled with no policies. That makes it service-role-only, which is fine but should be commented in-place.
- Owner UPDATE on `bookings` is unconstrained at the column level (see P0).
- No index on `bookings(status)` or composite `(salon_id, status, booking_date)` for owner dashboards.
- `resolve_profile_for_user` reads with service role first and only falls back to user JWT. This means an RLS regression on `public.users` would be invisible in production. Add an integration test or env flag that flips this in staging.
- Service-role profile reads also mean the only path that exercises `users` RLS in production is direct PATCH from the client, which is rare.

### 7.3 Migration discipline going forward
- New tables should ship with policies in the same migration. The schema does this; later migrations are inconsistent.
- The pg_cron job for expiring abandoned online bookings is only commented in migration 25. Migration 33 introduces it for real — confirm applied on Supabase prod.

---

## 8. Mobile Audit (Expo SDK 54 / RN 0.81 / React 19)

### 8.1 Strengths
- Versions all align cleanly; no SDK/RN mismatch.
- TanStack Query is configured once at the app root with sensible defaults, persisted to AsyncStorage inside `runAfterInteractions` so hydration never blocks first paint.
- Auth store partializes the persist payload, recovers from corrupt persist, and guards against double-fire logout.
- API client has a NetInfo preflight with debounced offline toast, automatic idempotency-key injection, and a 401 handler that exempts public auth endpoints.
- Error boundary wraps the entire tree. Sentry is wired conditionally on DSN presence.
- Notification setup is gated on auth-bootstrap completion, not at app boot.
- Release-config guard renders a blocking splash if Supabase/Maps keys are absent in release builds — saves users from a first-launch crash.

### 8.2 Weaknesses
- Direct axios imports remain in BookingScreen and PaymentScreen, even if only for `axios.isAxiosError` typeguards. Replace with the normalized `isAppError` to fully eliminate transport leakage from view files.
- `any` types appear in StaffManagementScreen props, the signup service input, the verify-OTP store return shape, and the OTP key-press handler. All violate the typed-API invariant.
- Most data-fetching hooks live under `hooks/` but the Discover screen's `useInfiniteQuery` is inlined in the screen file. Move it for symmetry.
- No screen-level error boundaries — a render error inside the booking flow takes down the whole app.
- Deep-link configuration is shallow (one path, one auth state).
- Accessibility labels are present in only a small fraction of touchable elements. OTP boxes, back buttons, and many icon-only TouchableOpacity components are unlabeled.
- Some hit targets, particularly the back button in ForgotPassword, are below the 44pt iOS minimum on small phones.
- Permission UX for push is "system prompt the second login completes" — a primer screen before the OS prompt would lift opt-in rates on Android 13+.
- 15-second axios timeout is fine for normal requests but multipart image uploads inherit it. Slow 3G uploads will fail.

### 8.3 What is genuinely missing
- App store crash-rate dashboards are not surfaced in the repo. Sentry is wired; Play Console crash-free metric should be reviewed weekly during closed testing.
- No automated UI tests (Detox / Maestro). There are Jest unit tests under `__tests__` but the booking flow has no end-to-end coverage.
- No data-export / GDPR-style endpoint, even though account deletion is implemented for Play Store compliance.

---

## 9. Web Audit (Vite 6 / React 19 / Tailwind / TanStack Query v5)

### 9.1 Strengths
- Vite migration is complete and correct; React 19 + RR v7 + RQ v5 are current.
- SSR-style pre-rendering of marketing routes via the post-build script means crawlers see real content.
- JSON-LD coverage via `SeoHead` is broad (Organization, WebSite+SearchAction, MobileApplication, Service, FAQPage, BreadcrumbList).
- `robots.txt` is well-tuned. `sitemap.xml` is current to today's date.
- API client has consistent 401-handling and idempotency-key injection.
- Auth store rehydrates cleanly, validates on boot via `/auth/me`, and bounces invalid tokens silently.
- The OTP login UX matches mobile, with a success modal and auto-dismiss.

### 9.2 Weaknesses
- The `hooks/` directory has only two files — most data fetching is inlined in pages. This violates the MVVM rule the codebase enforces on mobile. Lift queries into hooks per page.
- Dead code: the "Check your email" branch in the signup page is unreachable because the flow always navigates to `/verify-otp`. Remove it.
- One unnecessary navigation hop: customer signup routes to `/discover`, which 301s to `/explore`. Go straight to `/explore`.
- Every owner login fires an extra `/owner/salon` probe to set `hasSalon`. If that endpoint returns non-2xx for "no salon yet," every owner login pays an extra round trip. Consider returning `hasSalon` from the login response itself.
- Error containers use `role="alert"` in some pages and not in others. Standardize.
- `text-stone-500` on `bg-stone-50` is borderline for WCAG AA body-text contrast.
- No `prefers-reduced-motion` guard anywhere despite heavy framer-motion usage.
- No preconnect for `images.unsplash.com` or Supabase; default unsplash images are hot-linked.
- No manual chunking in the Vite config despite a heavy dependency graph (8 Radix packages + framer-motion 12 + date-fns 4 + react-day-picker).
- The recovery-OTP redirect to `/reset-password?token=…` relies on a token shape that needs end-to-end verification.

### 9.3 What is genuinely missing
- No web push for owners (P1, above).
- No real-time slot invalidation (P1, above).
- No Sentry (P1, above).
- No security headers (P1, above).
- No Stripe-style "we have your money, but no booking" recovery page if the user returns post-payment without a confirmed booking.

---

## 10. Backend Audit (FastAPI / Render)

### 10.1 Strengths
- Versioned routers under `/api/v1` from day one. Easy to ship `/v2` without breaking clients.
- Service layer is meaningful — orchestration in `server.py` is genuinely thin; auth/profile/push logic lives in `services/`.
- `pydantic-settings` + `.env` discipline.
- Sentry initialized when DSN is present; `traces_sample_rate=0.2` is appropriate.
- CORS allow-list is finite (not `*`), so `allow_credentials=True` is safe.
- A startup-time loud-print of import progress means the Render logs always show the failure point on boot.

### 10.2 Weaknesses
- Duplicate ContextVar (P0 above).
- Dead per-user rate-limit branch (P1 above).
- `SignatureMiddleware` silently disables when `API_SIGNING_SECRET` is unset and logs a WARNING per request. Either hard-fail on startup when `ENVIRONMENT=production` and the secret is missing, or remove the noisy log.
- Sentry has no `before_send` PII scrubber. `Authorization` headers and emails can land in breadcrumbs. Add a scrubber.
- The standalone `backend_test.py` at the repo root is not part of the `tests/` harness. Pick one and consolidate.
- Test coverage of business logic is thin — only the OTP flow is touched, and it requires a running server. Add real pytest fixtures for slot concurrency, payment verification, and RLS smoke tests.

### 10.3 What is genuinely missing
- No webhook handler for Razorpay (P0).
- No reconciliation job for pending payments.
- No periodic SLO dashboard (Sentry has the data; nothing surfaces it).
- No health endpoint beyond `/health`. Consider adding `/ready` (DB writable, RPC functional) for Render's readiness probes.
- No structured logging schema — current logs are mostly free-text.

---

## 11. UI/UX & Accessibility

### 11.1 Strengths
- Auth surfaces (web and mobile) feel intentional: animated entrances, masked emails, clear resend cooldowns, error toasts.
- Loading/empty/error trios are componentized and used consistently on the main customer and owner screens.
- Theme tokens are centralized; both apps respect system dark mode.
- The 6-digit OTP UX with auto-advance and backspace handling is well-built.

### 11.2 Weaknesses
- Accessibility is the single largest under-investment. Mobile: only a handful of screens use `accessibilityLabel`/`accessibilityRole`. Web: inconsistent `role="alert"`, no per-digit aria labels on OTP, no reduced-motion guard.
- Some text colors fail or borderline-pass WCAG AA contrast.
- Mobile hit-targets in some auth screens are below the 44pt minimum.
- No focus-trap on the success modal (web). Keyboard users can tab out of it.
- No skeleton states for the owner dashboard charts (only for the list views).

---

## 12. Performance

### 12.1 Mobile
- TanStack Query persistence + `staleTime: 1h` means warm starts are instant. Good.
- Image rendering: verify all `<Image>` instances use `resizeMode` correctly and lazy-load remote URLs.
- Bundle size: Expo SDK 54 baseline + Razorpay native + maps is reasonable. No specific bloat noted.

### 12.2 Web
- No manual code splitting beyond Vite's route-level. Auth pages share the framer-motion chunk with the marketing pages, inflating initial bundle.
- Pre-rendering covers marketing routes but the auth and dashboard routes ship as a SPA-only bundle.
- No preconnect/preload hints for the first-byte critical path (Supabase, image CDN).

### 12.3 Backend
- The Haversine sort is sequential. Acceptable at current volume; will degrade past ~5K active salons.
- Profile resolution is service-role first, which is fast but bypasses RLS as a side effect.
- The 5-minute profile cache reduces Supabase round-trips materially. Good.

### 12.4 Database
- No `EXPLAIN` baseline captured in the repo. Add a small script that runs the top 5 queries with `EXPLAIN ANALYZE` and dumps timings into `docs/db/`.

---

## 13. Reliability

### 13.1 Strengths
- Booking write path is atomic via RPC, idempotent via key, and recoverable via Realtime.
- Push notifications never block API responses; failures are logged and accepted.
- API client offline detection prevents wasted requests.
- Health endpoint pings Supabase REST.

### 13.2 Weaknesses
- Payment reconciliation depends entirely on the client returning to the app within 15 minutes. No webhook fallback.
- Idempotency processing sentinel has no TTL.
- Reschedule has overlap blind spots.
- No circuit breaker around Supabase. A Supabase outage produces a thundering herd of failed requests with no backoff.

---

## 14. Security Posture

| Layer | Status | Notes |
|---|---|---|
| JWT signature verification | OK | HS256, audience-checked, expiry-checked |
| RLS coverage | Mostly OK | Owner UPDATE on bookings too broad |
| Service-role discipline | OK | Scoped to signup/admin/deletion |
| Email enumeration | Partial | `/login` and `/signup` leak; `/forgot-password` and `/send-otp` do not |
| Rate limiting | Partial | Per-IP only; no per-email; trust of X-Forwarded-For unconfirmed |
| Payment signature verification | OK | Constant-time HMAC + paise re-check |
| Replay protection | OK | Order-ID match + idempotency keys |
| Refund / dispute trail | Missing | No automated refund path |
| Web security headers | Missing | No CSP, HSTS, X-Frame-Options |
| PII in observability | Partial | Sentry scrubber not configured |
| Account deletion | OK | Cascades, Play-Console compliant |
| Audit log of sensitive actions | Missing | No `auth_audit` or `booking_audit` table |

---

## 15. Observability

- Backend: Sentry on, Request-ID middleware on but broken (P0).
- Mobile: Sentry conditionally on, emoji-tagged console logs for booking flow.
- Web: no Sentry, no analytics beyond Google Analytics.
- Logs are unstructured.
- No SLO dashboards.
- No alerting on payment failures, booking RPC errors, or signup spikes.

This is the area where small investments would pay the largest dividends. Adding Sentry to web, a `before_send` scrubber on backend, structured logs, and a tiny Supabase view that surfaces booking + payment health would give the team real visibility within a sprint.

---

## 16. Documentation Health

- The `docs/` directory is unusually rich for a project this size — Play Store, Notion, deployment, SEO, OTP, SMTP, ASO, stitch UI specs. This is a strength.
- The OTP guide and SMTP templates are current and useful.
- CLAUDE.md is mostly correct but is wrong about the web build tool (CRA vs Vite).
- Several `*_FIX.md` and `*_DEBUG.md` files at the repo root are episodic and could be archived under `docs/history/` to reduce noise.
- The audit history (`PRODUCTION_READINESS_AUDIT.md`, `audit_report.md`) overlaps with this document; recommend keeping only the latest per quarter.

---

## 17. Recommended 4-Week Roadmap

### Week 1 — Stop the bleeding
- Implement Razorpay webhook endpoint and reconciliation job (P0)
- Fix slot-generator `UnboundLocalError` (P0)
- Unify `request_id_var` so error responses carry a real request ID (P0)
- Tighten owner UPDATE policy on bookings (P0)
- Add per-email throttle on `/send-otp`; switch to `create_user=false` flow (P1)

### Week 2 — Reliability
- Implement Razorpay refund pathway for cancelled-paid bookings (P0)
- Add staff conflict + duration overlap checks to reschedule and creation RPCs (P0)
- Remove the non-prod service-role booking fallback or hard-gate it (P1)
- Add TTL to idempotency processing sentinel (P1)
- Add 401 refresh-and-retry to both clients (P1)
- Add Sentry to web; add `before_send` scrubber to backend (P1)

### Week 3 — Hardening + observability
- Remove `EMAIL_NOT_CONFIRMED` leak on `/login` (P1)
- Fix profile cache token staleness on refresh (P1)
- Add CSP + HSTS + X-Frame-Options + Referrer-Policy to Vercel config (P1)
- Add real-time slot invalidation to web (P1)
- Add web push for owners (P1)
- Replace remaining `any` types in mobile (P1/P2)
- Eliminate dead per-user rate-limit branch (P1)

### Week 4 — UX, accessibility, scale
- Pass an a11y review on auth + booking flows on both web and mobile (P2)
- Lift web data-fetching into `hooks/` (P2)
- Remove dead signup branch on web; remove the `/discover` → `/explore` hop (P3)
- Rename duplicate-prefix migrations (P3)
- Archive root-level fix/debug docs into `docs/history/` (P3)
- Add a btree index on `(salon_id, status, booking_date)` and `(latitude, longitude)` (P2)
- Add E2E tests for the booking + payment happy path and the OTP happy path (P2)

---

## 18. Where the App Stands Today

**The app is live, the auth migration to OTP has not introduced regressions, and the booking engine survives concurrency under normal load.** The team has built a credible monorepo with the right architectural bones — strict layering, atomic writes, idempotency, real-time invalidation, role-aware navigation. The OTP migration in particular is one of the cleanest end-to-end changes in the codebase.

What separates the current state from a confident scale-up is a small number of concrete things: a missing webhook, a single broken `ContextVar`, an over-broad RLS policy, and the observability gap on web. None of these are architectural rewrites. All are bounded fixes that fit inside a four-week roadmap.

After those land, the next horizon is the things this audit only touched lightly: a richer test harness, a refund pipeline, web push, accessibility, and a real performance baseline. The product is past the prototype phase and into the "professionalize what you already have" phase.

---

*End of audit — 24 May 2026.*
