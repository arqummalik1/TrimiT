# CLAUDE Progress — Unit Test Coverage (backend + mobile)

**Last updated:** 2026-06-15
**Goal:** Exhaustive unit tests — complete the backend suite and add a test for
**every** mobile screen, looping each section to green. App is LIVE in production.

---

## HARD CONSTRAINTS (user-confirmed — do not violate)

1. **Tests only — DO NOT touch app code.** Zero edits to screens/repos/services/routers.
   The app is live (Play Store + trimit.online + Render). If a test surfaces a genuine
   bug, **REPORT it to the user in a "Bugs found, NOT fixed" section — do not fix inline.**
2. **No assumptions.** Read the actual source of every endpoint/module before asserting.
   Loop: write → run → fix the **test** (never the app) → green, before moving on.
3. **Screen depth = "smoke-all + behavior-key":** every screen gets ≥ a smoke test
   (mounts + key element renders). Cheap/moderate screens also get behavior tests
   (interactions, mutations, empty/error). Heavy native screens (Payment,
   SubscriptionCheckout, Discover-map) are **smoke-only**.

Approved plan file: `/Users/arqummalik/.claude/plans/give-me-the-output-immutable-lovelace.md`

---

## TEST COMMANDS (verified working)

- **Backend (exclude live-server otp test):**
  `PYTHONPATH=backend backend/venv/bin/python -m pytest backend/tests --ignore=backend/tests/test_otp_flow.py -q -p no:warnings`
  - `-p no:warnings` silences pre-existing Pydantic v1 deprecation noise.
  - `test_otp_flow.py` hits live `localhost:8001` — always excluded (documented pre-existing).
- **Mobile:** `cd mobile && npx jest` (jest-expo). Single file: `npx jest <path>`.
  - NOTE: in this environment `npx jest` often gets auto-backgrounded; poll the task
    output file or `npx jest > /tmp/jest.log 2>&1; grep -E "Tests:|FAIL" /tmp/jest.log`.

---

## KEY PATTERNS (reuse these — proven green)

### Backend (pytest + respx)
- Fixtures in `backend/tests/conftest.py`: `client` (TestClient), `mock_supabase`
  (respx on `settings.SUPABASE_URL`), `auth_headers`.
- Auth bypass: `app.dependency_overrides[get_current_user] = lambda: {...}` then
  `app.dependency_overrides = {}` in a `finally`.
- Error envelope (core/exceptions.py):
  `{"success": false, "error": {"code","message","details"}, "request_id"}`.
  - For `HTTPException(detail="str")` → `error.message == "str"`.
  - For `HTTPException(detail={"code":..,"message":..})` → that dict is in `error.details`.
- **respx asserts every registered route is called** — only mock paths the code path hits.
- `require_active_subscription`: for **non-owner** role it returns the user untouched
  (no subscription mock needed) — use `profile.role == "customer"` to test owner-only
  endpoints' ownership/validation branches transparently.
- `idempotency_required(required=True)`: needs `Idempotency-Key` header; claim slot =
  `POST /rest/v1/idempotency_keys` → 201; failure path `DELETE` → 204. Don't mock the GET
  unless the claim's 201 path isn't taken (else respx "route not called").
- External services: monkeypatch the symbol **on the router module**, e.g.
  `monkeypatch.setattr(sub_router.billing, "verify_webhook_signature", lambda raw,sig: True)`.
  Async service fns: `monkeypatch.setattr(mod, "fn", lambda *a,**k: _async_return(val))`
  where `async def _async_return(v): return v`.
- Response-model endpoints (staff) require ALL model fields in mock rows
  (e.g. `created_at`, `updated_at`) or FastAPI raises ResponseValidationError.

### Mobile (jest-expo)
- `jest.setup.js` already mocks axios, async-storage, expo-secure-store, `./src/lib/api`.
- Repos import `../services/apiClient` (NOT `lib/api`) — mock that module per test.
- Seam tests: mock at module boundary (`apiClient`, services, stores, `supabase`, native).
- Screen render: wrap in real `ThemeProvider` + test `QueryClientProvider`
  (`retry:false`) + `SafeAreaProvider` with explicit `initialMetrics` (insets+frame).
  Mock `@react-navigation/native` (`useFocusEffect`, `useNavigation`). Stub heavy
  children (BookingCard/charts/MapView/WebView) with `<Text testID=...>` stand-ins.
- To force a deterministic error state (stop React Query retry/backoff outlasting
  `waitFor`): `jest.mock('../../src/lib/errorHandler', () => ({ handleApiError: () => ({kind:'unauthorized', message:'e'}) }))`.

---

## SURFACE INVENTORY (from exploration)

- **29 mobile screens**: 7 auth, 7 customer, 11 owner, 4 legal.
  - 9 screens still use direct `api.*` (MVVM violations) — DO NOT refactor, just test.
  - Heavy native: DiscoverScreen (maps/location), BookingScreen (realtime/payment),
    PaymentScreen + SubscriptionCheckoutScreen (Razorpay WebView), ManageSalon (maps/upload),
    OwnerDashboard (charts), MyBookings (realtime — already tested).
- **~40 testable seams**: 6 repos, 8 services, 7 stores, 8 hooks, ~16 pure libs.
- **14 backend routers**; 8 were fully untested at start (salons, subscriptions, staff,
  reviews, promotions, owner, geocode, uploads, admin).

---

## DONE — Session 1 (prior, committed-area)
33 mobile + 30 backend tests green. Files: `backend/tests/test_auth.py` (rewrote broken
stub), `test_bookings.py`, `test_payments.py`, fixed stale `test_priority.py` payment test;
`mobile/__tests__/bookingRepository.test.ts`, `promotionRepository.test.ts`,
`authStoreLifecycle.test.ts`, `screens/MyBookingsScreen.test.tsx`.

## DONE — Session 2 (current) Phase 1 backend, all green so far
- `backend/tests/test_reviews.py` — 4 pass
- `backend/tests/test_owner.py` — 5 pass
- `backend/tests/test_geocode.py` — 4 pass (respx-mocks maps.googleapis.com; monkeypatch GOOGLE_MAPS_API_KEY)
- `backend/tests/test_salons.py` — 11 pass
- `backend/tests/test_promotions.py` — 9 pass
- `backend/tests/test_staff.py` — 10 pass (needed created_at/updated_at in mock rows)
- `backend/tests/test_subscriptions.py` — 12 pass (monkeypatch subs/billing/notify on router module)
- `backend/tests/test_auth_extended.py` — **7 pass, 1 FAILING** ← IN PROGRESS

### ⚠️ CURRENT FAILURE to fix (test bug, not app bug)
`test_auth_extended.py::test_login_invalid_credentials_maps_to_401` → got **404**, expected 401.
- Cause: the `POST /auth/v1/token` respx mock URL doesn't match what `login_with_password`
  actually calls. Need to read `login_with_password` (search `backend/core/` + `backend/services/`)
  to find the EXACT Supabase path + query (likely `/auth/v1/token?grant_type=password`).
  Fix the mock URL (and any required query param) in the test. Do NOT change app code.

---

## TODO (remaining)

### Phase 1 (backend) — finish
- [ ] Fix the login test above → green.
- [ ] `backend/tests/test_bookings_extended.py` — get `/{id}` (403/404), `/salon/{id}`
      (403 ownership), reserve (409/503 fallback), create (400 missing Idempotency-Key,
      404 salon/service), reschedule guard. READ `backend/routers/bookings.py` lines
      ~587-1086 first (get_booking, reserve_slot, create_booking, reschedule) — only
      lines 33-218 have been read so far.
- [ ] Gate: full backend suite green.

### Phase 2 (mobile seams) — not started
- Repos: salonRepository, staffRepository, subscriptionRepository, authRepository
  (incl. `parseAuthFailure`/`translateMobileAuthError` branch tables).
- Services: consolidated `services.test.ts` (verb/path/data-unwrap vs mocked apiClient).
- Stores: bookingStore, toastStore, pendingSignupStore, notificationStore (mock expo-audio),
  notificationPrefsStore, ownerOnboardingStore.
- Pure libs: errorHandler, authUser, utils, idempotency, supabase(bookingDateMatchesFilter),
  authRateLimitMessages, userFacingError, salonImage, notificationDedupe, bookingDisplay,
  buildConfig, queryKeys.
- Pure hooks: useMinLoadingTime, useDebouncedValue, useAsyncState, useNetworkStatus (mock netinfo).

### Phase 3 (mobile screens) — not started
- One file per screen under `mobile/__tests__/screens/`.
- Behavior: Login, Signup, VerifyOtp, RoleSelect, Onboarding, ForgotPassword, ResetPassword,
  WriteReview, RescheduleBooking, SalonDetail(mock MapView), ServiceDetail, ManageBookings,
  PromoManagement, StaffManagement, ManageServices, Settings, OwnerDashboard(mock charts),
  ManageSalon(mock MapView/upload), Subscription, PaymentHistory, Legal/Terms/Privacy/Contact.
  (MyBookings already done.)
- Smoke-only: Payment, SubscriptionCheckout, Discover.

---

## PARALLELIZATION NOTE (user asked for parallel agents)
Remaining work is independent and fans out cleanly. Suggested split (each agent loops to
green, tests-only, no app edits, follows patterns above):
- Agent A: finish Phase 1 backend (login fix + test_bookings_extended).
- Agent B: Phase 2 mobile seams (repos/services/stores).
- Agent C: Phase 2 mobile pure libs + hooks.
- Agent D+: Phase 3 screens, split by area (auth / customer / owner / legal).
Each writes ONLY its own new test files (no shared-file edits) to avoid conflicts.
Final: run full suites, assemble counts + any "Bugs found, NOT fixed" report.

---

## TALLY (running)
- Backend new this session: 4+5+4+11+9+10+12+7 = **62 passing** (+1 failing login test to fix).
- Session-1 baseline still green: 30 backend / 33 mobile.
