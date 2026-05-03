# TrimiT — Production Readiness Audit Report

> **Audited by:** Senior React Native / Backend Architect (23+ yrs)
> **Date:** 2026-05-01
> **Scope:** `backend/` (FastAPI + Supabase) and `mobile/` (Expo SDK 54, React Native 0.81, React 19)
> **Verdict:** **NOT production-ready.** The app is feature-complete and architecturally sound, but ships with **5 CRITICAL** issues, **~12 HIGH** issues, and **~30 MEDIUM** issues that must be addressed before public launch on iOS/Android stores.

---

## How to Read This Report (Beginner Guide)

This document is written so a junior dev can act on it without senior supervision.

- **Severity levels:**
  - 🔴 **CRITICAL** — ship-blocker. Don't release until fixed. Security, data loss, or app crash.
  - 🟠 **HIGH** — fix in the first 1–2 weeks post-fix-CRITICALs. Will hurt you at scale or in incidents.
  - 🟡 **MEDIUM** — fix soon. Code quality, UX polish, technical debt.
  - 🟢 **LOW** — nice to have. Backlog item.

- **Each finding has 5 parts:**
  1. **Where** — exact file and line numbers (clickable from your editor).
  2. **What** — what the code currently does.
  3. **Why it's a problem** — beginner-friendly explanation.
  4. **Fix** — high-level direction.
  5. **🤖 Prompt to Fix** — copy-paste this into Claude/Cursor and it will do the work.

- **How to use the prompts:** Open Claude Code in this repo, paste the prompt verbatim, review the diff, run tests, commit. Each prompt is self-contained.

---

## Executive Summary

| Area | Score | One-liner |
|---|---|---|
| Architecture | 8/10 | MVVM + Repository + Service is well-applied. Single-file backend is the main smell. |
| Security | 4/10 | Tokens in AsyncStorage, RLS bypass via service-role key for routine calls, secrets in `eas.json`. |
| Reliability | 5/10 | No retry, no circuit breaker, no Sentry. One Supabase blip cascades to all endpoints. |
| Performance | 6/10 | Slot generation is fine; salon discovery does Haversine in Python (won't scale past ~1k salons). |
| Code Quality | 6/10 | TS strict is on but `any` leaks in error paths; backend is one 54k-byte file. |
| Testing | 1/10 | Zero unit tests in either app. One manual integration script (`backend_test.py`). |
| Observability | 2/10 | `print()` debugging, no Sentry, no metrics, trivial health check. |
| UX Polish | 7/10 | Skeletons, toasts, theme tokens are solid. A11y labels and empty-state CTAs are missing. |

**Time to production-ready (1–2 engineers):** **3–4 weeks** focused work, in this order:
- **Week 1:** Fix all 🔴 CRITICAL.
- **Week 2:** Fix all 🟠 HIGH (auth refresh, RLS hardening, observability, offline queue).
- **Week 3:** Fix top 🟡 MEDIUM (testing infra, performance, a11y, error retry UX).
- **Week 4:** Hardening — load test bookings, crash-test on low-end Android, app-store submission.

---

# Part A — BACKEND (FastAPI)

## 🔴 CRITICAL

### A1 — RLS bypassed via Service Role Key for routine reads
- **Where:** `backend/server.py:48`, plus 8+ call-sites of `supabase_public_request()` (e.g., `:204`, `:261-263`).
- **What:** The backend uses `SUPABASE_SERVICE_ROLE_KEY` (an *admin* key) for normal user-bound reads (booking fetch, salon lookup, profile fetch).
- **Why it's a problem:** This **disables Row Level Security**. If the service-role key ever leaks (logs, error message, GitHub push, Render misconfig), the entire database — every user's data — is wide open. The whole point of Supabase RLS is defeated.
- **Fix:** Use the **user's JWT** for routine reads. Reserve service-role only for true admin operations (creating a profile row right after Supabase Auth signup, system jobs).
- **🤖 Prompt to Fix:**
  > Audit every call to `supabase_public_request()` and `httpx` requests in `backend/server.py` that include `SUPABASE_SERVICE_ROLE_KEY` in the headers. For each one, decide: is this an admin operation that *must* bypass RLS (signup profile creation, cron jobs), or a user-bound read/write that should respect RLS? For user-bound calls, refactor to forward the caller's `Authorization: Bearer <user_jwt>` header instead. Create a new helper `supabase_user_request(user_token, ...)` and migrate non-admin call-sites to it. Keep `supabase_public_request()` only for admin paths and add an inline comment "ADMIN: bypasses RLS" at every remaining call. After refactor, manually verify in Supabase that RLS policies on `bookings`, `salons`, `services`, `users`, `reviews` correctly restrict access for the customer and owner roles.

### A2 — Unpinned Python dependencies
- **Where:** `backend/requirements.txt` (all 30 entries).
- **What:** Every line is a bare package name (e.g. `fastapi`, `uvicorn[standard]`, `supabase`) with no version pin.
- **Why it's a problem:** Render reinstalls fresh on every deploy. A breaking minor release of `supabase-py` or `fastapi` can take production down with no code change on your side. Builds are non-reproducible.
- **Fix:** Pin every package to a known-working version. Add a `requirements-dev.txt` for tooling.
- **🤖 Prompt to Fix:**
  > In `backend/requirements.txt`, run `pip freeze` against the current working venv (or use the versions locked in production on Render) and pin every dependency to an exact version (e.g. `fastapi==0.115.0`). Group packages with comment headers (Web, Database, AI, Utils). Create a `backend/requirements-dev.txt` for dev-only tools (`pytest`, `pytest-asyncio`, `httpx[testing]`, `ruff`, `mypy`). Verify by running `pip install -r requirements.txt` in a fresh venv and confirming `uvicorn server:app` boots without warnings. Commit `requirements.txt` and document in CLAUDE.md that all version bumps must go through a PR.

### A3 — No environment validation at startup
- **Where:** `backend/server.py:46-50`.
- **What:** `os.environ.get('SUPABASE_URL')` etc. — values default to `None` if missing. The app boots happily with broken config and only fails on the first request.
- **Why it's a problem:** A typo in Render's env panel and the app silently returns 500s in production. No fail-fast.
- **Fix:** Validate required env vars at boot using Pydantic `BaseSettings`, abort startup with a clear error if anything is missing.
- **🤖 Prompt to Fix:**
  > Create `backend/config.py` with a `pydantic-settings` `BaseSettings` class named `Settings` that loads and validates: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `ALLOWED_ORIGINS` (default to safe localhost+prod list). Mark all secrets as required (no default). Instantiate `settings = Settings()` at module import; FastAPI will crash on startup if any are missing. Replace every `os.environ.get(...)` in `server.py` with `settings.<name>`. Add a `/health` endpoint that returns env keys *present* (not values) so deploy verifies config without leaking secrets.

### A4 — No automated tests
- **Where:** Repo root: only `backend_test.py` exists, and it's a manual integration script.
- **What:** Zero unit tests, zero CI gating on PRs.
- **Why it's a problem:** Every refactor is a coin flip. Booking and payment regressions ship to users.
- **Fix:** Add `pytest` + `pytest-asyncio`, mock Supabase via `respx` or `httpx_mock`, write tests for the 5 highest-risk endpoints first.
- **🤖 Prompt to Fix:**
  > Set up pytest in `backend/`. Add `pytest`, `pytest-asyncio`, `respx` to `requirements-dev.txt`. Create `backend/tests/conftest.py` with a `client` fixture using FastAPI's `TestClient` and a `mock_supabase` fixture that intercepts httpx calls to Supabase. Write tests in this priority order: (1) `test_booking_final_guard.py` — concurrent bookings on the same slot; only one wins. (2) `test_payment_verify.py` — valid HMAC succeeds, tampered HMAC returns 400, replay of already-paid order is idempotent. (3) `test_slot_generation.py` — past slots filtered with 5-min grace, fully-booked slots excluded, timezone correctness. (4) `test_auth_guard.py` — endpoints return 401 with no/expired/invalid token. (5) `test_owner_isolation.py` — owner A cannot read/modify owner B's bookings. Add a GitHub Actions workflow `.github/workflows/backend-ci.yml` that runs pytest on every PR.

### A5 — No crash reporting / error tracking
- **Where:** `backend/server.py` — uses `print()` and `logger.exception()` but no Sentry/Rollbar.
- **What:** Production exceptions vanish into Render's stdout. No alerting.
- **Why it's a problem:** Users hit 500s and you find out from a 1-star review.
- **Fix:** Wire up Sentry (free tier is enough at this stage).
- **🤖 Prompt to Fix:**
  > Add `sentry-sdk[fastapi]` to `backend/requirements.txt`. In `backend/server.py`, initialize Sentry at the top of the file: `sentry_sdk.init(dsn=settings.SENTRY_DSN, traces_sample_rate=0.1, environment=settings.ENVIRONMENT, send_default_pii=False)`. Add `SENTRY_DSN` and `ENVIRONMENT` (`"production"` / `"staging"` / `"dev"`) to `Settings` in `config.py`. Wrap every `httpx` call to Supabase in `try/except httpx.HTTPError as e: sentry_sdk.capture_exception(e); raise HTTPException(...)`. In booking and payment endpoints, set Sentry context tags: `sentry_sdk.set_tag("user_id", user.id); sentry_sdk.set_tag("salon_id", salon_id)`. Verify with a deliberate `raise Exception("test sentry")` route, confirm the event lands in Sentry, then remove.

## 🟠 HIGH

### A6 — No retry / no exception handling around Supabase httpx calls
- **Where:** `server.py:184-194`, `:210-220`, `:237-238`, `:253-254`.
- **What:** Outbound `httpx` calls have no try/except. A single Supabase blip = 500 to user.
- **Fix:** Wrap calls in a helper with retries (3 attempts, exponential backoff on 5xx and timeouts) and a circuit breaker.
- **🤖 Prompt to Fix:**
  > In `backend/server.py`, create an async helper `await call_supabase(method, path, *, headers, json=None, params=None, timeout=None)` that wraps `httpx.AsyncClient` with: (1) a retry decorator using `tenacity` — retry up to 3 times on `httpx.TimeoutException`, `httpx.NetworkError`, and 5xx responses, with exponential backoff starting at 250ms; (2) a per-endpoint timeout (default 15s, configurable per call); (3) structured logging on every retry with the path and attempt number; (4) capture to Sentry on final failure. Replace all direct `httpx.AsyncClient()` usages in `server.py` with this helper. Add `tenacity` to `requirements.txt`.

### A7 — No rate limiting
- **Where:** Entire `server.py`.
- **What:** No throttling on auth, booking, or review endpoints.
- **Fix:** Add `slowapi` with per-IP and per-user-id buckets.
- **🤖 Prompt to Fix:**
  > Add `slowapi` to `backend/requirements.txt`. Configure a global limiter in `server.py`: 100 req/min per IP default. Apply tighter per-endpoint limits via `@limiter.limit(...)`: `/api/auth/signup` 5/min, `/api/auth/login` 10/min, `/api/bookings` POST 20/min, `/api/payments/verify` 10/min, `/api/reviews` POST 5/min. Use `key_func` to fall back to JWT-derived `user_id` when present, IP otherwise. Return a clean 429 error envelope. Add a Sentry tag for rate-limit hits to monitor abuse.

### A8 — JWT expiry not validated locally
- **Where:** `server.py:254-257` — `get_current_user` always calls Supabase `/auth/v1/user`.
- **What:** Every request hits Supabase's auth endpoint just to validate the token.
- **Fix:** Decode JWT locally with the Supabase JWT secret and check `exp`. Only call Supabase's `/auth/v1/user` if you need fresh user metadata.
- **🤖 Prompt to Fix:**
  > In `backend/server.py`, refactor `get_current_user` to first decode the JWT locally using `jose.jwt.decode(token, settings.SUPABASE_JWT_SECRET, algorithms=["HS256"], audience="authenticated")`. Validate `exp`, `aud`, `sub` claims locally. Only fall back to calling Supabase `/auth/v1/user` when (a) you need fresh `user_metadata` (e.g., role), or (b) local decode fails for a reason other than expiry. Cache the result in a request-scoped variable so repeated `Depends(get_current_user)` calls in the same request don't re-decode. Add `SUPABASE_JWT_SECRET` to `Settings`. Write a pytest case asserting expired tokens are rejected with 401 without an outbound network call.

### A9 — Booking race window when `max_bookings_per_slot > 1`
- **Where:** `server.py:1015-1031` (Final Guard) and migration `database/08_add_max_bookings_per_slot.sql`.
- **What:** The Final Guard re-checks `count(bookings) < max` before insert. Two concurrent requests can both pass the check and both insert.
- **Fix:** Use a Postgres advisory lock or `SELECT ... FOR UPDATE` inside a transaction; alternatively, enforce via a Postgres trigger that atomically counts + inserts.
- **🤖 Prompt to Fix:**
  > In Supabase SQL, add a new migration `database/10_atomic_slot_booking.sql` that creates a Postgres function `book_slot_atomic(p_user_id uuid, p_salon_id uuid, p_service_id uuid, p_booking_date date, p_time_slot time, p_payload jsonb) RETURNS uuid` (booking id). Inside the function, use `pg_advisory_xact_lock(hashtext(p_salon_id::text || p_booking_date::text || p_time_slot::text))` to serialize bookings for the same slot. Then count current non-cancelled bookings for the slot, compare to the salon's `max_bookings_per_slot`, and either INSERT and return the new id or `RAISE EXCEPTION 'SLOT_FULL'`. In `server.py`, replace the multi-step booking flow at `:1015-1056` with a single `rpc('book_slot_atomic', ...)` call. Catch the `SLOT_FULL` exception and return 409. Write a stress test that fires 50 concurrent requests for the same slot and asserts exactly `max_bookings_per_slot` succeed.

### A10 — Secrets in plaintext .env file
- **Where:** `backend/.env` (also `mobile/.env`, `frontend/.env`).
- **What:** Real Supabase service-role keys and Razorpay secrets sit in plaintext `.env` files.
- **Fix:** Confirm `.env` is in `.gitignore` (it is). For production, use Render's secret manager. Rotate any keys that were ever committed.
- **🤖 Prompt to Fix:**
  > Run `git log --all --full-history -- backend/.env mobile/.env frontend/.env` and report whether any `.env` was ever committed. If yes: (1) immediately rotate the Supabase service-role key, anon key, JWT secret, Razorpay key+secret, and Google Maps key in their respective dashboards; (2) update Render env vars and EAS secrets with new values; (3) document rotation date in CLAUDE.md. If no: confirm `.env` is in `.gitignore` for all three apps and add `.env.example` files (empty-value templates) so new contributors know what's required.

### A11 — No observability: no request IDs, no structured logs, no metrics
- **Where:** `server.py:25-26` — basic stdlib logging only.
- **Fix:** Add request-ID middleware, switch to JSON logs, expose `/metrics` for Prometheus.
- **🤖 Prompt to Fix:**
  > In `backend/server.py`, add a middleware that generates a `request_id = str(uuid.uuid4())` on every request, attaches it to a `contextvars.ContextVar`, and includes it in the response header `X-Request-ID` (or echoes the inbound one if present). Replace `logging.basicConfig` with `python-json-logger` JSON formatter. Add a logging filter that injects `request_id` and (when available) `user_id`, `path`, `method` into every log line. Replace every `print(...)` in `server.py` with `logger.info/warning/error(...)`. Add `prometheus-fastapi-instrumentator` and expose `/metrics`. Set Sentry to attach `request_id` as a tag.

### A12 — Backend is one 54 KB file
- **Where:** `backend/server.py`.
- **What:** Routing, auth, business logic, Supabase access — all in one module.
- **Fix:** Extract into modules. Don't rewrite all at once; carve out one slice per PR.
- **🤖 Prompt to Fix:**
  > Refactor `backend/server.py` incrementally. PR1: extract `auth/` package (`auth/dependencies.py` for `get_current_user`, `auth/jwt.py` for token decode). PR2: extract `db/supabase.py` (the `call_supabase` helper, `supabase_user_request`, `supabase_admin_request`). PR3: extract `services/booking.py` (slot generation, Final Guard, atomic-booking RPC wrapper). PR4: extract `services/payments.py` (Razorpay HMAC + verification). PR5: extract `routers/` per domain (`routers/auth.py`, `routers/salons.py`, `routers/bookings.py`, `routers/payments.py`, `routers/owner.py`) and mount them in `server.py` via `app.include_router`. Each PR must keep tests green. Do NOT change route paths or response shapes — clients depend on them.

## 🟡 MEDIUM

### A13 — N+1 queries in `GET /api/owner/bookings`
- **Where:** `server.py:1099-1112`.
- **Fix:** Fetch in one query with `?salon_id=in.(<csv>)`.
- **🤖 Prompt:** *Refactor `GET /api/owner/bookings` in `server.py` to fetch all owner's salon ids in one query, then bookings in a second query using Supabase REST `?salon_id=in.(uuid1,uuid2,...)`. Total 2 round trips regardless of salon count. Add a pytest assertion measuring outbound httpx call count is `<= 2`.*

### A14 — `GET /api/salons` has no pagination
- **Where:** `server.py:496-568`.
- **🤖 Prompt:** *Add `limit: int = Query(50, le=100)` and `offset: int = Query(0, ge=0)` query params to `GET /api/salons`. Forward to Supabase REST. Return envelope `{ "data": [...], "pagination": { "limit": 50, "offset": 0, "total": <count from Supabase Prefer: count=exact header> } }`. Update mobile and web clients to consume the envelope. Add infinite scroll on `DiscoverScreen` using React Query's `useInfiniteQuery`.*

### A15 — Haversine in Python won't scale past ~1k salons
- **Where:** `server.py:539-555`.
- **🤖 Prompt:** *Migrate salon discovery to PostGIS. Add migration `database/11_postgis_salons.sql`: enable `postgis` extension, add `location geography(Point, 4326)` column to `salons`, backfill from existing `lat`/`lng`, create a GiST index, add a trigger to keep `location` in sync on insert/update. In `server.py`, replace the in-Python Haversine with a Supabase RPC call to a SQL function `nearby_salons(p_lat float, p_lng float, p_radius_km int)` that uses `ST_DWithin` and returns rows ordered by `ST_Distance`. Verify mobile `DiscoverScreen` distance-sort behavior is unchanged.*

### A16 — Inconsistent error envelope
- **🤖 Prompt:** *Add a global `Exception` handler in `server.py` that produces `{ "error": { "code": "<MACHINE_CODE>", "message": "<human msg>", "request_id": "<uuid>" } }` for every error response. Define an `ErrorCode` enum (`SLOT_FULL`, `INVALID_PAYMENT_SIGNATURE`, `UNAUTHORIZED`, `NOT_FOUND`, `RATE_LIMITED`, `INTERNAL_ERROR`). Replace all `HTTPException(status_code=..., detail=...)` raises with calls to a new `raise_error(code, message, status)` helper. Update mobile `errorHandler.ts` to read `error.code` for branching messaging.*

### A17 — Trivial health check
- **🤖 Prompt:** *Replace the existing `/health` endpoint in `server.py` with a deeper check: ping Supabase auth `/auth/v1/health` with a 2s timeout, ping the database (lightweight `SELECT 1` via Supabase RPC). Return 200 only when all dependencies pass; 503 otherwise with which dep failed. Add a `/livez` (always 200 if process is up) for liveness probes and `/readyz` (the deep check) for readiness probes. Document this for Render.*

### A18 — No API versioning
- **🤖 Prompt:** *Mount all current routers under `/api/v1/...`. Keep `/api/...` as an alias for one minor version with a deprecation warning header (`X-API-Deprecated: true; sunset=2026-09-01`). Update mobile `api.ts` and frontend `api.js` baseURL to include `/v1`. Document API versioning policy in CLAUDE.md (semver, breaking-change rules).*

### A19 — No idempotency keys on POST /bookings or /payments
- **🤖 Prompt:** *Accept an optional `Idempotency-Key` header on `POST /api/bookings` and `POST /api/payments/verify`. On receipt, check a new `idempotency_keys` table (key, user_id, response_body, created_at, expires_at). If key exists for this user → return cached response. Otherwise process the request, then store the response with a 24h TTL. Add a Postgres cron to clean expired rows. Update mobile clients to generate and send a UUID Idempotency-Key on every booking/payment retry.*

### A20 — Missing composite indexes
- **🤖 Prompt:** *Add a migration `database/12_perf_indexes.sql` creating: `idx_bookings_salon_date_status ON bookings(salon_id, booking_date, status)`, `idx_bookings_user_status ON bookings(user_id, status)`, `idx_services_salon ON services(salon_id) WHERE deleted_at IS NULL`. Run `EXPLAIN ANALYZE` on the slot-generation and owner-bookings queries before/after and capture the speedup in the migration's comment.*

### A21 — CORS allows all headers
- **🤖 Prompt:** *In `server.py:34-40`, replace `allow_headers=["*"]` and `allow_methods=["*"]` with explicit lists: headers `["Authorization", "Content-Type", "X-Request-ID", "Idempotency-Key"]`, methods `["GET", "POST", "PATCH", "DELETE", "OPTIONS"]`. Verify mobile and web requests still succeed against staging.*

---

# Part B — MOBILE APP (React Native / Expo)

## 🔴 CRITICAL

### B1 — Auth tokens stored in AsyncStorage (plaintext)
- **Where:** `mobile/src/store/authStore.ts:150-155`.
- **What:** Zustand `persist` middleware uses `AsyncStorage` to persist user JWT and profile.
- **Why it's a problem:** AsyncStorage is **unencrypted** on disk. A jailbroken iPhone or rooted Android, or even ADB on a debug build, exposes every user's token. Anyone with physical access can impersonate the user against your backend.
- **Fix:** Move token to `expo-secure-store` (Keychain on iOS, EncryptedSharedPreferences on Android). Keep non-sensitive UI prefs in AsyncStorage.
- **🤖 Prompt to Fix:**
  > Add `expo-secure-store` to `mobile/package.json`. In `mobile/src/store/authStore.ts`, split persistence: use `expo-secure-store` for `token` only, AsyncStorage (or no persistence) for `user` and `isAuthenticated`. Implement a custom Zustand `StateStorage` adapter that routes `token` reads/writes to SecureStore. Add a one-time migration on app start that, if a token is found in AsyncStorage, copies it to SecureStore and deletes the AsyncStorage entry. On logout, clear SecureStore explicitly (`await SecureStore.deleteItemAsync('token')`). Update `api.ts` to read the token via the store, not directly from AsyncStorage. Test on a fresh install AND an upgrade from the AsyncStorage version.

### B2 — Real API keys committed in `eas.json`
- **Where:** `mobile/eas.json:20-32`.
- **What:** `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`, Supabase URL + anon key are hardcoded in `eas.json` (and that file is in git).
- **Why it's a problem:** Even if these are "public" keys, the Google Maps key can be abused (running up your bill) if not domain-restricted. Treat the repo as if it were public.
- **Fix:** Move keys to **EAS secrets**. Add Google Cloud key restrictions (bundle ID + SHA-1).
- **🤖 Prompt to Fix:**
  > In `mobile/eas.json`, remove the inline `env` blocks containing real keys. Run `eas secret:create --scope project --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY --value <new key>` for each key (Google Maps, Supabase URL, Supabase anon, EXPO_PUBLIC_API_URL). In `eas.json`, reference them via `"env": { "EXPO_PUBLIC_GOOGLE_MAPS_API_KEY": "$EXPO_PUBLIC_GOOGLE_MAPS_API_KEY" }` for `preview` and `production` profiles. Then in Google Cloud Console, restrict the Maps API key to your iOS bundle ID and Android package + SHA-1 fingerprint. Also restrict by API (Maps SDK only). Rotate the old key before retiring it.

### B3 — No error boundaries on individual screens
- **Where:** `App.tsx:130` — only one `<ErrorBoundary>` at the root.
- **What:** A render error in `BookingScreen` or `PaymentScreen` brings down the entire app to a fallback UI.
- **Fix:** Wrap each top-level screen (or each navigation stack) in its own `<ErrorBoundary>` so the rest of the app stays usable.
- **🤖 Prompt to Fix:**
  > In `mobile/src/components/ErrorBoundary.tsx`, ensure the boundary accepts `fallback` (custom UI) and `onReset` (retry callback) props. In `mobile/src/navigation/`, wrap each stack screen via a higher-order helper `withErrorBoundary(Screen)` that injects a screen-scoped boundary with a "Try again" button calling `navigation.replace(routeName)`. Apply to `BookingScreen`, `PaymentScreen`, `SalonDetailScreen`, `OwnerDashboardScreen` first. The boundary's `componentDidCatch` should call `Sentry.captureException(error, { extra: errorInfo })`. Verify by intentionally throwing in `BookingScreen` render — only the booking screen should show the fallback.

### B4 — No automated tests
- **Where:** `mobile/package.json` — no jest, no test script.
- **🤖 Prompt to Fix:**
  > Set up Jest with `jest-expo` preset in `mobile/`. Add devDependencies: `jest-expo`, `@testing-library/react-native`, `@testing-library/jest-native`, `msw` (for API mocking). Add `"test": "jest"` to `package.json` scripts. Configure jest in `jest.config.js` with the expo preset and `transformIgnorePatterns` for native modules. Write tests in this priority: (1) `authStore.test.ts` — login → logout clears token from SecureStore. (2) `api.test.ts` — 401 triggers logout exactly once even on parallel failures. (3) `BookingScreen.test.tsx` — slot select → confirm → success navigates to confirmation; 409 conflict shows "slot taken" toast. (4) `PaymentScreen.test.tsx` — Razorpay success message triggers booking confirmation. (5) `errorHandler.test.ts` — every axios error shape maps to a sane user-facing message. Add GitHub Actions `.github/workflows/mobile-ci.yml` running `npm test -- --ci --coverage` on PRs.

### B5 — No crash reporting (Sentry / Crashlytics)
- **🤖 Prompt to Fix:**
  > Add `@sentry/react-native` to `mobile/package.json`. Run `npx @sentry/wizard@latest -i reactNative -p ios android`. In `App.tsx`, initialize Sentry before any other code: `Sentry.init({ dsn, tracesSampleRate: 0.1, environment: __DEV__ ? "dev" : "production", integrations: [new Sentry.ReactNativeTracing()] })`. Wrap the root component with `Sentry.wrap(App)`. In `ErrorBoundary.tsx`, call `Sentry.captureException` in `componentDidCatch`. In `api.ts` interceptors, attach the failing request's path/method/status as Sentry context. In `eas.json`, configure source-map upload via `expo-application-services` post-build hooks so production stack traces are symbolicated. Verify by triggering a test crash in a debug build and seeing it in Sentry.

## 🟠 HIGH

### B6 — `initializeAuth()` race condition on startup
- **Where:** `App.tsx:81-82`.
- **What:** `initializeAuth()` is fired without `await`. The first React Query that runs may go out without an Authorization header.
- **🤖 Prompt to Fix:**
  > In `mobile/src/store/authStore.ts`, add `isHydrating: boolean` and `hydrationComplete()` helpers. Make `initializeAuth()` set `isHydrating: true` on entry and `false` on exit. In `App.tsx`, do not render `<NavigationContainer>` while `isHydrating || !fontsLoaded`. Instead, show the splash screen. After hydration, set Axios default `Authorization` header from the restored token before any screen mounts. Verify by adding a console.log on the first `useQuery` and confirming the header is present.

### B7 — No 401 → token-refresh flow
- **Where:** `mobile/src/lib/api.ts:76-86`.
- **What:** Any 401 instantly logs the user out. There's no attempt to refresh.
- **🤖 Prompt to Fix:**
  > In `mobile/src/lib/api.ts`, modify the response interceptor: on 401, attempt a single refresh by calling Supabase JS client `supabase.auth.refreshSession()`. If it returns a new session, update the Zustand store, retry the original request once with the new token, and resolve the promise. Use a module-level `Promise<boolean> | null` lock so concurrent 401s share a single refresh attempt (no thundering herd). If refresh fails, then call `logout()` and reject. Write a Jest test simulating two parallel 401s and asserting refresh is called only once.

### B8 — Booking race UX: "slot taken just now" experience
- **Where:** `mobile/src/screens/customer/BookingScreen.tsx:67-96`.
- **What:** User sees an available slot, taps confirm, but the backend Final Guard returns 409 because someone else just booked.
- **🤖 Prompt to Fix:**
  > In `BookingScreen.tsx`, when the user picks a slot, immediately call a new backend endpoint `POST /api/slots/:id/reserve` that creates a 90-second soft-hold (Postgres row in `slot_holds` table with `expires_at`). The Final Guard now also rejects if any active hold exists for another user. Display a countdown timer ("Hold expires in 1:24") on the booking screen. On confirm, the hold is converted to a booking atomically. On back-navigation or timeout, the hold is released. This eliminates 99% of the race UX. Add the migration, the endpoint, and a unit test covering hold expiry, double-hold rejection, and conversion-to-booking.

### B9 — Token persisted alongside user object in AsyncStorage
- **Where:** `mobile/src/store/authStore.ts:151-155`.
- **🤖 Prompt to Fix:** *(handled in B1 — same fix.)*

### B10 — No offline queue / no offline disable on Book button
- **Where:** `mobile/src/hooks/useNetworkStatus.ts:55-72`, `BookingScreen.tsx`.
- **🤖 Prompt to Fix:**
  > In `BookingScreen.tsx` and `PaymentScreen.tsx`, subscribe to `useNetworkStatus()`; when offline, disable the "Confirm Booking" / "Pay Now" buttons and show an inline banner "You're offline — connect to continue." For read-only screens (`DiscoverScreen`, `MyBookingsScreen`), enable React Query persistent cache via `@tanstack/query-async-storage-persister` so cached data still renders offline. Add a top-of-app `OfflineBanner` (already implemented but commented out in `App.tsx:36`) — uncomment, ensure it animates in/out without layout shift.

### B11 — React Query cache not cleared on logout from non-Settings paths
- **Where:** Logout is also fired from 401 interceptor in `api.ts`.
- **🤖 Prompt to Fix:**
  > In `mobile/src/store/authStore.ts`, accept an optional `queryClient` reference (set once from `App.tsx` after creation). In the `logout()` action: (1) `await SecureStore.deleteItemAsync('token')`; (2) `await supabase.auth.signOut()`; (3) `queryClient?.clear()`; (4) clear all other Zustand stores (`bookingStore`, `salonStore`); (5) reset the navigation stack to `Auth`. Replace ad-hoc logout cleanup in `SettingsScreen.tsx:376` with this single source of truth.

### B12 — Payment-session backgrounding leaves stale WebView
- **Where:** `mobile/src/screens/customer/PaymentScreen.tsx`.
- **🤖 Prompt to Fix:**
  > In `PaymentScreen.tsx`, subscribe to `AppState` change events. If the app goes from `background` → `active` while the WebView Razorpay flow is mid-payment (state flag `isPaying`), call `GET /api/payments/status?order_id=...` to learn the actual server-side state. If still pending, prompt the user "Resume payment?" and re-mount the WebView. If already paid, navigate to confirmation. If failed/cancelled, show retry CTA. Persist `currentOrderId` in Zustand so it survives app kill, and on cold start check pending payments once.

### B13 — Inline `error: any` everywhere defeats TS strict
- **Where:** `authStore.ts:55`, `api.ts:73`, multiple screens.
- **🤖 Prompt to Fix:**
  > Define a discriminated union `AppError` in `mobile/src/types/error.ts` with kinds `network`, `unauthorized`, `validation`, `conflict`, `server`, `unknown`. Update `errorHandler.ts` to always return `AppError` (never `any`). Replace every `catch (error: any)` in the codebase with `catch (error) { const appError = handleApiError(error); ... }` and consume the typed `AppError`. Run `tsc --noEmit` and ensure zero errors. Add `"noImplicitAny": true` is enforced in `tsconfig.json`.

## 🟡 MEDIUM

### B14 — Unstable list keys in `ImageCarousel`
- **🤖 Prompt:** *In `mobile/src/components/ImageCarousel.tsx:45`, change `keyExtractor={(_, index) => index.toString()}` to `keyExtractor={(item, index) => item.uri ?? item.id ?? index.toString()}`. If `item` is a string URI, use the string directly. This prevents flicker when images are reordered.*

### B15 — Route params not validated
- **Where:** `BookingScreen.tsx:34`.
- **🤖 Prompt:** *Add `zod` to mobile dependencies. Create `mobile/src/navigation/params.ts` with Zod schemas per route (e.g., `BookingParams = z.object({ salonId: z.string().uuid(), serviceId: z.string().uuid() })`). At the top of each screen, parse `route.params` with the schema; on failure, show an `ErrorState` with a "Go back" button and call `Sentry.captureMessage("Invalid route params", { extra: { route: route.name, params: route.params } })`. Apply to `BookingScreen`, `PaymentScreen`, `SalonDetailScreen`, `ServiceDetailScreen`, `WriteReviewScreen`.*

### B16 — Map renders unbounded markers (no clustering)
- **Where:** `DiscoverScreen.tsx:131-133`.
- **🤖 Prompt:** *Add `react-native-map-clustering` to mobile dependencies. Replace `<MapView>` with `<ClusteredMapView>` from this lib in `DiscoverScreen.tsx`. Configure `radius={40}`, `maxZoom={16}`. Limit visible salons to nearest 100 by default; render the rest as cluster bubbles. Verify on a large dataset (mock 1000 salons) that scroll/zoom stays at 60fps on a low-end Android.*

### B17 — Charts not lazy-loaded; Owner Dashboard heavy
- **🤖 Prompt:** *In `OwnerDashboardScreen.tsx`, lazy-load `react-native-gifted-charts` via `const Charts = React.lazy(() => import('./charts/AnalyticsCharts'))` wrapped in `<Suspense fallback={<DashboardSkeleton />}>`. Move all chart components into a single new file `OwnerDashboardScreen/charts/AnalyticsCharts.tsx`. Measure bundle size before/after with `npx expo-doctor` and `expo export --dump-sourcemap` size analysis.*

### B18 — `displaySlots` and similar derived arrays not memoized
- **Where:** `BookingScreen.tsx:84`.
- **🤖 Prompt:** *Wrap every derived array in `BookingScreen.tsx` with `useMemo(() => ..., [deps])`. Audit `OwnerDashboardScreen.tsx` for inline `{ backgroundColor: color + '25' }` style objects and lift them into `useMemo` keyed on the source values. Run React DevTools Profiler before/after on a slot-heavy date and confirm fewer re-renders.*

### B19 — Image components have no explicit width/height
- **🤖 Prompt:** *Audit all `<Image>` and `<ImageBackground>` usages in `mobile/src/screens/` and `mobile/src/components/`. Add explicit `style={{ width, height }}` matching the design grid. Use `resizeMode="cover"`. Replace `<Image>` with `expo-image`'s `<Image>` for built-in caching, blurhash placeholders, and memory-efficient decoding. Add `expo-image` to `package.json`.*

### B20 — Permission requests fire without rationale
- **Where:** `DiscoverScreen.tsx:61-75`, `notifications.ts:30-41`.
- **🤖 Prompt:** *Create a reusable `<PermissionPrimer>` modal component that takes `title`, `message`, `icon`, `onAllow`, `onDeny`. Show it BEFORE the native permission dialog. For location: "Find salons near you — TrimiT uses your location to show distance and travel time." For notifications: "Get appointment reminders — never miss your booked slot." Wire into `DiscoverScreen.tsx` and `notifications.ts`. On denial, show an `ErrorState` with a "Open Settings" button calling `Linking.openSettings()`.*

### B21 — A11y labels missing across the app
- **🤖 Prompt:** *Add `accessibilityLabel`, `accessibilityHint`, and `accessibilityRole` to every interactive element in `mobile/src/components/` (`SalonCard`, `ServiceCard`, `BookingCard`, all buttons, all icon-only Pressables). For inputs, ensure `accessibilityLabel` matches the visual label. Add a `testID` to anything used in future Detox tests. Verify with iOS VoiceOver and Android TalkBack — every important action should be announced.*

### B22 — No pull-to-refresh on `BookingScreen` and others
- **🤖 Prompt:** *Replace plain `<ScrollView>` in `BookingScreen.tsx` with one that has `<RefreshControl refreshing={isFetching} onRefresh={refetch} />`. Same for `MyBookingsScreen`, `OwnerDashboardScreen`, `ManageBookingsScreen`. Ensure `refetch` invalidates the right React Query keys.*

### B23 — Empty states without action CTAs
- **🤖 Prompt:** *Update `mobile/src/components/EmptyState.tsx` to require an `actionLabel` and `onAction` prop. Audit every usage and add a meaningful CTA: empty bookings → "Find a salon" → navigate to Discover; empty salons (owner) → "Create your salon" → ManageSalon; empty services → "Add a service" → ManageServices.*

### B24 — Skeleton 500ms minimum hurts perceived perf on fast networks
- **🤖 Prompt:** *In `mobile/src/hooks/useMinLoadingTime.ts`, reduce minimum to 200ms and only enforce when initial render is in progress (not on refetch). Verify visually that fast loads no longer feel "fake-slow" while preventing the < 100ms flash that motivated the original delay.*

### B25 — Booking store stale slots after navigate-away
- **Where:** `mobile/src/store/bookingStore.ts:103`.
- **🤖 Prompt:** *In `bookingStore.ts`, add a `reset()` action that clears `slots`, `selectedSlot`, `selectedDate`. Call it from `BookingScreen.tsx` in a `useFocusEffect` cleanup so navigating away wipes state. Test by going Booking → back → Booking and asserting slots are freshly fetched.*

### B26 — Dev base URL detection breaks iOS simulator silently
- **Where:** `mobile/src/lib/api.ts:28-48`.
- **🤖 Prompt:** *In `api.ts`, when `__DEV__` is true and `EXPO_PUBLIC_API_URL` is unset and `Constants.expoConfig?.hostUri` looks like localhost, log a clear warning: `"⚠️ API URL falling back to <X>. iOS simulator users should set EXPO_PUBLIC_API_URL=http://YOUR_LAN_IP:8001 in mobile/.env"`. Add this guidance to `mobile/SETUP_GUIDE.md`.*

### B27 — No analytics SDK
- **🤖 Prompt:** *Add `posthog-react-native` to mobile. Initialize in `App.tsx` after Sentry. Track: `app_open`, `signup_completed{role}`, `salon_searched{query, results_count}`, `salon_viewed{salon_id}`, `booking_started{salon_id, service_id}`, `booking_confirmed{booking_id, payment_method, amount}`, `payment_failed{reason}`, `review_submitted{rating}`. Wrap in a thin `analytics.ts` helper so the SDK can be swapped. Respect a user "opt out" flag from Settings.*

---

# Part C — DATABASE / SCHEMA

## 🟠 HIGH

### C1 — Migrations are manually applied (no migration runner)
- **Where:** `database/01_*.sql` … `09_*.sql`.
- **🤖 Prompt:**
  > Adopt Supabase CLI for migration management. Run `supabase init` in the repo root, move existing files into `supabase/migrations/` with timestamped filenames (`20260101000001_schema.sql`, etc.). Create staging and production projects in Supabase. Document `supabase db push` as the only way to deploy schema changes. Add a GitHub Action that runs `supabase db diff --linked` on PRs and posts the diff as a comment. Forbid manual SQL edits in the dashboard for production.

### C2 — No backups/restore drill
- **🤖 Prompt:** *Verify Supabase is configured for daily PITR backups (Pro tier required). Document the restore procedure in `RUNBOOK.md`: how to restore to a point in time, who has the credentials, expected RTO/RPO. Schedule a quarterly restore drill into a staging project to prove backups actually work.*

## 🟡 MEDIUM

### C3 — RLS policies not under version control as a separate file
- **🤖 Prompt:** *Extract all RLS policies from `database/01_schema.sql` into a dedicated `database/policies.sql` (or use Supabase migrations). Add comments explaining each policy's intent. Add a test using Supabase RPC + a non-admin JWT proving customers can't read other customers' bookings.*

---

# Part D — DevOps / Release

## 🔴 CRITICAL

### D1 — No CI/CD pipeline
- **🤖 Prompt to Fix:**
  > Add `.github/workflows/`: (1) `backend-ci.yml` — on PRs touching `backend/**`: run `pip install -r requirements-dev.txt`, `ruff check`, `mypy`, `pytest`. (2) `mobile-ci.yml` — on PRs touching `mobile/**`: run `npm ci`, `tsc --noEmit`, `eslint`, `npm test -- --ci`. (3) `mobile-build.yml` — on tags `mobile-v*`: run `eas build --platform all --profile production --non-interactive`. (4) `backend-deploy.yml` — on push to `main` for `backend/**`: trigger Render deploy hook. Require all CI checks to pass before merge via branch protection rules.

### D2 — No staging environment
- **🤖 Prompt:** *Create a separate Supabase project named "trimit-staging". Duplicate Render service into `trimit-backend-staging` with its own env vars pointing to staging Supabase. Add a `staging` channel in `eas.json` that uses the staging API URL. Document promotion flow: PR merges to `main` → auto-deploys to staging → manual approval → promotes to production. Never test in production again.*

## 🟠 HIGH

### D3 — No source maps uploaded for mobile crash reports
- **🤖 Prompt:** *In `mobile/eas.json`, add `"ios": { "bitcode": false }` and `"hooks": { "postPublish": [{ "file": "sentry-expo/upload-sourcemaps", "config": { "organization": "<sentry org>", "project": "trimit-mobile", "authToken": "$SENTRY_AUTH_TOKEN" } }] }`. Add `SENTRY_AUTH_TOKEN` to EAS secrets. Verify a production build's stack trace in Sentry shows real file/line numbers, not `index.android.bundle:1234`.*

### D4 — No app-store launch readiness checklist
- **🤖 Prompt:** *Create `RELEASE_CHECKLIST.md` covering: (a) Apple — App Store Connect listing, screenshots in 6 sizes, privacy nutrition labels (location, payment, contact info), App Privacy report, encryption export compliance. (b) Google Play — Data Safety form, target API level 34+, content rating, signing key in Play Console. (c) Both — terms of service URL, privacy policy URL, support email, in-app account-deletion flow (REQUIRED by both stores in 2024+). Address each item before submission.*

---

# Part E — Recommended Implementation Order

A 4-week plan to take TrimiT from "feature-complete" to "production-ready":

### Week 1 — Stop the bleeding (CRITICALs)
1. A2 — Pin backend deps. (1h)
2. A3 — Validate env at startup. (2h)
3. A10 — Audit git history for committed secrets, rotate if found. (3h)
4. B1 — Move tokens to SecureStore. (4h)
5. B2 — Move keys to EAS secrets, restrict Google Maps API. (3h)
6. A1 — Audit and refactor service-role key usage. (1d)
7. A5 + B5 — Set up Sentry on backend and mobile. (1d)
8. A4 + B4 — Bootstrap pytest + jest with smoke tests for booking and auth. (2d)
9. B3 — Add per-screen error boundaries. (4h)

### Week 2 — Resilience (HIGHs)
10. A6 — httpx retries + circuit breaker.
11. A8 — Local JWT validation.
12. A11 — Request IDs + structured JSON logs.
13. B6 — Fix `initializeAuth` race.
14. B7 — 401 → refresh token flow.
15. B8 — Slot-hold reservation API + UI countdown.
16. B11 — Centralize logout cleanup.
17. B12 — AppState handling on PaymentScreen.
18. C1 — Adopt Supabase CLI migrations.
19. D1 — GitHub Actions CI.
20. D2 — Staging environment.

### Week 3 — Polish & Performance (top MEDIUMs)
21. A7 — Rate limiting.
22. A12 — Carve up `server.py` (one PR per slice).
23. A14, A15 — Pagination + PostGIS for salons.
24. A16 — Standard error envelope.
25. A19 — Idempotency keys.
26. B13 — Eliminate `any` from error paths.
27. B16, B17, B18, B19 — Performance: clustering, lazy charts, memo, expo-image.
28. B20, B21, B22, B23 — UX: permission primers, a11y, pull-to-refresh, empty states.
29. B27 — Analytics SDK.

### Week 4 — Hardening & Release
30. Load test booking endpoint at 50 concurrent requests for the same slot — confirm Final Guard + atomic-RPC hold.
31. Run mobile app on a low-end Android (Moto G Power class) — fix any frame-drops.
32. Restore drill on staging Supabase backup.
33. App-store submission per `RELEASE_CHECKLIST.md`.
34. Soft-launch to a small TestFlight / internal testing track. Monitor Sentry + analytics for 1 week.
35. Public release.

---

# Appendix — How to Use the 🤖 Prompts

For each finding above, the "Prompt to Fix" block is designed to be pasted into Claude Code (or Cursor) **in this repo** with no edits. Workflow:

1. Pick the highest-severity unfixed item.
2. Open Claude Code at the repo root.
3. Paste the prompt.
4. Let Claude propose a plan with `EnterPlanMode` if the change is non-trivial — review it.
5. Approve and let it implement.
6. Run the relevant tests (`pytest` for backend, `npm test` for mobile).
7. Commit on a feature branch named after the finding ID (e.g., `fix/A1-rls-bypass`).
8. Open PR, get review, merge.
9. Cross off in this report.

> **Tip:** When pasting a prompt, prefix with: *"Read AUDIT_REPORT.md finding [ID] for full context, then: <prompt>"*. This gives the model the surrounding rationale.

---

*End of report. Last updated 2026-05-01. Re-audit recommended after Week 4 completes.*
