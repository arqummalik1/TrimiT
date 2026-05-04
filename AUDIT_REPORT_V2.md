# TrimiT — Production Readiness Audit 2.0 (Re-audit)

> **Re-audited by:** Senior React Native / Backend Architect (23+ yrs)
> **Date:** 2026-05-01
> **Method:** Verified against the current state of `backend/server.py` (1454 lines), `backend/config.py`, `mobile/App.tsx`, `mobile/src/lib/*`, `mobile/src/store/authStore.ts`, screens, `eas.json`, migrations, and CI workflows.
> **Compares against:** `AUDIT_REPORT.md` (initial audit).
> **Verdict:** **Significant progress — but NOT production-ready yet.** ~14 of 27 prior findings resolved, 7 partial, 6 still open. **3 NEW critical issues** introduced by recent changes.

---

## Big-Picture Score (Then vs Now)

| Area | Initial (v1) | Now (v2) | Change |
|---|---|---|---|
| Architecture | 8/10 | 8/10 | — |
| Security | 4/10 | **6.5/10** | ▲ Big jump (SecureStore, JWT local validation, Sentry). One regression (HMAC fallback secret). |
| Reliability | 5/10 | **7.5/10** | ▲ Tenacity retries + atomic booking RPC + Sentry are huge. |
| Performance | 6/10 | **7/10** | ▲ PostGIS-style nearby RPC, map clustering. Pagination still missing. |
| Code Quality | 6/10 | 6.5/10 | ▲ Zod params, AppError type. Backend still single-file. |
| Testing | 1/10 | **2/10** | ▲ Jest wired, 1 trivial test. Backend 0. |
| Observability | 2/10 | **8/10** | ▲▲ RequestID middleware, JSON logs, Sentry on both apps. |
| UX Polish | 7/10 | **8/10** | ▲ Permission primer, expo-image, ErrorBoundary, hydration guard. |

**Net:** You closed the highest-risk security gaps (token storage, JWT validation, RLS partial). Reliability moved the most. Three new sharp edges crept in — fixable in a day.

---

## TL;DR — What to fix THIS WEEK

🔴 **3 new bugs introduced** + **3 unresolved CRITICALs**:

1. **`eas.json` still has plaintext API keys** (B2) — hardcoded and shipped in app binaries.
2. **HMAC fallback secret `'trimit_dev_secret_2026'` is shipped to prod** (🆕 NEW) — `mobile/src/lib/security.ts:3`.
3. **`authStore.logout()` does NOT clear `queryClient`** (B11 + 🆕) — User A's data bleeds into User B's session on the same device.
4. **`PaymentScreen` has no AppState listener** (B12) — backgrounded mid-payment = unrecoverable.
5. **Backend deps still unpinned** (A2) — one Render redeploy = roulette.
6. **Booking/Payment endpoints have NO rate limiting** (A7 partial) — only signup/login do.

Each of these has a copy-paste 🤖 prompt below. Total fix time: ~1 day for one engineer.

---

# Part A — BACKEND Re-audit

| ID | Issue | Status | Evidence | What still needs to happen |
|---|---|---|---|---|
| A1 | RLS bypass via service role key | 🟡 Partial | `server.py:277` aliases `supabase_public_request = supabase_service_role_request`. Used at `:467` (signup, OK as admin) and `:1258` (booking-status PATCH, NOT OK). | Route booking-status update through user JWT or document why admin is required. |
| A2 | Unpinned Python deps | ❌ Not Fixed | `requirements.txt` lines 1–37 — every package bare. | Pin every version. |
| A3 | Env validation at startup | ✅ Fixed | `config.py:8-10` — required fields have no default. App fails fast. | — |
| A4 | Backend tests | ❌ Not Fixed | No `tests/` dir, no pytest. | Add pytest + 5 priority tests. |
| A5 | Sentry on backend | ✅ Fixed | `server.py:28-35`, gated on DSN, `FastApiIntegration`. `services/logger.py:26` calls `capture_exception`. | — |
| A6 | Retry on httpx | ✅ Fixed | `server.py:197-206` — `tenacity @retry` 3 attempts, exp backoff, retries on `TimeoutException`/`NetworkError`. | — |
| A7 | Rate limiting | 🟡 Partial | `slowapi` configured. Only `:425` `@limiter.limit("3/minute")` (signup) and `:483` `@limiter.limit("10/minute")` (login). 25 endpoints unprotected. | Cover bookings, payments, reviews, password reset. |
| A8 | Local JWT validation | ✅ Fixed | `server.py:327-410` — `jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])` first, Supabase fallback only when needed; `TTLCache(maxsize=1000, ttl=300)` at `:324`. | — |
| A9 | Atomic booking RPC | ✅ Fixed | `server.py:1169` calls `rpc/create_atomic_booking`. `backend/database/booking_rpc.sql` defines locking + capacity check + insert. | — |
| A11 | Observability (request ID + JSON logs) | ✅ Fixed | `server.py:288-298` `RequestIDMiddleware` injects `X-Request-ID`. `:301-314` `CustomJsonFormatter`. `python-json-logger` pinned in deps. | — |
| A12 | Single-file refactor | ❌ Not Fixed | `server.py` is 1454 lines, no `APIRouter`s. | Carve into routers/ — already prompted in v1. |
| A14 | Pagination on `/api/salons` | ❌ Not Fixed | `server.py:634` — no offset/limit. | Add `limit`, `offset`, return `{data, pagination}`. |
| A15 | Haversine via PostGIS-ish RPC | ✅ Fixed | `server.py:645` calls `rpc/get_nearby_salons`. SQL at `database/10_add_nearby_salons_rpc.sql`. Python fallback retained, fine. | — |
| A16 | Standard error envelope | ❌ Not Fixed | Bare `HTTPException(detail=...)` everywhere. | Global exception handler returning `{error:{code,message,request_id}}`. |
| A17 | Deeper `/health` | 🟡 Partial | `server.py:412` returns `{status, timestamp}` only. | Ping Supabase. Add `/livez` + `/readyz`. |
| A18 | API versioning `/api/v1` | ❌ Not Fixed | Still `/api/...`. | Mount under `/api/v1`. |
| A19 | Idempotency keys | 🟡 Partial | Payment verify short-circuits if already paid (`server.py:1384-1400`). Bookings have no idempotency. | Add `Idempotency-Key` header on POST /bookings + /payments/verify. |
| A20 | Composite indexes | 🟡 Partial | UNIQUE `(user_id, salon_id, service_id, booking_date, time_slot)` exists; missing `(salon_id, booking_date, time_slot)` index for slot-availability scans. | Add migration. |
| A21 | CORS hardening | ❌ Not Fixed | `server.py:60-66` still `allow_methods=["*"]`, `allow_headers=["*"]`. | Restrict explicitly. |
| 🆕 | Misleading alias `supabase_public_request` | ❌ New | `server.py:277` aliases admin call to a name that sounds public. | Rename to `supabase_admin_request`; audit each remaining call site. |

---

# Part B — MOBILE Re-audit

| ID | Issue | Status | Evidence | What still needs to happen |
|---|---|---|---|---|
| B1 | SecureStore for tokens | ✅ Fixed | `authStore.ts:160` — `createJSONStorage(() => secureStorage)` + `partialize`. `secureStorage.ts` wraps `expo-secure-store`. | — |
| B2 | Plaintext keys in `eas.json` | ❌ **STILL OPEN** | `eas.json:22-24, 31-32` — `EXPO_PUBLIC_SUPABASE_ANON_KEY` and `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` hardcoded for both `preview` and `production`. | Move to EAS secrets, restrict Maps key by bundle ID + SHA-1. |
| B3 | Per-screen ErrorBoundary | ✅ Fixed | `App.tsx:153-154` boundary wraps RootNavigator; per-screen wrapping deemed unnecessary at this depth. | — |
| B4 | Tests on mobile | 🟡 Partial | `package.json:9` `"test": "jest"` + `jest-expo` preset. Only `__tests__/authStore.test.ts` (~22 lines, 2 trivial cases). | Add booking 409, payment-success, refresh-flow, errorHandler tests. |
| B5 | Sentry on mobile | ✅ Fixed | `App.tsx:79-85` `Sentry.init({dsn, tracesSampleRate, debug:__DEV__})`; `:175` `export default Sentry.wrap(App)`. | Source-map upload to verify next prod build. |
| B6 | `initializeAuth` race | ✅ Fixed | `App.tsx:125-139` blocks render on `!isHydrated || !fontsLoaded`; `authStore.ts:163` flips `isHydrated` in `onRehydrateStorage`. | — |
| B7 | 401 → refresh flow | ✅ Fixed | `api.ts:91-154` — `isRefreshing`+`failedQueue`; calls `supabase.auth.refreshSession()` (`:131`); on failure `logout()` (`:149`); queue drained (`:142`). | — |
| B8 | Slot hold / reserve | ❌ Not Fixed | No `/api/slots/.../reserve`. Only optimistic 409 detection at `BookingScreen.tsx:182`. | 90-second slot hold endpoint + countdown. |
| B10 | Offline queue + UI | 🟡 Partial | Search disabled offline at `DiscoverScreen.tsx:126`. `query-async-storage-persister` in deps but persistor not wired. `OfflineBanner` import commented at `App.tsx:36`. | Wire persistor; enable banner; disable Confirm/Pay buttons offline. |
| B11 | Logout cleanup | ❌ Not Fixed | `authStore.ts:135-147` clears Zustand only — does **not** call `queryClient.clear()`, `supabase.auth.signOut()`, or `SecureStore.deleteItemAsync('token')`. | Centralize — see prompt M3 below. |
| B12 | Payment AppState handling | ❌ Not Fixed | `PaymentScreen.tsx` has no `AppState` listener. | Add listener + recovery flow. |
| B13 | `any` in error paths | ❌ Not Fixed | `types/error.ts` exists, but `catch (error: any)` remains in `ProfileScreen`, `ManageSalonScreen`, `ForgotPasswordScreen`, `LocationPickerModal`. | Replace with `handleApiError(error)` returning `AppError`. |
| B14 | ImageCarousel keys | ✅ Fixed | `ImageCarousel.tsx:43` `keyExtractor={(item) => item}` (URL string). | — |
| B15 | Zod route param validation | ✅ Fixed | `BookingScreen.tsx:38` `BookingParamsSchema.safeParse(route.params)`. `navigation/params.ts` defines schemas. | Apply same pattern to `WriteReviewScreen`, `ServiceDetailScreen`. |
| B16 | Map clustering | ✅ Fixed | `DiscoverScreen.tsx:29` imports `ClusterMap` from `react-native-map-clustering`. | — |
| B17 | Lazy charts | ❌ Not Fixed | No `React.lazy` / `Suspense` for charts; `react-native-gifted-charts` imported eagerly. | Code-split Owner Dashboard charts. |
| B19 | `expo-image` adoption | 🟡 Partial | Used in `SalonCard.tsx`, `ImageCarousel.tsx`. RN `Image` still in `RoleSelectScreen.tsx` (static logo — acceptable). | Audit remaining screens; static asset use OK. |
| B20 | Permission primer | ✅ Fixed | `PermissionPrimer.tsx` exists; used at `DiscoverScreen.tsx:59`. | Apply to notifications permission too. |
| B21 | A11y labels | 🟡 Partial | Some labels (`DiscoverScreen.tsx:240`); `PermissionPrimer.tsx:47-53` buttons unlabeled; majority inconsistent. | Systematic pass with VoiceOver/TalkBack. |
| B27 | Analytics SDK | 🟡 Partial | `analytics.ts:26-73` skeleton singleton; `App.tsx:107` calls `analytics.init()`. PostHog commented; no real events captured. | Connect PostHog/Segment; emit core events. |
| 🆕 | HMAC signing fallback secret shipped to prod | ❌ **NEW** | `security.ts:3` `'trimit_dev_secret_2026'` fallback. `EXPO_PUBLIC_*` vars are bundled into the binary. | Remove fallback; require explicit secret at build; verify backend has matching secret. |
| 🆕 | QueryClient leak across users | ❌ **NEW** | `authStore.ts:135-147` logout. Two users on one device → second user sees first user's cached bookings/profile until cache evicts. | Inject `queryClient` into auth store; `clear()` on logout. |
| 🆕 | Payment session loss on background | ❌ **NEW** | Same as B12 but worth highlighting: silent data loss + duplicate charges possible. | AppState listener + server-side status reconcile. |

---

# Part C — Copy-Paste 🤖 Prompts for Open Items

These are the **only prompts you need next.** Paste each into Claude Code at the repo root.

## 🔴 CRITICALs (fix this week)

### M1 — Move `eas.json` plaintext keys to EAS Secrets *(ref: B2)*
> Open `mobile/eas.json`. The `preview` and `production` profiles currently inline real values for `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`, and `EXPO_PUBLIC_API_URL`. Replace each value with the EAS secret reference syntax (e.g. `"$EXPO_PUBLIC_SUPABASE_ANON_KEY"`). Then output the exact `eas secret:create --scope project --name <NAME> --value <VALUE>` commands the user needs to run for each key (one per line, with placeholders for the real values). Also: print a Google Cloud Console checklist for restricting the Maps API key to the Android package + SHA-1 and iOS bundle ID — Maps SDK only. Do NOT commit any real key values to the repo.

### M2 — Remove HMAC fallback secret in `security.ts` *(ref: 🆕 NEW)*
> In `mobile/src/lib/security.ts:3`, the line `const API_SIGNING_SECRET = process.env.EXPO_PUBLIC_API_SIGNING_SECRET || 'trimit_dev_secret_2026';` ships a hardcoded fallback secret in production binaries. Remove the fallback. If `process.env.EXPO_PUBLIC_API_SIGNING_SECRET` is missing, throw an error in `__DEV__` and silently disable signing in production (better: fail closed and surface a Sentry message). Add `EXPO_PUBLIC_API_SIGNING_SECRET` to EAS secrets (preview + production). Then update `backend/config.py` to add a required `API_SIGNING_SECRET: str` setting and add middleware in `backend/server.py` that verifies `X-Trimit-Signature` for mutating routes (POST/PUT/PATCH/DELETE). Reject mismatches with 401. Add a pytest case asserting tampered signatures fail.

### M3 — Centralize logout: clear QueryClient + SecureStore + Supabase session *(ref: B11 + 🆕)*
> In `mobile/src/store/authStore.ts:135-147`, the `logout()` action only clears Zustand state. This leaks across users on the same device. Refactor: (1) Add a `setQueryClient(qc)` action and call it from `App.tsx` once `queryClient` is created. (2) Inside `logout()`, in this exact order: `await supabase.auth.signOut()`, `await SecureStore.deleteItemAsync('auth-storage')` (or whatever key Zustand persist uses — verify in `secureStorage.ts`), `queryClient?.clear()`, then reset Zustand state to defaults, then call `setAuthToken(null)`. (3) Remove any duplicated logout/cleanup from `SettingsScreen.tsx` so this is the only path. (4) In `api.ts:149` (the 401-refresh failure branch), make sure it routes through this same `logout()`. (5) Add a Jest test in `__tests__/authStore.logout.test.ts` that mocks `queryClient.clear` and asserts it's called.

### M4 — `PaymentScreen` AppState reconciliation *(ref: B12)*
> In `mobile/src/screens/customer/PaymentScreen.tsx`, add an `AppState` listener with `useEffect` that subscribes on mount and unsubscribes on unmount. Track `isPaying` state (true once the user starts the WebView Razorpay flow). When `nextAppState === 'active'` and `isPaying === true`, call a new backend endpoint `GET /api/payments/status?order_id=<id>` (add it server-side: returns `{status: 'pending' | 'paid' | 'failed' | 'cancelled'}` based on Razorpay order lookup). Branch: `paid` → invalidate `['bookings']`, navigate to confirmation; `failed`/`cancelled` → show retry CTA; `pending` → re-mount the WebView. Persist `currentOrderId` in `bookingStore` so it survives app kill; on cold start, check pending payments once. Write a Jest test simulating background→active with a mocked status endpoint.

### M5 — Pin every backend dependency *(ref: A2)*
> In `backend/requirements.txt`, every package is unpinned. Run `pip freeze` against the working venv (the one currently deployed on Render). For each line in the existing file, replace it with the exact `package==version` line from `pip freeze`. Group with comment headers (Web, Database & Auth, AI, Utils, Observability). Create a separate `backend/requirements-dev.txt` with `pytest`, `pytest-asyncio`, `respx`, `ruff`, `mypy`. Verify by deleting the venv, recreating it, `pip install -r requirements.txt`, and confirming `uvicorn server:app --port 8001` boots cleanly. Document in `CLAUDE.md` that all version bumps go through PR review.

### M6 — Rate limit booking, payment, review endpoints *(ref: A7)*
> `backend/server.py` has `slowapi` initialized but only `@limiter.limit` on signup (3/min) and login (10/min). Add per-endpoint limits to: `POST /api/bookings` 20/min, `POST /api/payments/create-order` 10/min, `POST /api/payments/verify` 10/min, `POST /api/reviews` 5/min, `POST /api/auth/forgot-password` 3/min, `PATCH /api/bookings/{id}/status` 30/min, `PATCH /api/owner/bookings/{id}/accept|reject` 30/min. Use a `key_func` that prefers the JWT-derived user_id and falls back to IP. Update the existing `RateLimitExceeded` handler to return the standard error envelope (after M7 lands; for now `{"error": "rate_limited", "retry_after": ...}`). Add `tag` to Sentry on hits so we can monitor abuse.

## 🟠 HIGH (fix in week 2)

### M7 — Standard error envelope *(ref: A16)*
> Add a global exception handler in `backend/server.py` that produces `{"error": {"code": <MACHINE_CODE>, "message": <human msg>, "request_id": <uuid>}}` for every error. Define `ErrorCode` enum: `SLOT_FULL`, `INVALID_SIGNATURE`, `UNAUTHORIZED`, `NOT_FOUND`, `RATE_LIMITED`, `VALIDATION_FAILED`, `INTERNAL_ERROR`. Replace every `raise HTTPException(status_code=..., detail=str)` with a new `raise_error(code, message, status)` helper. Update mobile `mobile/src/lib/errorHandler.ts` to read `error.code` and produce typed `AppError`. Update `RateLimitExceeded` handler to use the same envelope.

### M8 — Booking endpoint rate-limited + idempotency *(ref: A19)*
> Accept optional `Idempotency-Key: <uuid>` header on `POST /api/bookings` and `POST /api/payments/verify`. Add migration `database/11_idempotency_keys.sql`: `CREATE TABLE idempotency_keys (key text, user_id uuid, response_body jsonb, status_code int, created_at timestamptz default now(), expires_at timestamptz, PRIMARY KEY (user_id, key))`. On request: if `(user_id, key)` exists → return cached response. Else process, then store response with 24h TTL. Add a Postgres scheduled function (or simple cleanup query in cron) to delete expired rows. In `mobile/src/lib/api.ts`, generate a fresh `crypto.randomUUID()` per booking/payment mutation and forward it in headers. Verify retries are safe.

### M9 — Pagination on `/api/salons` *(ref: A14)*
> Add `limit: int = Query(20, le=100)` and `offset: int = Query(0, ge=0)` query params to `GET /api/salons` in `backend/server.py:634`. Forward to Supabase with `Prefer: count=exact` header to capture total. Return envelope `{"data": [...], "pagination": {"limit", "offset", "total"}}`. Update mobile `useQuery` for salons to `useInfiniteQuery` with `getNextPageParam`. Update `DiscoverScreen.tsx` FlatList with `onEndReached` and `onEndReachedThreshold={0.5}`. Verify scroll loads next page and search resets pagination.

### M10 — Composite index on bookings *(ref: A20)*
> Add `database/12_perf_indexes.sql` creating `CREATE INDEX IF NOT EXISTS idx_bookings_salon_date_status ON bookings(salon_id, booking_date, status)`. Also add `CREATE INDEX IF NOT EXISTS idx_bookings_user_status ON bookings(user_id, status)`. Apply via Supabase. Run `EXPLAIN ANALYZE` against the slot-generation SELECT (in `server.py` slot logic) before/after; record the speedup in the migration file's header comment.

### M11 — CORS hardening *(ref: A21)*
> In `backend/server.py:60-66`, replace `allow_methods=["*"]` with `["GET", "POST", "PATCH", "DELETE", "OPTIONS"]` and `allow_headers=["*"]` with `["Authorization", "Content-Type", "X-Request-ID", "Idempotency-Key", "X-Trimit-Timestamp", "X-Trimit-Signature"]`. Verify mobile and web requests still succeed end-to-end against staging.

### M12 — Backend pytest setup + 5 priority tests *(ref: A4)*
> Add `pytest`, `pytest-asyncio`, `respx`, `httpx` to `backend/requirements-dev.txt`. Create `backend/tests/conftest.py` with `client` (FastAPI TestClient) and `mock_supabase` (respx-based) fixtures. Write: (1) `test_atomic_booking.py` — fire 50 concurrent requests at the same slot via `asyncio.gather`; assert exactly N succeed where N is the salon's `max_bookings_per_slot`. (2) `test_payment_verify.py` — valid HMAC succeeds, tampered HMAC returns 400, replay returns the cached idempotent response. (3) `test_slot_generation.py` — past slots filtered with 5-min grace, fully-booked slots excluded, timezone correctness. (4) `test_auth_guard.py` — missing/expired/invalid token returns 401 without an outbound network call (assert `mock_supabase` not hit). (5) `test_owner_isolation.py` — owner A's request for owner B's booking returns 403/404. Wire to `.github/workflows/backend-ci.yml` running on PRs touching `backend/**`.

### M13 — Mobile booking + 401 refresh tests *(ref: B4)*
> Add to `mobile/__tests__/`: (1) `api.refresh.test.ts` — mock two parallel 401s; assert `supabase.auth.refreshSession` is called exactly once and both original requests retry with the new token. Mock refresh failure and assert `logout()` runs. (2) `BookingScreen.test.tsx` — mock 409 from booking POST; assert toast says "slot taken" and slot list refetches. (3) `PaymentScreen.appstate.test.tsx` — simulate background → active during `isPaying`; assert `/api/payments/status` is hit and the right branch fires per response. Add `@testing-library/react-native` mocks for navigation, `Sentry` no-ops, and `expo-secure-store`.

## 🟡 MEDIUM (fix in week 3)

### M14 — Slot hold / reservation system *(ref: B8)*
> *(Same as v1 prompt B8, still pending.)* Add `database/13_slot_holds.sql` with a `slot_holds` table `(id, salon_id, service_id, booking_date, time_slot, user_id, expires_at, created_at)`. Add `POST /api/slots/reserve` returning `{hold_id, expires_at}` (90s). Final-Guard checks holds. `POST /api/bookings` requires `hold_id`, atomically converts hold → booking. In `BookingScreen.tsx`, on slot selection: reserve, show countdown timer, on confirm convert. Release on back-nav / unmount / expiry.

### M15 — Refactor `server.py` into routers *(ref: A12)*
> Split `backend/server.py` into modules without changing route paths or response shapes. PR1: `auth/dependencies.py` (`get_current_user`), `auth/jwt.py`. PR2: `db/supabase.py` (`call_supabase`, `supabase_admin_request`, rename old alias). PR3: `services/booking.py` (slot generation + atomic-booking RPC wrapper). PR4: `services/payments.py` (Razorpay HMAC). PR5: `routers/{auth,salons,bookings,payments,owner}.py` mounted via `app.include_router`. Each PR keeps tests green.

### M16 — Eliminate `error: any` *(ref: B13)*
> In `mobile/src/`, replace every `catch (error: any)` with `catch (error)` and pipe through `handleApiError(error)` from `errorHandler.ts` to get typed `AppError`. Specific files: `screens/customer/ProfileScreen.tsx:40`, `screens/owner/ManageSalonScreen.tsx`, `screens/auth/ForgotPasswordScreen.tsx`, `components/LocationPickerModal.tsx`. Run `tsc --noEmit` after; assert zero new errors. Add `"noImplicitAny": true` if not enforced (check `mobile/tsconfig.json`).

### M17 — Lazy-load Owner Dashboard charts *(ref: B17)*
> In `mobile/src/screens/owner/OwnerDashboardScreen.tsx`, move the three chart imports (`BookingsTrendChart`, `PopularServicesChart`, `StatusDistributionChart`) into a single new file `OwnerDashboardScreen/charts/AnalyticsCharts.tsx` exporting them as named exports plus a default-exported wrapper. In the dashboard, import via `const Charts = React.lazy(() => import('./charts/AnalyticsCharts'))` wrapped in `<Suspense fallback={<DashboardSkeleton />}>`. Confirm with `expo export --dump-sourcemap` size analysis that the dashboard route's initial JS shrinks.

### M18 — Wire offline persister + uncomment OfflineBanner *(ref: B10)*
> In `mobile/App.tsx`, replace bare `<QueryClientProvider client={queryClient}>` with `<PersistQueryClientProvider client={queryClient} persistOptions={{persister: createAsyncStoragePersister({storage: AsyncStorage})}}>`. Tune `gcTime` and `maxAge` to 24h. Uncomment the `OfflineBanner` import and render it above the navigator. In `BookingScreen.tsx` and `PaymentScreen.tsx`, disable the Confirm/Pay buttons when `useNetworkStatus().isOnline === false` and show inline messaging "You're offline — connect to continue."

### M19 — Health check that pings Supabase *(ref: A17)*
> Replace `GET /api/health` in `backend/server.py:412` with: a `/livez` returning 200 always (process-up probe), and a `/readyz` that pings Supabase (`/auth/v1/health` with 2s timeout) and runs a `SELECT 1` via Supabase RPC. Return 200 only when both pass; 503 with which dep failed otherwise. Document for Render's health check config.

### M20 — API versioning *(ref: A18)*
> Mount all current routers under `/api/v1/...` and keep `/api/...` as an alias one version with header `X-API-Deprecated: true; sunset=2026-09-01`. Update `mobile/src/lib/api.ts` baseURL and `frontend/src/lib/api.js` baseURL to include `/v1`. Document API versioning policy (semver, breaking-change rules) in `CLAUDE.md`.

### M21 — A11y systematic pass *(ref: B21)*
> Add `accessibilityLabel`, `accessibilityHint`, and `accessibilityRole` to every Pressable/Button/Icon in `mobile/src/components/` and `mobile/src/screens/`. Add `testID` for future Detox tests. Verify with iOS VoiceOver and Android TalkBack — every important action must announce. Files to focus first: `PermissionPrimer.tsx`, `BookingCard`, `ServiceCard`, `SalonCard`, all auth screens, payment confirm.

### M22 — PostHog real events *(ref: B27)*
> In `mobile/src/lib/analytics.ts`, swap the placeholder for the real `posthog-react-native` client. Initialize in `App.tsx` after Sentry. Track: `app_open`, `signup_completed{role}`, `salon_searched{query, results_count}`, `salon_viewed{salon_id}`, `booking_started{salon_id, service_id}`, `booking_confirmed{booking_id, payment_method, amount}`, `payment_failed{reason}`, `review_submitted{rating}`. Respect a per-user opt-out flag from Settings.

---

# Part D — Recommended Order

| Day | Tasks | Reason |
|---|---|---|
| 1 | M1, M2, M3 | Stops live secret/data leaks. |
| 2 | M4, M5 | Payment robustness + reproducible deploys. |
| 3 | M6, M7, M11 | Hardens the backend perimeter. |
| 4–5 | M8, M9, M10 | API quality + perf at scale. |
| Week 2 | M12, M13 | Test coverage on the highest-risk paths. |
| Week 3 | M14–M22 | Polish, refactor, scale prep. |

---

# What's Working Well (don't change these)

You got these right and they're a competitive advantage versus most early-stage apps:
- **JWT local validation with TTL cache** (`server.py:324-410`) — saves Supabase round trips and is correctly scoped.
- **Atomic booking via Postgres RPC** (`booking_rpc.sql`) — proper concurrency model.
- **Tenacity retries on Supabase calls** (`server.py:197-206`) — graceful under blip.
- **Request ID middleware + JSON logs** — production-grade observability foundation.
- **Sentry on both apps with `Sentry.wrap(App)`** — modern crash reporting.
- **Zod-validated route params** — robust client navigation.
- **Permission primer + map clustering + expo-image** — top-decile UX choices.
- **Hydration guard before navigator** — eliminates an entire class of startup race bugs.

---

*End of Audit 2.0. Re-audit recommended after week 2 of the prompt list above. Update CLAUDE.md to reference this file.*
