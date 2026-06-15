# TrimiT — Complete Project Context

> **This file is the single source of truth for any AI tool, new developer, or onboarding engineer.**
> Read this before touching any code. Cross-reference `RULES.md` for engineering contracts and `zrd-audit.md` for the full issue tracker.

**Last updated:** June 14, 2026 — Pass 10
**App version:** 1.0.0 (Play Store) | `shared/app-version.json`

---

## 1. What Is TrimiT

TrimiT is a **salon marketplace for India** (₹ pricing, English UI). Customers discover nearby salons, view services, hold time slots, and book appointments. Salon owners receive real-time booking notifications, manage their calendar, accept/reject/complete bookings, and manage staff and promo codes.

**Live production surfaces:**
| Surface | URL / Store | Deploy target |
|---------|-------------|---------------|
| Mobile app (Android) | Google Play Store | Expo EAS + AAB upload |
| Web app | https://trimit.online | Vercel (auto-deploy from `main`) |
| Backend API | https://trimit-az5h.onrender.com | Render (auto-deploy from `main`) |
| Database / Auth / Storage | Supabase (hosted Postgres) | Manual SQL migrations |

**Real users are on this app right now. Every push to `main` is a production deploy.**

---

## 2. Repository Structure

```
TrimiT/
├── mobile/          Expo SDK 54 / React Native 0.81 / React 19 (Android + iOS)
├── frontend/        Vite 6 + React 19 + Tailwind (web: trimit.online)
├── backend/         FastAPI (Python 3.14) — deployed on Render
├── database/        Numbered SQL migration files (01–46, all applied to prod)
├── shared/          app-version.json, shared legal text
├── scripts/         sync-legal.cjs
├── docs/            REMAINING_ISSUES.md, PROGRESS.md, API_GUIDE.md, audit/, etc.
├── RULES.md         Engineering rules — read before every change
├── zrd-audit.md     Full audit with issue tracker and fix status
└── zed-context.md   This file — full project context
```

---

## 3. Tech Stack Reference

### Mobile (`mobile/`)
| Concern | Library / Version |
|---------|-------------------|
| Framework | Expo SDK 54, React Native 0.81, React 19 |
| Language | TypeScript (strict mode) |
| Navigation | React Navigation v7 (native-stack + bottom-tabs) |
| State management | Zustand v5 (with persist middleware) |
| Server state | TanStack React Query v5 |
| HTTP client | Axios v1 (`services/apiClient.ts`) |
| Realtime | Supabase JS v2 (postgres_changes WebSocket) |
| Auth persistence | expo-secure-store (+ AsyncStorage fallback for >2KB) |
| Push notifications | Expo Notifications |
| Maps | react-native-maps + expo-location |
| Payments | Razorpay React Native SDK |
| Error tracking | @sentry/react-native |
| Testing | Jest + jest-expo + @testing-library/react-native |

### Web (`frontend/`)
| Concern | Library / Version |
|---------|-------------------|
| Framework | Vite 6 + React 19 |
| Language | JavaScript (plain .js — no TypeScript yet, see P2-4 in audit) |
| Routing | React Router DOM v7 |
| State | Zustand v5 |
| Server state | TanStack React Query v5 |
| HTTP client | Axios (configured in `src/lib/api.js`) |
| Realtime | Supabase JS v2 |
| Styling | Tailwind CSS v3 |
| Animations | Framer Motion |
| Icons | @phosphor-icons/react |
| Build | Vite + prerender-routes-static.cjs for SSG |

### Backend (`backend/`)
| Concern | Library / Version |
|---------|-------------------|
| Framework | FastAPI (latest) |
| Runtime | Python 3.14 |
| HTTP (Supabase client) | httpx (hand-rolled client in `core/supabase.py`) |
| Rate limiting | slowapi |
| Auth | PyJWT + Supabase JWT validation |
| Payments | razorpay Python SDK |
| Email | Resend (via `services/email_dispatch.py`) |
| Error tracking | sentry-sdk + FastApiIntegration |
| Testing | pytest + respx + pytest-asyncio |

### Database (`Supabase`)
| Concern | Detail |
|---------|--------|
| Engine | Postgres (hosted Supabase) |
| Auth | Supabase Auth (email OTP flow) |
| Realtime | postgres_changes WebSocket (subscriptions on `bookings` table) |
| Storage | Supabase Storage (salon-images bucket) |
| RLS | Enabled on all tables — last line of defense |
| Migrations | 46 numbered `.sql` files — ALL applied to production |

---

## 4. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│  Mobile App (Expo / React Native)                                    │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────────┐  │
│  │ Screens    │  │Repositories│  │ Services   │  │ Stores       │  │
│  │ (.tsx)     │→ │ (network   │→ │ (apiClient │  │ authStore    │  │
│  │ NO api.*   │  │  gateway)  │  │  axios)    │  │ bookingStore │  │
│  └────────────┘  └────────────┘  └────────────┘  └──────────────┘  │
│                                         │                            │
│                          Supabase Realtime WebSocket                 │
└─────────────────────────────────────────┼───────────────────────────┘
                                          │ HTTPS / JWT
                                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│  FastAPI Backend (Render)                                            │
│  ┌──────────┐  ┌─────────────┐  ┌───────────────┐  ┌────────────┐  │
│  │ Routers  │  │ Services    │  │ Dependencies  │  │ Middleware │  │
│  │ auth     │  │ booking_push│  │ get_current_  │  │ RequestID  │  │
│  │ bookings │  │ sub_service │  │   user (JWT)  │  │ RateLimit  │  │
│  │ payments │  │ push_dispatch│ │ require_sub   │  │ CORS       │  │
│  │ salons   │  │ email_      │  └───────────────┘  └────────────┘  │
│  │ owner    │  │  dispatch   │                                       │
│  └──────────┘  └─────────────┘                                       │
│            │                                                          │
│  Idempotency Layer (core/idempotency.py)                             │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ Supabase REST API (httpx) — service-role + user JWT             │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Supabase (hosted Postgres)                                          │
│  Tables: users, salons, services, bookings, slot_holds,             │
│          reviews, promotions, staff, subscriptions,                  │
│          subscription_payments, subscription_events, webhook_logs,  │
│          idempotency_keys, broadcast_notifications,                  │
│          early_access_emails                                         │
│  RPCs: create_atomic_booking, reserve_slot_v1,                      │
│         reschedule_booking_atomic, get_nearby_salons_v1,             │
│         validate_promo_code                                          │
│  RLS: ENABLED on all tables                                          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. Mobile App Architecture (MVVM Strict)

```
Screen (.tsx)
  └─→ useQuery / useMutation (TanStack React Query)
         └─→ Repository (mobile/src/repositories/)   ← ONLY network gateway
               └─→ Service (mobile/src/services/)     ← HTTP calls via apiClient
                     └─→ apiClient (axios, base /api/v1)

Stores (Zustand):
  authStore      — user, token, auth lifecycle (persist → secureStore)
  bookingStore   — realtime slot state, justBookedSlots, hold timer
  toastStore     — global toast queue
  notificationStore — owner notification history
  notificationPrefsStore — sound/vibration preferences
  ownerOnboardingStore — first-salon flow state
  pendingSignupStore — name/phone stash during OTP flow
```

**MVVM rule (RULES.md §3):** View files (`.tsx`) must NEVER call `api.*` or `axios.*` directly. All network goes through repositories → services → apiClient.

### Repositories (complete list)
| Repository | Key methods |
|------------|-------------|
| `bookingRepository` | `getMyBookings`, `cancelBooking`, `getSlots`, `reserveSlot`, `createBooking`, `getAvailableStaff`, `getSalonBookings`, `updateBookingStatus` |
| `salonRepository` | `getSalon`, `getOwnerSalon`, `getNearbySalons`, `createSalon`, `updateSalon`, `getAnalytics`, `createService`, `updateService`, `deleteService` |
| `staffRepository` | CRUD for staff members and availability |
| `promotionRepository` | `getOwnerPromotions`, `createPromotion`, `updatePromotion`, `deletePromotion`, `validatePromoCode` |
| `subscriptionRepository` | `getCurrentSubscription`, `getStatus`, `getHistory`, `create`, `verify`, `cancel` |
| `authRepository` | `login`, `signup`, `resendConfirmation`, `updateProfile`, `deleteAccount` |

### Screens (complete list)
| Screen | Route / Tab | Auth required |
|--------|------------|---------------|
| `DiscoverScreen` | Customer > Discover tab | No |
| `SalonDetailScreen` | Customer > /salon/:id | No |
| `ServiceDetailScreen` | Customer > service detail | No |
| `BookingScreen` | Customer > booking | Yes (customer) |
| `MyBookingsScreen` | Customer > Bookings tab | Yes (customer) |
| `PaymentScreen` | Customer > payment | Yes (customer) |
| `RescheduleBookingScreen` | Customer | Yes (customer) |
| `WriteReviewScreen` | Customer | Yes (customer) |
| `ProfileScreen` | Customer > Profile tab | Yes (customer) |
| `OwnerDashboardScreen` | Owner > Dashboard tab | Yes (owner) |
| `ManageBookingsScreen` | Owner > Bookings tab | Yes (owner) |
| `ManageSalonScreen` | Owner > Settings | Yes (owner) |
| `ManageServicesScreen` | Owner > Services tab | Yes (owner) |
| `StaffManagementScreen` | Owner > Settings | Yes (owner) |
| `PromoManagementScreen` | Owner > Settings | Yes (owner) |
| `SubscriptionScreen` | Owner > Settings | Yes (owner) |
| `SubscriptionCheckoutScreen` | Owner > checkout | Yes (owner) |
| `PaymentHistoryScreen` | Owner > Settings | Yes (owner) |
| `SettingsScreen` | Owner > Settings tab | Yes (owner) |
| `LoginScreen` | Auth stack | No |
| `SignupScreen` | Auth stack | No |
| `VerifyOtpScreen` | Auth stack | No |
| `ForgotPasswordScreen` | Auth stack | No |

---

## 6. Auth Flow (Critical — Read Before Touching)

```
New user signup:
  1. User enters email + role on SignupScreen
  2. POST /auth/signup → Supabase sends OTP email (202 EMAIL_CONFIRMATION_REQUIRED)
  3. optimistic navigate to VerifyOtpScreen (isPending=true param)
  4. User enters 6-digit code
  5. POST /auth/verify-otp { email, token, type:"signup", role, name, phone }
  6. Backend: verify with Supabase, create public.users profile row (role set ONCE here)
  7. Backend returns { access_token, refresh_token, profile }
  8. authStore.verifyOtp: set user + token, sync Supabase Realtime session

Existing user login:
  1. Same OTP flow with type:"magiclink"
  2. Backend looks up existing profile row (ignores role hint)

Cold start (app already installed):
  1. Zustand rehydrates token from secureStore (async)
  2. authStore.initializeAuth: trust token immediately → isAuthenticated=true
  3. Background: call /auth/me to refresh profile
  4. ONLY confirmed 401 clears session. 5xx / network errors → keep logged in

Web cold start (trimit.online):
  1. Same pattern as mobile — trust token immediately, background refresh
  2. Only 401 clears auth (fixed in Pass 10)
```

**Role escalation is impossible:** The backend only reads `role` from `verify-otp` body when no `public.users` row exists for that user_id. Once a row exists, the hint is ignored.

---

## 7. Booking Flow (Most Complex Code — Read Before Touching)

```
1. Customer opens BookingScreen (salonId + serviceId from route params)
2. Fetch salon details → salonRepository.getSalon()
3. Fetch available slots → bookingRepository.getSlots({ salon_id, date, service_id, ... })
   └─ Backend: 5 Supabase calls → generate slot grid from opening/closing time
4. Customer taps a slot
   └─ bookingStore: slot grid subscribes to Supabase Realtime (salon_id filter)
   └─ Other users' bookings/holds invalidate slots in real time
5. Reserve hold → bookingRepository.reserveSlot()
   └─ Backend: POST /rest/v1/rpc/reserve_slot_v1 (Postgres RPC with FOR UPDATE lock)
   └─ Returns { hold_id, expires_at } — hold lives 90 seconds
   └─ BookingScreen starts 90s countdown timer
6. Customer confirms booking
   └─ bookingRepository.createBooking(payload, { headers: { Idempotency-Key } })
   └─ Backend: POST /rest/v1/rpc/create_atomic_booking (Postgres RPC)
   └─ RPC checks hold exists, capacity, inserts booking atomically
   └─ Backend fires push notification to owner
7. Success → navigate to MyBookingsScreen

Hold expiry:
  - If timer reaches 0, user must re-tap a slot (re-reserves)
  - Backend also enforces hold check inside the booking RPC

Payment flow (ENABLE_ONLINE_PAY=false by default in v1):
  1. POST /payments/create-order → creates Razorpay order
  2. Razorpay SDK opens payment sheet
  3. POST /payments/verify → server verifies HMAC signature
  4. ALSO: POST /payments/webhook (Razorpay server → our backend) catches missed verifies
```

**Critical invariants:**
- Capacity enforcement lives ONLY in the Postgres RPCs (create_atomic_booking, reserve_slot_v1)
- Never enforce capacity in the API layer
- Booking PATCH (status update) uses service_role — authenticated user UPDATE is revoked (migration 46, pending apply)
- Idempotency key required on all booking creation calls

---

## 8. Realtime Architecture

All these subscriptions are active in production and must stay working:

| Subscription | Where | Filter | Action on event |
|-------------|-------|--------|-----------------|
| `subscribeToUserBookings` | MyBookingsScreen | `user_id=eq.<self>` | Invalidate `['myBookings']` React Query cache |
| `subscribeToSalonBookings` | OwnerDashboardScreen | `salon_id=eq.<own>` | Invalidate analytics + show notification modal |
| `subscribeToBookings` | BookingScreen / bookingStore | `salon_id=eq.<id>` | Mark slots unavailable/restored in real time |
| `subscribeToUserBookings` | Web MyBookings.js | `user_id=eq.<self>` | Invalidate `['myBookings']` |
| `subscribeToSalonBookings` | Web OwnerDashboard.js | `salon_id=eq.<own>` | Invalidate dashboard data, show toast |

**Supabase Realtime auth:** `syncSupabaseAuthSession` mirrors the backend JWT into the Supabase JS client so `postgres_changes` events respect RLS (authenticated role policies). Called after login, token refresh, and cold start.

---

## 9. Backend Router Map (`/api/v1`)

| Router | Prefix | Key endpoints |
|--------|--------|---------------|
| Auth | `/auth` | `POST /signup`, `POST /login`, `POST /send-otp`, `POST /verify-otp`, `GET /me`, `PATCH /profile`, `POST /push-token`, `PATCH /notification-preferences`, `DELETE /account`, `POST /forgot-password`, `POST /reset-password` |
| Salons | `/salons` | `GET /` (discovery w/ lat/lng), `GET /:id`, `POST /` (create), `PATCH /:id`, `POST /:id/services`, `PATCH /:id/services/:svc_id`, `DELETE /:id/services/:svc_id` |
| Bookings | `/bookings` | `GET /` (my bookings), `GET /salon/:id`, `GET /slots` (availability), `POST /reserve`, `POST /` (create), `GET /:id`, `PATCH /:id/status`, `PATCH /:id/reschedule`, `GET /:id/reschedule-history` |
| Payments | `/payments` | `POST /create-order`, `POST /verify`, `POST /webhook`, `GET /status` |
| Owner | `/owner` | `GET /salon`, `PATCH /salon`, `GET /analytics` |
| Staff | `/staff` | CRUD + `GET /available/:salon_id/:service_id` |
| Staff Availability | `/staff-availability` | Weekly schedule CRUD |
| Promotions | `/promotions` | Owner CRUD + `POST /validate` |
| Reviews | `/reviews` | `POST /`, `GET /salon/:id` |
| Subscriptions | `/subscriptions` | `GET /current`, `GET /status`, `GET /history`, `POST /create`, `POST /verify`, `POST /cancel`, `POST /webhook` |
| Uploads | `/uploads` | `POST /salon-image` |
| Geocode | `/geocode` | `GET /` (Google Maps forward geocode) |
| Admin | `/admin` | `POST /broadcast`, `GET /broadcasts`, `GET /subscription-analytics` |
| Early Access | `/early-access` | `POST /` (signup) |

---

## 10. Database Schema (Key Tables)

### `public.users`
```sql
id UUID PK → auth.users(id)
email TEXT NOT NULL
name TEXT NOT NULL
phone TEXT
role TEXT CHECK (role IN ('customer', 'owner'))
push_token TEXT          -- Expo push token
push_enabled BOOLEAN     -- master push switch
notify_bookings BOOLEAN
notify_booking_updates BOOLEAN
notify_promotional BOOLEAN
notify_reminders BOOLEAN
created_at TIMESTAMPTZ
```

### `public.salons`
```sql
id UUID PK
owner_id UUID → users(id)
name, description, address, city TEXT
latitude FLOAT, longitude FLOAT
phone TEXT
opening_time TEXT ('09:00'), closing_time TEXT ('21:00')
images TEXT[]
allow_multiple_bookings_per_slot BOOLEAN
max_bookings_per_slot INTEGER
auto_accept BOOLEAN        -- auto-confirm on create
show_offers BOOLEAN
payment_methods TEXT[]     -- ['salon_cash','online']
subscription_active BOOLEAN -- denormalized flag for customer queries
created_at TIMESTAMPTZ
```

### `public.bookings`
```sql
id UUID PK
user_id UUID → users(id)
salon_id UUID → salons(id)
service_id UUID → services(id)
staff_id UUID → staff(id) NULL
booking_date DATE NOT NULL
time_slot TEXT NOT NULL              -- 'HH:MM'
status TEXT CHECK ('pending','confirmed','completed','cancelled')
payment_status TEXT CHECK ('pending','paid','failed','refunded')
payment_method TEXT CHECK ('salon_cash','online')
payment_id TEXT                      -- Razorpay payment ID
razorpay_order_id TEXT
amount DECIMAL(10,2)
promo_code TEXT
discount_amount DECIMAL
original_amount DECIMAL
any_staff BOOLEAN
notes TEXT
reschedule_count INTEGER
last_rescheduled_at TIMESTAMPTZ
created_at, updated_at TIMESTAMPTZ
UNIQUE(user_id, salon_id, service_id, booking_date, time_slot)
```

### `public.slot_holds`
```sql
id UUID PK
salon_id, service_id UUID
booking_date DATE
time_slot TEXT ('HH:MM')
user_id UUID
expires_at TIMESTAMPTZ
created_at TIMESTAMPTZ
UNIQUE(salon_id, booking_date, time_slot, user_id)
```

### `public.subscriptions`
```sql
id UUID PK
owner_id UUID → users(id)
salon_id UUID NULL
plan TEXT ('trimit_pro')
status TEXT ('trial','active','grace_period','past_due','payment_failed','cancelled','expired')
razorpay_subscription_id TEXT
trial_start, trial_end TIMESTAMPTZ
current_period_start, current_period_end TIMESTAMPTZ
next_renewal_at TIMESTAMPTZ
cancel_at_period_end BOOLEAN
cancelled_at TIMESTAMPTZ
amount INTEGER (paise — ₹299 = 29900)
currency TEXT ('INR')
created_at TIMESTAMPTZ
```

---

## 11. RLS Policy Summary

| Table | Policy |
|-------|--------|
| `users` | SELECT / UPDATE own row only |
| `salons` | SELECT public (anon + auth), INSERT/UPDATE own `owner_id = auth.uid()` |
| `services` | SELECT public, INSERT/UPDATE/DELETE via salon owner check |
| `bookings` | SELECT: user sees own, owner sees salon's. INSERT: authenticated `user_id = auth.uid()`. **UPDATE: REVOKED from authenticated (migration 46 — apply manually)** — all writes go via service_role after API-level authz |
| `slot_holds` | INSERT via `reserve_slot_v1` RPC (auth check inside). SELECT: service_role only |
| `reviews` | SELECT public, INSERT authenticated |
| `subscriptions` | SELECT own row. All writes: service-role |
| `webhook_logs` | Service-role only (no authenticated policies) |

---

## 12. Key Backend Invariants

### Idempotency layer (`core/idempotency.py`)
- Required headers: `Idempotency-Key` on `POST /bookings/` and `POST /payments/verify`
- Backed by `idempotency_keys` table in Supabase
- Claim slot → process → store result → replay hits cache for 24h
- Processing sentinel TTL: 90s (prevents concurrent duplicate flight)

### Auth middleware (`dependencies/auth.py`)
- JWT decoded with `PyJWT` using `settings.JWT_SECRET` (Supabase JWT secret)
- `user_profile_cache` (TTLCache maxsize=1000, ttl=30s) — in-memory, per-process
- Cache key: `user_id`. Always uses fresh `access_token` from current request even on cache hit.
- On cache miss: calls `resolve_profile_for_user()` which reads `public.users` and creates row if missing

### Subscription enforcement (`dependencies/subscription.py`)
- `require_active_subscription` dependency
- `SUBSCRIPTION_ENFORCEMENT_ENABLED=True` in production (Phase 2)
- Owners without access get 402. Customers never blocked. Infra errors → fail open.

### Push notifications
- `services/booking_push.py` — fires after status changes, booking creation, payment verification
- `services/push_dispatch.py` — Expo push API calls, dedupe via `notification_dedupe`
- Fire-and-forget with bare try/except (retry backoff is open P2-7)

---

## 13. Deployment & CI/CD

### Deploy flow
```
Developer pushes to main
  → Render picks up backend/ changes → redeploys (cold start ~15s)
  → Vercel picks up frontend/ changes → rebuilds + redeploys (~60s)
Mobile:
  npm run build:aab:local → upload to Google Play Console manually
  OTA updates: push JS bundle to Expo servers (no Play Store resubmission)
```

### Environment Variables
**Render (backend):**
```
SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
JWT_SECRET                    (Supabase JWT secret from Auth settings)
RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
RAZORPAY_PLAN_ID, RAZORPAY_WEBHOOK_SECRET
RESEND_API_KEY                (Resend.com for transactional email)
ADMIN_API_TOKEN               (static bearer for /admin/* endpoints)
SENTRY_DSN
ALLOWED_ORIGINS               (trimit.online,www.trimit.online)
ENVIRONMENT=production
SUBSCRIPTION_ENFORCEMENT_ENABLED=true
```

**Vercel (frontend):**
```
VITE_BACKEND_URL              (https://trimit-az5h.onrender.com)
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_GOOGLE_MAPS_API_KEY
```

**Expo EAS (mobile):**
```
EXPO_PUBLIC_API_URL            (https://trimit-az5h.onrender.com/api/v1)
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_SENTRY_DSN
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
# Feature flags (all default OFF in production v1):
EXPO_PUBLIC_ENABLE_ONLINE_PAY=false
EXPO_PUBLIC_ENABLE_STAFF_SELECTION=false
EXPO_PUBLIC_ENABLE_MULTI_BOOKING=false
EXPO_PUBLIC_ENABLE_PROMO_MANAGEMENT=false
EXPO_PUBLIC_ENABLE_SUBSCRIPTIONS=true
EXPO_PUBLIC_ENABLE_SUBSCRIPTION_ENFORCEMENT=true
```

### Health check
```
GET https://trimit-az5h.onrender.com/health
→ { "status": "ok", "version": "1.1.0", "dependencies": { "supabase": "ok" } }
```

---

## 14. Feature Flags (Mobile)

All read from `EXPO_PUBLIC_*` env vars at build time (`mobile/src/lib/featureFlags.ts`):

| Flag | Default | Controls |
|------|---------|---------|
| `ENABLE_ONLINE_PAY` | `false` | Razorpay payment option on booking screen |
| `ENABLE_STAFF_SELECTION` | `false` | Staff picker on booking screen |
| `ENABLE_MULTI_BOOKING_PER_SLOT` | `false` | Multiple bookings per time slot |
| `ENABLE_OWNER_PROMO_MANAGEMENT` | `false` | Promo code management for owners |
| `ENABLE_SUBSCRIPTIONS` | `true` | Subscription banners and screens |
| `ENABLE_SUBSCRIPTION_ENFORCEMENT` | `true` | Block frozen salons from receiving bookings |

---

## 15. Testing Infrastructure

### Backend (pytest)
```bash
cd TrimiT
PYTHONPATH=backend backend/venv/bin/python -m pytest backend/tests -v
```
**Libraries:** pytest, respx (mock Supabase HTTP), pytest-asyncio
**Pattern:** `mock_supabase` fixture = respx context mock on `settings.SUPABASE_URL`; `app.dependency_overrides` for bypassing JWT auth

**Test files:**
| File | Coverage |
|------|---------|
| `tests/test_auth.py` | signup, OTP, verify, get_me, profile update, push token, delete |
| `tests/test_bookings.py` | list, slots, reserve, create, status update, auth guards |
| `tests/test_payments.py` | create order, verify (valid/invalid), webhook (captured/duplicate/invalid) |
| `tests/test_salons.py` | list (public), detail, not found |
| `tests/test_early_access.py` | register, duplicate, invalid email |
| `tests/test_priority.py` | health, auth guard, signup flows |

**Pre-existing failures (not caused by our changes):**
- `test_otp_flow.py` — these tests hit `localhost:8001` directly (require live server). Pre-existing issue, unrelated to codebase changes.

### Mobile (Jest + jest-expo)
```bash
cd TrimiT
npm --prefix mobile run test
```
**Libraries:** jest-expo, @testing-library/react-native, jest setup in `mobile/jest.setup.js`

**Test files:**
| File | Coverage |
|------|---------|
| `__tests__/authStore.test.ts` | initial state, setUser, initializeAuth (401-only clear), 5xx keeps auth |
| `__tests__/bookingStore.test.ts` | initial state, updateSlots, markSlotJustBooked, unsubscribe |
| `__tests__/bookingRepository.test.ts` | getMyBookings, cancelBooking, getSlots, reserveSlot, createBooking |
| `__tests__/promotionRepository.test.ts` | validatePromoCode (valid/invalid) |
| `__tests__/screens/MyBookingsScreen.test.tsx` | renders list, empty state, cancel action, realtime |
| `__tests__/screens/OwnerDashboardScreen.test.tsx` | renders stats, realtime badge, no salon state |

---

## 16. Database Migrations (Status)

All 46 migrations have been applied to the production Supabase project **except migration 46** which is pending manual apply.

| # | File | Applied | Notes |
|---|------|---------|-------|
| 01 | `01_schema.sql` | ✅ | Base tables, RLS, indexes |
| 07 | `07_check_rls_policies.sql` | ✅ | Adds owner update policy (being replaced by 46) |
| 08 | `08_add_max_bookings_per_slot.sql` | ✅ | |
| 20 | `20_create_atomic_booking_rpc.sql` | ✅ | `create_atomic_booking` RPC |
| 22 | `22_create_slot_holds.sql` | ✅ | `slot_holds` table |
| 25 | `25_booking_integrity_and_payments.sql` | ✅ | `razorpay_order_id` on bookings |
| 29 | `29_booking_rpc_hardening.sql` | ✅ | `FOR UPDATE` in RPCs |
| 30 | `30_fix_active_slot_unique_index.sql` | ✅ | Partial unique on slot_holds |
| 34 | `34_create_atomic_booking_staff.sql` | ✅ | Staff support in booking RPC |
| 36 | `36_salon_payment_methods.sql` | ✅ | `payment_methods` column on salons |
| 41 | `41_subscriptions.sql` | ✅ | All subscription tables + triggers |
| 45 | `45_reschedule_staff_availability.sql` | ✅ | Staff availability in reschedule RPC |
| **46** | **`46_lock_down_booking_updates.sql`** | **⏳ PENDING** | **Revokes UPDATE from authenticated; must apply manually** |

---

## 17. Open Issues Summary (from zrd-audit.md)

### Requires Action NOW
| ID | Action needed |
|----|--------------|
| P0-1 | **Apply `database/46_lock_down_booking_updates.sql` in Supabase SQL Editor** |
| P1-2 | **Register `POST /api/v1/payments/webhook` URL in Razorpay Dashboard** |

### Code complete, deploying with next push to `main`
| ID | What was fixed |
|----|---------------|
| P0-2 | SignatureMiddleware deleted; dead HMAC scheme removed |
| P1-1 | Web authStore — trust persisted token, 401-only clear |
| P1-3 | Owner dashboard N+1 realtime handler fixed |
| P1-5 | Web MyBookings realtime — cache invalidation not raw payload reads |
| P1-6 | Android 13+ notification primer wired into App.tsx |
| P2-6 | Web auth init no longer blocks render |
| P2-11 | ProtectedRoute waits for auth hydration |

### Still open (backlog priority order)
| ID | Item |
|----|------|
| P1-4 (partial) | 9 mobile screens still have direct `api.*` calls |
| P2-2 | Slot endpoint 5 sequential awaits → `asyncio.gather()` (4x win) |
| P2-3 | Add `(latitude, longitude)` B-tree index |
| P2-7 | Push notification retry backoff |
| P2-1 | Mobile authStore dynamic `require()` circular dep |
| P2-4 | TypeScript migration for web frontend |
| P2-8 | Admin analytics SQL aggregation |
| P2-9 | Extract slot_service.py + booking_service.py |
| P3-3 | Delete `backend/services/lecture.html` |
| P3-6 | Remove `python-json-logger` from requirements.txt |
| P3-9 | Add Sentry to web frontend |
| P3-10 | Add CSP header to vercel.json |
| P3-12 | Add GitHub Actions CI for backend |

---

## 18. Subscription Business Logic

### Plan: TrimiT Pro
- **Price:** ₹299/month (29900 paise)
- **Trial:** 14 days from owner signup (auto-created by DB trigger on `public.users` insert with role='owner')
- **Status flow:** `trial` → `active` (paid) → `grace_period` (payment failed, 3-day window) → `expired`
- **Enforcement:** `SUBSCRIPTION_ENFORCEMENT_ENABLED=true` in production. Expired/past_due owners get 402 from `require_active_subscription` dependency.
- **Client-side gate:** `SubscriptionGate` component + `useSubscriptionStatus` hook. Lapsed salons show frozen state; customers see "not accepting bookings."
- **compute_access():** Trial expiry computed inline — no cron dependency. If `status == 'trial'` but `trial_end < now()`, effective status is `expired` immediately.

### Webhook flow (Razorpay)
```
Razorpay → POST /subscriptions/webhook (HMAC verified, idempotent via webhook_logs)
  subscription.charged → update period_start/end, record payment, send receipt email
  subscription.activated → activate subscription
  subscription.cancelled → cancel subscription
  payment.failed → move to grace_period or past_due

Razorpay → POST /payments/webhook (NEW — Pass 10)
  payment.captured → find booking by razorpay_order_id, mark payment_status=paid
```

---

## 19. Push Notification Channels (Android)

| Channel | ID | Importance | Purpose |
|---------|-----|-----------|---------|
| Bookings | `bookings` | MAX | Booking events (confirm, cancel, reschedule, complete) |
| Promotions | `promotions` | DEFAULT | Broadcast marketing push from admin |

Preference-gated: `users.notify_bookings`, `users.notify_booking_updates`, `users.notify_promotional`, `users.notify_reminders`

---

## 20. Known Fragile Areas — Handle With Care

1. **`reserve_slot_v1` + `create_atomic_booking` RPCs** (`database/29_booking_rpc_hardening.sql`) — Don't touch without reading the SQL first. These use `FOR UPDATE` on the salon row + `WHEN unique_violation` exception handling. Any change could silently break concurrent booking safety.

2. **`mobile/src/store/authStore.ts` `initializeAuth`** — Uses dynamic `require()` workaround for circular dependencies. Don't refactor without first resolving the circular dep between `authStore ↔ authService`.

3. **`syncSupabaseAuthSession`** (`mobile/src/lib/supabase.ts`) — Must be called after every token change (login, restore, refresh). This mirrors the JWT into Supabase JS client so Realtime `postgres_changes` events pass RLS. Missing this call = no realtime events.

4. **`core/idempotency.py`** — Supabase-backed distributed lock. The `IDEMPOTENCY_PROCESSING_STATUS = 102` sentinel is critical. Don't change TTLs or the processing→result flow without testing concurrent retries.

5. **Supabase service_role usage** — Every `service_role=True` call bypasses all RLS. These are intentional and documented at each call site. Adding new `service_role=True` calls requires explicit justification and review.

---

## 21. How to Run Locally

### Backend
```bash
cd TrimiT/backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
cp .env.example .env  # fill in Supabase + Razorpay keys
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend
```bash
cd TrimiT/frontend
cp env.example .env.local  # fill in VITE_BACKEND_URL, VITE_SUPABASE_*
npm install
npm run dev
```

### Mobile
```bash
cd TrimiT/mobile
cp env.example .env  # fill in EXPO_PUBLIC_* vars
npm install
npx expo start
# Android: press A to open on emulator/device
```

### Run Tests
```bash
# Backend
cd TrimiT
PYTHONPATH=backend backend/venv/bin/python -m pytest backend/tests -v

# Mobile
npm --prefix mobile run typecheck   # TypeScript
npm --prefix mobile run test        # Jest

# Frontend build check
npm --prefix frontend run build
```

---

## 22. Key Files Quick Reference

| File | Purpose |
|------|---------|
| `RULES.md` | Engineering rules — read on every prompt |
| `zrd-audit.md` | Full audit with fix status per issue |
| `zed-context.md` | This file — complete project context |
| `docs/REMAINING_ISSUES.md` | Canonical open issue tracker |
| `docs/PROGRESS.md` | Session-by-session change log |
| `database/46_lock_down_booking_updates.sql` | ⏳ PENDING — RLS lockdown for bookings table |
| `backend/server.py` | FastAPI app entry point, middleware, router mounting |
| `backend/core/idempotency.py` | Idempotency layer (don't touch lightly) |
| `backend/dependencies/auth.py` | JWT validation + user_profile_cache |
| `backend/routers/bookings.py` | Slot gen, holds, booking CRUD (949 lines) |
| `backend/routers/payments.py` | Razorpay order/verify/webhook |
| `mobile/App.tsx` | App bootstrap, font load, push notification primer |
| `mobile/src/store/authStore.ts` | Auth lifecycle — gold standard implementation |
| `mobile/src/store/bookingStore.ts` | Realtime slot state |
| `mobile/src/lib/supabase.ts` | Realtime subscriptions + syncSupabaseAuthSession |
| `mobile/src/repositories/bookingRepository.ts` | Booking network gateway |
| `frontend/src/store/authStore.js` | Web auth — trust-persisted-token pattern (fixed Pass 10) |
| `frontend/src/lib/api.js` | Axios instance + 401 token refresh interceptor |

---

*This file should be updated any time the architecture, deployment posture, or major feature state changes. Cross-reference `zrd-audit.md` for issue-level detail.*
