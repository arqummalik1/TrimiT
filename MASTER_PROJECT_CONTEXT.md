# TrimiT — Master Project Context (Single Source of Truth)

> **CRITICAL:** This is the **definitive, comprehensive reference** for the entire TrimiT project.
> Use this document when sharing the project with ChatGPT, Claude, Google Gemini, or any other AI tool.
> It contains complete architecture, code patterns, database schema, API contracts, deployment procedures, and operational rules.
>
> **Last Updated:** May 26, 2026  
> **Maintained By:** Arqum Malik  
> **Status:** Live production app with real users and revenue  
> **Canonical Rules:** See `/RULES.md` at repo root (read on every prompt)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Overview](#2-product-overview)
3. [Monorepo Structure](#3-monorepo-structure)
4. [Technology Stack](#4-technology-stack)
5. [Architecture & Design Patterns](#5-architecture--design-patterns)
6. [Backend (FastAPI + Supabase)](#6-backend-fastapi--supabase)
7. [Database Schema & Migrations](#7-database-schema--migrations)
8. [Mobile App (React Native + Expo)](#8-mobile-app-react-native--expo)
9. [Web Frontend (React + Vite)](#9-web-frontend-react--vite)
10. [Authentication & Authorization](#10-authentication--authorization)
11. [Booking Engine (Core Business Logic)](#11-booking-engine-core-business-logic)
12. [Payments & Transactions](#12-payments--transactions)
13. [Real-time Features](#13-real-time-features)
14. [Push Notifications](#14-push-notifications)
15. [API Reference](#15-api-reference)
16. [Deployment & Operations](#16-deployment--operations)
17. [Known Issues & Roadmap](#17-known-issues--roadmap)
18. [How to Use This Document](#18-how-to-use-this-document)

---

## 1. Executive Summary

**TrimiT** is a **salon marketplace platform** (think "Zomato for salons") built for the India market. It enables customers to discover nearby salons, browse services, book time slots, and pay online or at the salon. Salon owners manage their business from a mobile app or web dashboard.

| Aspect | Details |
|--------|---------|
| **Product** | Salon marketplace with booking, payments, and real-time notifications |
| **Market** | India (₹ pricing, English UI) |
| **Users** | Customers + Salon Owners (same mobile app, different role-based UI) |
| **Status** | Live in production on Google Play Store |
| **Scale** | Multi-million-dollar startup trajectory; changes reach users within minutes |
| **Tech** | React Native (mobile), React (web), FastAPI (backend), Supabase (database) |

### Key Differentiators

- **Real-time slot invalidation** — when one customer books a slot, all other customers see it disappear instantly
- **Atomic booking RPC** — prevents race conditions and double-booking via database-level locking
- **Persistent login** — sessions survive app swipe-kill, reboots, and network blips
- **Broadcast notifications** — Zomato/Blinkit-style marketing push to all users
- **Salon owner dashboard** — analytics, booking management, service configuration, all in-app

---

## 2. Product Overview

### 2.1 Customer Journey

1. **Discover** — Search salons by location (list + map view)
2. **Browse** — View salon details, services, pricing, reviews
3. **Book** — Select date → time slot → optional staff → confirm
4. **Pay** — Cash at salon OR online via Razorpay
5. **Manage** — View bookings, reschedule, cancel, write reviews
6. **Notify** — Push alerts for booking status changes

### 2.2 Salon Owner Journey

1. **Onboard** — Create account, set up salon profile, hours, services
2. **Dashboard** — View analytics (revenue, bookings, trends)
3. **Manage Bookings** — Accept/reject/complete bookings in real-time
4. **Configure** — Manage services, pricing, staff, working hours, promotions
5. **Alerts** — Instant push notification for every new booking

### 2.3 Roles & Permissions

| Role | App Experience | Key Screens |
|------|-----------------|------------|
| **Customer** | Mobile: Discover · Bookings · Profile | SalonDetail, BookingScreen, MyBookings, WriteReview |
| **Owner** | Mobile: Dashboard · Bookings · Services · Settings | DashboardMain, ManageBookings, ManageServices, ManageSalon |
| **Both** | Web: Marketing + role-based portal | trimit.online (customer + owner flows) |

---

## 3. Monorepo Structure

```
TrimiT/
├── backend/                    # FastAPI (Python 3.10+)
│   ├── server.py              # Entry point, CORS, rate limiting, Sentry
│   ├── routers/               # API endpoints (auth, salons, bookings, payments, etc.)
│   ├── services/              # Business logic (push, booking, payment verification)
│   ├── dependencies/          # Auth guards, middleware
│   ├── core/                  # Config, middleware, logging
│   ├── requirements.txt        # Python dependencies
│   └── .env                   # (not in git) Supabase keys, Razorpay keys, secrets
│
├── mobile/                     # Expo SDK 54 / React Native 0.81 / React 19
│   ├── src/
│   │   ├── screens/           # Customer & Owner screens
│   │   ├── navigation/        # React Navigation stacks
│   │   ├── components/        # Reusable UI components
│   │   ├── hooks/             # Custom React hooks (useQuery, useMutation)
│   │   ├── repositories/      # Data layer (API calls)
│   │   ├── services/          # Business logic
│   │   ├── store/             # Zustand stores (auth, bookings, notifications)
│   │   ├── lib/               # Utilities (API client, notifications, theme)
│   │   ├── types/             # TypeScript types
│   │   └── App.tsx            # Root component
│   ├── app.json               # Expo config
│   ├── package.json           # Dependencies
│   ├── .env                   # (not in git) API URL, Supabase keys
│   └── BUILD_RELEASE.md       # APK/AAB production build guide
│
├── frontend/                   # Vite 6 + React 19 + Tailwind
│   ├── src/
│   │   ├── pages/             # Route pages (customer, owner, auth)
│   │   ├── components/        # Reusable components
│   │   ├── hooks/             # Custom hooks
│   │   ├── lib/               # API client, utilities
│   │   ├── store/             # Zustand stores
│   │   ├── types/             # TypeScript types
│   │   ├── App.js             # Root + routing
│   │   └── main.jsx           # Entry point
│   ├── vite.config.js         # Vite configuration
│   ├── package.json           # Dependencies
│   ├── .env                   # (not in git) Backend URL, Supabase keys
│   └── vercel.json            # Vercel deployment config
│
├── database/                   # SQL migrations (numbered, run in order)
│   ├── 01_schema.sql          # Core tables, RLS policies
│   ├── 02_*.sql … 39_*.sql    # Incremental migrations
│   └── README.md              # Migration guide
│
├── shared/legal/              # Shared legal documents
│   ├── privacy.md             # Privacy policy
│   └── terms.md               # Terms of service
│
├── docs/                       # Comprehensive documentation
│   ├── API_GUIDE.md           # Full API reference
│   ├── PROJECT_MASTER_CONTEXT_FOR_AI.md  # AI-friendly context
│   ├── REMAINING_ISSUES.md    # Open issues tracker
│   ├── PROGRESS.md            # Session log & current state
│   ├── architecture/          # Architecture deep-dives
│   ├── audit/                 # Production audit reports
│   └── [many more guides]
│
├── RULES.md                   # ⭐ SINGLE SOURCE OF TRUTH for engineering rules
├── CLAUDE.md                  # Agent guidance (mirrors RULES.md)
├── CONTEXT.md                 # Shorter architecture summary
├── DOCUMENTATION.md           # Technical overview
├── README.md                  # Project intro
└── .cursorrules               # Cursor IDE rules (mirrors RULES.md)
```

---

## 4. Technology Stack

### Backend

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Framework | FastAPI | 0.104+ | Async web framework |
| Language | Python | 3.10+ | Backend logic |
| Database | Supabase (Postgres) | 15+ | Data storage, RLS, Realtime |
| Auth | Supabase Auth | JWT | User authentication |
| Payments | Razorpay | API v1 | Online payment processing |
| Deployment | Render | Gunicorn | Production hosting |
| Observability | Sentry | Latest | Error tracking |
| Rate Limiting | slowapi | 0.1.9+ | Request throttling |

### Mobile

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Framework | React Native | 0.81 | Cross-platform mobile |
| Expo | Expo SDK | 54 | Managed React Native |
| React | React | 19 | UI library |
| State | Zustand | 4.4+ | Client state management |
| Server State | TanStack Query | 5.x | API caching & sync |
| Navigation | React Navigation | 6.x | Screen routing |
| Maps | react-native-maps | 1.x | Map display |
| Notifications | Expo Notifications | Latest | Push notifications |
| Storage | expo-secure-store | Latest | Secure token storage |
| Deployment | Google Play Store | — | Android distribution |

### Web

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Framework | React | 19 | UI library |
| Build | Vite | 6.x | Fast bundler |
| Styling | Tailwind CSS | 3.x | Utility CSS |
| State | Zustand | 4.4+ | Client state |
| Server State | TanStack Query | 5.x | API caching |
| Routing | React Router | 6.x | Page routing |
| Deployment | Vercel | — | Production hosting |

### Database

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Database | PostgreSQL 15+ | Relational data |
| Auth | Supabase Auth | User management |
| RLS | PostgreSQL RLS | Row-level security |
| Realtime | Supabase Realtime | WebSocket subscriptions |
| Storage | Supabase Storage | File uploads |
| Migrations | Manual SQL | Schema versioning |

---

## 5. Architecture & Design Patterns

### 5.1 Strict MVVM + Repository + Service Pattern

All three apps (backend, mobile, web) follow this layering:

```
┌─────────────────────────────────────────────────────────────┐
│ UI Layer (Screens / Pages / Components)                     │
│ - React components, no business logic                       │
│ - Consume hooks (useQuery, useMutation)                     │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│ State Management (Zustand + React Query)                    │
│ - authStore, bookingStore, notificationStore               │
│ - useQuery / useMutation hooks                             │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│ Repository Layer (Data Access)                              │
│ - authRepository, salonRepository, bookingRepository        │
│ - Encapsulates API calls                                    │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│ Service Layer (Business Logic)                              │
│ - authService, bookingService, paymentService              │
│ - Validation, transformation, orchestration                │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│ API Client (HTTP)                                           │
│ - axios / fetch with interceptors                          │
│ - Authorization header injection                            │
│ - 401 refresh-and-retry logic                              │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│ Backend API (FastAPI)                                       │
│ - /api/v1/auth, /api/v1/salons, /api/v1/bookings, etc.    │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│ Database (Supabase Postgres)                                │
│ - Tables, RLS policies, RPCs                               │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Non-Negotiable Rules

1. **No direct API calls in view files** — `.tsx` / `.jsx` pages must not import `axios` or call `api.*` directly. Use repositories + React Query hooks.
2. **Every network operation handles loading, error, success** — no bare promise rejections.
3. **No `any` in TypeScript** — all types defined in `*/src/types/`.
4. **Backend orchestration** — `server.py` + routers are thin wrappers; reusable logic goes into `services/`.
5. **New SQL = new migration** — never edit applied migrations; add numbered files.
6. **RLS is the last line of defense** — service-role bypass is documented and minimized.
7. **Real-time everywhere it matters** — booking lists, slot availability, owner dashboard all use Supabase Realtime.

### 5.3 Error Handling

**Backend:**
- All errors return structured `{ code: string, message: string, details?: object }`
- HTTP status codes: 200 (success), 201 (created), 400 (validation), 401 (auth), 403 (forbidden), 409 (conflict), 500 (server error)
- Sentry captures all 5xx errors

**Mobile:**
- API errors routed through `handleApiError` in `errorHandler.ts`
- User-facing messages are human-readable, never raw error strings
- Network timeouts show "Connection failed" with retry option
- 401 triggers silent refresh + retry; if still 401, clears session

**Web:**
- API errors caught in response interceptor
- 401 redirects to login
- User-facing toasts for errors
- Sentry captures exceptions (when enabled)

---

## 6. Backend (FastAPI + Supabase)

### 6.1 Entry Point & Structure

**File:** `backend/server.py` (~190 lines)

```python
# Key setup
app = FastAPI()
app.add_middleware(CORSMiddleware, ...)  # CORS for web + mobile
app.add_middleware(RequestIdMiddleware)  # Trace IDs
app.add_middleware(RateLimitMiddleware)  # Per-user + per-IP throttling
app.add_middleware(SignatureMiddleware)  # Optional request signing (currently disabled)

# Routers (all prefixed /api/v1)
app.include_router(auth_router)          # /auth
app.include_router(salons_router)        # /salons
app.include_router(bookings_router)      # /bookings
app.include_router(payments_router)      # /payments
app.include_router(owner_router)         # /owner
app.include_router(staff_router)         # /staff
app.include_router(promotions_router)    # /promotions
app.include_router(reviews_router)       # /reviews
app.include_router(admin_router)         # /admin (broadcast push)
```

### 6.2 Authentication & Authorization

**Flow:**
1. Client calls `POST /api/v1/auth/signup` or `POST /api/v1/auth/login`
2. Backend calls Supabase Auth API
3. Supabase returns JWT (`access_token` + `refresh_token`)
4. Client stores JWT in secure storage
5. All subsequent requests include `Authorization: Bearer <JWT>`
6. Backend validates JWT via `get_current_user` dependency

**Key Files:**
- `backend/dependencies/auth.py` — `get_current_user`, `get_current_owner`
- `backend/routers/auth.py` — signup, login, profile, push-token, notification prefs

### 6.3 Core Routers

| Router | File | Key Endpoints |
|--------|------|---------------|
| **Auth** | `routers/auth.py` | signup, login, me, profile, push-token, notification-preferences, account delete |
| **Salons** | `routers/salons.py` | list (discovery), detail, owner salon, CRUD |
| **Bookings** | `routers/bookings.py` | slots, reserve (hold), create, list, status, reschedule, history |
| **Payments** | `routers/payments.py` | create-order, verify (Razorpay HMAC) |
| **Owner** | `routers/owner.py` | analytics (revenue, bookings, trends), salon management |
| **Staff** | `routers/staff.py` | CRUD staff, availability |
| **Promotions** | `routers/promotions.py` | validate, owner CRUD |
| **Reviews** | `routers/reviews.py` | post review (after completed booking) |
| **Admin** | `routers/admin.py` | broadcast push (gated by `ADMIN_API_TOKEN`) |

### 6.4 Key Services

| Service | File | Purpose |
|---------|------|---------|
| **Push Dispatch** | `services/push_dispatch.py` | Central push notification orchestration |
| **Booking Push** | `services/booking_push.py` | Booking lifecycle event notifications |
| **Push Notifications** | `services/push_notifications.py` | Expo API integration |
| **Push Preferences** | `services/push_preferences.py` | User notification settings |
| **Broadcast** | `services/broadcast.py` | Zomato/Blinkit-style marketing push |

### 6.5 Environment Variables

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Razorpay
RAZORPAY_KEY_ID=rzp_...
RAZORPAY_KEY_SECRET=...

# Backend
ALLOWED_ORIGINS=https://trimit.online,https://localhost:3000
API_SIGNING_SECRET=...  # Optional; currently unused
ADMIN_API_TOKEN=...     # For broadcast push endpoint

# Observability
SENTRY_DSN=https://...
```

### 6.6 Running Locally

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn server:app --port 8001 --reload
```

---

## 7. Database Schema & Migrations

### 7.1 Core Tables

**`users`** — Customer & Owner profiles
```sql
id UUID PRIMARY KEY (linked to auth.users)
email TEXT UNIQUE
phone TEXT
name TEXT
role TEXT ('customer' | 'owner')
avatar_url TEXT
push_enabled BOOLEAN
notify_bookings BOOLEAN
notify_booking_updates BOOLEAN
notify_promotional BOOLEAN
notify_reminders BOOLEAN
created_at TIMESTAMP
updated_at TIMESTAMP
```

**`salons`** — Business entities
```sql
id UUID PRIMARY KEY
owner_id UUID (FK users)
name TEXT
description TEXT
address TEXT
city TEXT
latitude FLOAT
longitude FLOAT
phone TEXT
email TEXT
avatar_url TEXT
opening_time TIME
closing_time TIME
allow_multiple_bookings_per_slot BOOLEAN
max_bookings_per_slot INT
payment_methods TEXT[] ('salon_cash', 'razorpay')
created_at TIMESTAMP
updated_at TIMESTAMP
```

**`services`** — Salon offerings
```sql
id UUID PRIMARY KEY
salon_id UUID (FK salons)
name TEXT
description TEXT
price DECIMAL
duration_minutes INT
image_url TEXT
created_at TIMESTAMP
updated_at TIMESTAMP
```

**`bookings`** — Core transaction table
```sql
id UUID PRIMARY KEY
user_id UUID (FK users)
salon_id UUID (FK salons)
service_id UUID (FK services)
staff_id UUID (FK staff, nullable)
booking_date DATE
time_slot TIME
status TEXT ('pending', 'confirmed', 'completed', 'cancelled')
notes TEXT
payment_method TEXT ('salon_cash', 'razorpay')
payment_status TEXT ('pending', 'paid', 'failed')
razorpay_order_id TEXT
razorpay_payment_id TEXT
amount DECIMAL
created_at TIMESTAMP
updated_at TIMESTAMP
```

**`slot_holds`** — Race condition prevention
```sql
id UUID PRIMARY KEY
salon_id UUID (FK salons)
booking_date DATE
time_slot TIME
user_id UUID (FK users)
expires_at TIMESTAMP
created_at TIMESTAMP
```

**`idempotency_keys`** — Duplicate request prevention
```sql
id UUID PRIMARY KEY
idempotency_key TEXT UNIQUE
user_id UUID (FK users)
request_method TEXT
request_path TEXT
response_status INT
response_body JSONB
expires_at TIMESTAMP
created_at TIMESTAMP
```

**`booking_reschedules`** — Reschedule history
```sql
id UUID PRIMARY KEY
booking_id UUID (FK bookings)
old_date DATE
old_time_slot TIME
new_date DATE
new_time_slot TIME
reason TEXT
created_at TIMESTAMP
```

**`reviews`** — Customer feedback
```sql
id UUID PRIMARY KEY
booking_id UUID (FK bookings)
salon_id UUID (FK salons)
user_id UUID (FK users)
rating INT (1-5)
comment TEXT
created_at TIMESTAMP
```

**`staff`** — Salon staff members
```sql
id UUID PRIMARY KEY
salon_id UUID (FK salons)
name TEXT
phone TEXT
email TEXT
created_at TIMESTAMP
updated_at TIMESTAMP
```

**`staff_services`** — Staff-service mapping
```sql
id UUID PRIMARY KEY
staff_id UUID (FK staff)
service_id UUID (FK services)
created_at TIMESTAMP
```

**`promotions`** — Promo codes
```sql
id UUID PRIMARY KEY
salon_id UUID (FK salons)
code TEXT UNIQUE
discount_type TEXT ('percentage' | 'fixed')
discount_value DECIMAL
max_uses INT
current_uses INT
valid_from TIMESTAMP
valid_until TIMESTAMP
created_at TIMESTAMP
```

**`promo_usage`** — Promo redemption tracking
```sql
id UUID PRIMARY KEY
promo_id UUID (FK promotions)
user_id UUID (FK users)
booking_id UUID (FK bookings)
created_at TIMESTAMP
```

**`notification_events`** — Push deduplication
```sql
id UUID PRIMARY KEY
user_id UUID (FK users)
booking_id UUID (FK bookings)
event_type TEXT ('new_booking', 'accepted', 'rejected', 'completed', 'rescheduled')
created_at TIMESTAMP
UNIQUE(user_id, booking_id, event_type)
```

**`broadcast_notifications`** — Broadcast push audit
```sql
id UUID PRIMARY KEY
audience TEXT ('customers', 'owners', 'all')
title TEXT
body TEXT
data JSONB
sent_count INT
created_at TIMESTAMP
```

### 7.2 Migrations

All migrations are numbered and applied in order:

```
database/01_schema.sql                    # Core tables + RLS
database/02_*.sql … database/39_*.sql    # Incremental changes
```

**Key migrations:**
- `01` — Initial schema, RLS policies
- `05`, `06` — Enable Realtime on `bookings`
- `08` — Multi-booking per slot support
- `11` — Idempotency keys table
- `14` — Booking reschedules
- `15` — Staff selection
- `20` — `create_atomic_booking` RPC
- `22` — `slot_holds` table
- `29` — Booking RPC hardening
- `36` — Salon payment methods
- `37` — Enable pending-booking expiry cron
- `39` — Broadcast notifications

### 7.3 Row-Level Security (RLS)

**Customers can only see:**
- Their own bookings
- All salons (public)
- All services (public)
- Their own reviews

**Owners can only see:**
- Their own salon
- Bookings for their salon
- Staff for their salon
- Promotions for their salon

**RLS is enforced at the database level** — the backend uses user-bound JWT by default, so RLS applies automatically. Service-role bypass is used only for admin operations (e.g., profile creation during signup).

### 7.4 Applying Migrations

**On a fresh Supabase project:**

1. Open Supabase SQL Editor
2. Run migrations in order: `01_schema.sql`, `02_*.sql`, etc.
3. Verify each migration completes without errors
4. Check RLS policies are in place: `SELECT * FROM pg_policies;`

**On production:**

- Migrations are applied manually by the team
- Never edit an already-applied migration
- Always test on a staging copy first
- Coordinate with the team before applying

---

## 8. Mobile App (React Native + Expo)

### 8.1 Navigation Structure

**Root Navigation** (`mobile/src/navigation/index.tsx`):

```
App
├── !isAuthenticated → AuthStack
│   ├── Login
│   ├── RoleSelect
│   ├── Signup
│   ├── ForgotPassword
│   └── Legal (Privacy, Terms)
│
├── role === 'owner' → OwnerTabs
│   ├── Dashboard (OwnerStack)
│   │   ├── DashboardMain
│   │   └── ManageSalon
│   ├── Bookings (ManageBookingsScreen)
│   ├── Services (ManageServicesScreen)
│   └── Settings (SettingsStack)
│       ├── SettingsMain
│       ├── ManageSalon
│       ├── StaffManagement
│       ├── PromoManagement
│       └── Legal
│
└── role === 'customer' → CustomerTabs
    ├── Discover (CustomerStack)
    │   ├── DiscoverMain
    │   ├── SalonDetail
    │   ├── ServiceDetail
    │   ├── Booking
    │   ├── RescheduleBooking
    │   ├── Payment
    │   ├── WriteReview
    │   └── Legal
    ├── Bookings (MyBookingsScreen)
    └── Profile (ProfileStack)
        ├── ProfileMain
        └── Legal
```

### 8.2 Customer Screens (Detailed)

**DiscoverScreen** — Salon search & discovery
- Location permission via `useDiscoverLocation`
- Search salons by lat/lng + radius
- List view (default) + Map view toggle
- Tap salon → `SalonDetail`

**SalonDetailScreen** — Salon profile
- Photos carousel, rating, address, hours
- Services list, reviews preview
- CTA: "Book Now" → `ServiceDetail` or `Booking`

**ServiceDetailScreen** — Service details
- Price, duration, offer badges
- CTA: "Book" → `Booking`

**BookingScreen** — Multi-step booking wizard
- Step 1: Date picker (calendar)
- Step 2: Time slot grid (30-min windows)
- Step 3: Optional staff selection
- Step 4: Notes (optional)
- Realtime slot invalidation on concurrent bookings
- Payment method selection (cash vs online)
- Uses `bookingRepository`, `bookingStore`, emoji debug logs

**PaymentScreen** — Payment processing
- Razorpay checkout (if enabled)
- Confirmation for cash-at-salon
- Success screen with booking details

**MyBookingsScreen** — Booking list
- Filter by status (pending, confirmed, completed, cancelled)
- Tap booking → detail view
- Actions: Cancel, Reschedule, Write Review
- Auto-refreshes via Realtime subscription

**RescheduleBookingScreen** — Reschedule wizard
- Same slot UX as booking
- `PATCH /api/v1/bookings/{id}/reschedule`

**WriteReviewScreen** — Post-booking feedback
- Star rating (1-5)
- Comment text
- `POST /api/v1/reviews`

**ProfileScreen** — User settings
- Edit name, phone
- Notification preferences (toggle switches)
- Theme toggle (light/dark)
- Logout, Delete Account

### 8.3 Owner Screens (Detailed)

**DashboardScreen** — Analytics & overview
- Revenue cards (today, week, month)
- Booking counts, pending count
- Charts: trends, status distribution, peak hours
- Recent bookings list
- Quick actions

**ManageBookingsScreen** — Booking management
- Filter by date, status
- Accept / Reject / Complete actions
- Realtime updates + push alerts

**ManageServicesScreen** — Service CRUD
- Add/edit/delete services
- Price, duration, offer configuration

**ManageSalonScreen** — Salon profile
- Name, description, address, city, phone
- Images upload
- Working hours editor
- Slot settings (multiple bookings, max per slot)

**StaffManagementScreen** — Staff CRUD
- Add/edit/delete staff
- Assign services
- Availability tracking

**PromoManagementScreen** — Promotion CRUD
- Create promo codes
- Discount type (percentage/fixed)
- Valid date range
- Usage stats

**SettingsScreen** — Account settings
- Account info, notification toggles
- Theme, links to staff/promo/salon
- Legal, logout

### 8.4 State Management

**Zustand Stores** (`mobile/src/store/`):

| Store | Purpose |
|-------|---------|
| `authStore` | Session, login/signup/logout, user profile |
| `bookingStore` | Transient booking wizard state (date, slot, staff, notes) |
| `toastStore` | Global error/success toasts |
| `notificationStore` | Owner in-app booking modal queue, sound |
| `notificationPrefsStore` | Sound/vibration settings for Android channel |
| `pendingSignupStore` | Name/phone during signup flow |

### 8.5 Repositories & Services

**Repositories** (`mobile/src/repositories/`):
- `authRepository` — login, signup, profile, push-token
- `salonRepository` — discovery, owner salon, analytics
- `bookingRepository` — bookings, slots, status, reschedule
- `staffRepository` — staff CRUD
- `promotionRepository` — promo validate/CRUD
- `reviewRepository` — post review

**Services** (`mobile/src/services/`):
- `authService` — auth business logic
- `bookingService` — booking validation
- `paymentService` — payment processing

### 8.6 Key Hooks

| Hook | Purpose |
|------|---------|
| `useDiscoverLocation` | Geolocation + permission handling |
| `useRealtimeBookings` | Owner: subscribe to salon bookings |
| `useSlotInvalidation` | Customer: subscribe to slot changes |
| `useFocusEffect` | Refetch on screen focus |
| `useQuery` / `useMutation` | React Query hooks |

### 8.7 Theme & Design System

**Colors** (light mode):
- Background: `#FAFAF9` (stone-50)
- Surface: `#FFFFFF`
- Primary: `#9A3412` (orange-800)
- Primary Light: `#FFF7ED`
- Text: `#1C1917`
- Text Secondary: `#78716C`
- Success: `#059669`
- Error: `#DC2626`
- Star: `#F59E0B`

**Fonts:**
- Headlines: Cormorant Garamond
- UI: Inter, Manrope

**Spacing:** 20px horizontal screen padding; tab bar 56px + safe area

### 8.8 Running Locally

```bash
cd mobile
npm install
npm start                    # Expo dev server
npm run android             # Android emulator
npm run ios                 # iOS simulator
npm run build:apk:local     # Release APK
npm run build:aab:local     # Play Store AAB
```

---

## 9. Web Frontend (React + Vite)

### 9.1 Routing & Pages

**Public Routes:**
- `/` — Landing page
- `/login` — Login
- `/signup` — Signup
- `/forgot-password` — Password reset request
- `/reset-password` — Password reset form
- `/privacy` — Privacy policy
- `/terms` — Terms of service
- `/contact` — Contact form

**Customer Routes** (`allowedRoles: ['customer']`):
- `/discover` — Salon search & list
- `/salon/:id` — Salon detail
- `/booking/:salonId/:serviceId` — Booking wizard
- `/my-bookings` — Booking list
- `/account` — Account settings

**Owner Routes** (`allowedRoles: ['owner']`):
- `/owner/dashboard` — Analytics & overview
- `/owner/salon` — Salon management
- `/owner/services` — Service CRUD
- `/owner/bookings` — Booking management
- `/owner/settings` — Account settings

### 9.2 Key Pages

**CustomerHome** — Salon discovery
- Search by location, name, service
- List + map view
- Tap salon → `SalonDetail`

**SalonDetail** — Salon profile
- Photos, rating, address, hours
- Services list, reviews
- "Book Now" → `BookingPage`

**BookingPage** — Booking wizard
- Date picker → slot grid → payment method
- Realtime slot invalidation (if implemented)
- Submit → confirmation

**MyBookings** — Booking list
- Filter by status
- Cancel, reschedule, review actions
- Should auto-refresh via Realtime (P1 issue)

**OwnerDashboard** — Analytics
- Revenue cards, booking counts
- Charts (trends, status, peak hours)
- Recent bookings

**ManageSalon** — Salon profile editor
- Name, description, address, hours
- Image upload
- Slot settings

**ManageServices** — Service CRUD
- Add/edit/delete services
- Price, duration

**ManageBookings** — Booking management
- Filter by date, status
- Accept/reject/complete actions

### 9.3 API Client

**File:** `frontend/src/lib/api.js`

```javascript
// Centralized axios instance
const apiClient = axios.create({
  baseURL: `${REACT_APP_BACKEND_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor: inject JWT
apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Attempt silent refresh
      // If still 401, redirect to login
    }
    return Promise.reject(error);
  }
);
```

### 9.4 State Management

**Zustand Stores** (`frontend/src/store/`):
- `authStore` — session, login/logout
- `uiStore` — theme, modals, notifications

### 9.5 Environment Variables

```bash
VITE_BACKEND_URL=https://trimit-az5h.onrender.com
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_SENTRY_DSN=https://...  # Optional
```

### 9.6 Running Locally

```bash
cd frontend
npm install
npm start                    # Vite dev server (port 3000)
npm run build               # Production build
npm run preview             # Preview production build
```

### 9.7 Deployment

**Vercel:**
- Automatic deploy on push to `main`
- Environment variables set in Vercel dashboard
- Production URL: `https://trimit.online`

---

## 10. Authentication & Authorization

### 10.1 Auth Flow

**Signup:**
1. User enters email, selects role (customer/owner)
2. `POST /api/v1/auth/signup` → Supabase Auth creates user
3. Supabase sends OTP to email
4. User enters 6-digit OTP
5. `POST /api/v1/auth/verify-otp` → Backend creates `public.users` row, returns JWT
6. Client stores JWT in secure storage
7. App navigates to role-specific home screen

**Login:**
1. User enters email
2. `POST /api/v1/auth/send-otp` → Supabase sends OTP
3. User enters OTP
4. `POST /api/v1/auth/verify-otp` → Backend returns JWT
5. Client stores JWT, navigates to home

**Session Persistence:**
- Mobile: `expo-secure-store` (with AsyncStorage fallback for 2KB limit)
- Web: `localStorage`
- On cold start, app trusts persisted token immediately
- Only explicit 401 clears session

**Refresh:**
- Client detects 401 on any request
- Attempts silent Supabase session refresh
- Retries original request once
- If still 401, clears session and redirects to login

### 10.2 Role-Based Access

**Role assignment:**
- Set at first account creation only
- Client passes role hint to `verify-otp`
- Backend uses hint only when no `public.users` row exists
- No escalation possible after creation

**Role values:**
- `customer` — access to Discover, Bookings, Profile
- `owner` — access to Dashboard, Bookings, Services, Settings

### 10.3 RLS Policies

**Customers:**
- Can read all salons, services, reviews (public)
- Can read only their own bookings, reschedules, reviews
- Can create bookings, reviews, reschedules

**Owners:**
- Can read their own salon, services, staff, promotions
- Can read bookings for their salon only
- Can update their own salon, services, staff, promotions
- Can update bookings for their salon (status, notes only)

**Admin (service-role bypass):**
- Used only for profile creation during signup
- Minimized and documented

---

## 11. Booking Engine (Core Business Logic)

### 11.1 Booking Statuses

| Status | Set By | Customer Can | Owner Can |
|--------|--------|--------------|-----------|
| `pending` | Default | Cancel | Accept → `confirmed` / Reject → `cancelled` |
| `confirmed` | Owner | Cancel (policy) | Mark `completed` |
| `completed` | Owner | Write review | — |
| `cancelled` | Either | — | — |

### 11.2 Slot Generation Algorithm

**Endpoint:** `GET /api/v1/bookings/slots?salon_id=...&date=...`

1. Load salon opening hours for the date
2. Generate 30-minute windows (e.g., 10:00, 10:30, 11:00, ...)
3. Subtract non-`cancelled` bookings
4. Subtract active `slot_holds` (other users' reservations)
5. Apply 5-minute past-time grace (salon timezone)
6. Respect `max_bookings_per_slot` and `allow_multiple_bookings_per_slot`
7. Return available slots with `available: true/false`

### 11.3 Booking Creation (Race Prevention)

**Flow:**

1. **Client:** `POST /api/v1/bookings/reserve` → creates a `slot_hold` (5-min expiry)
2. **Client:** Starts hold timer UI
3. **Client:** `POST /api/v1/bookings` → creates booking
4. **Backend:** "Final Guard" re-checks slot availability
5. **Backend:** Calls `create_atomic_booking` RPC with `FOR UPDATE` locking
6. **Database:** Enforces unique constraint on `(salon_id, slot_time)` per `max_bookings_per_slot`
7. **Success:** Booking created, hold released
8. **Failure:** Booking rejected, hold expires, slot becomes available again

**Key invariants:**
- Capacity enforcement is in the RPC, not the API layer
- Holds prevent other users from booking the same slot during the wizard
- Idempotency keys prevent duplicate bookings on retry

### 11.4 Reschedule

**Endpoint:** `PATCH /api/v1/bookings/{id}/reschedule`

1. Client selects new date + slot
2. Backend calls `reschedule_booking_atomic` RPC
3. RPC validates new slot availability
4. RPC updates booking, creates `booking_reschedules` history row
5. Backend sends push to both customer and owner
6. Mobile Realtime subscription invalidates old slot

### 11.5 Idempotency

**Mechanism:**
- Client generates UUID `idempotency_key` on booking create
- Sends `Idempotency-Key: <uuid>` header
- Backend checks `idempotency_keys` table
- If key exists and processing is done, returns cached response
- If key exists and still processing, returns 409 Conflict
- If key doesn't exist, processes request and caches response

**TTL:** Rows expire after 24 hours (configurable)

---

## 12. Payments & Transactions

### 12.1 Payment Methods

| Method | Flow | Status |
|--------|------|--------|
| `salon_cash` | Booking created; pay at salon | Live in v1 |
| `razorpay` | Online checkout via Razorpay | Code exists; webhook pending |

### 12.2 Razorpay Integration

**Create Order:**
```
POST /api/v1/payments/create-order
{
  "booking_id": "...",
  "amount": 500,
  "currency": "INR"
}
→ { "razorpay_order_id": "order_..." }
```

**Verify Payment:**
```
POST /api/v1/payments/verify
{
  "razorpay_order_id": "order_...",
  "razorpay_payment_id": "pay_...",
  "razorpay_signature": "..."
}
```

Backend verifies signature using `HMAC-SHA256` with `RAZORPAY_KEY_SECRET`.

### 12.3 Payment Status

| Status | Meaning |
|--------|---------|
| `pending` | Booking created, awaiting payment |
| `paid` | Payment verified, booking confirmed |
| `failed` | Payment failed or expired |

**Pending online bookings expire after 15 minutes** (cron job via `pg_cron`).

---

## 13. Real-time Features

### 13.1 Supabase Realtime Subscriptions

**Mobile:**

```typescript
// Customer: subscribe to own bookings
subscribeToUserBookings(userId, (event) => {
  // Invalidate React Query cache
  queryClient.invalidateQueries(['bookings']);
  // Show notification modal (owner only)
});

// Customer: subscribe to slot changes
subscribeToSlots(salonId, date, (event) => {
  // Invalidate slot query
  queryClient.invalidateQueries(['slots', salonId, date]);
});

// Owner: subscribe to salon bookings
useRealtimeBookings(salonId, (event) => {
  // Show in-app modal for new bookings
  // Play sound
});
```

**Web:**

```javascript
// Customer: subscribe to own bookings (P1 issue: not yet implemented)
// Owner: subscribe to salon bookings (not yet implemented)
```

### 13.2 Realtime Events

| Table | Event | Trigger | Listener |
|-------|-------|---------|----------|
| `bookings` | INSERT | New booking created | Owner dashboard, customer list |
| `bookings` | UPDATE | Status changed | Both parties |
| `bookings` | DELETE | Booking cancelled | Both parties |

---

## 14. Push Notifications

### 14.1 Architecture

```
Backend Event
  ↓
push_dispatch.py (preference gates + dedupe)
  ↓
push_notifications.py (Expo API)
  ↓
Expo Push Service
  ↓
Device (Android/iOS)
```

### 14.2 Channels

| Channel | Purpose | Android | iOS |
|---------|---------|---------|-----|
| `bookings` | Booking alerts | Sound + vibration | Sound |
| `promotions` | Marketing | Silent | Silent |

### 14.3 User Preferences

| Field | Default | Meaning |
|-------|---------|---------|
| `push_enabled` | true | Master switch |
| `notify_bookings` | true | Owner: new booking alerts |
| `notify_booking_updates` | true | Status change alerts |
| `notify_promotional` | false | Marketing push |
| `notify_reminders` | true | 1-hour-before reminder |

### 14.4 Deduplication

**Table:** `notification_events`

```sql
UNIQUE(user_id, booking_id, event_type)
```

Prevents duplicate pushes for the same booking event.

### 14.5 Mobile Setup

```typescript
// After login
setupPushNotifications();
  ↓
requestPermissions() // Android 13+: POST_NOTIFICATIONS
  ↓
getExpoPushTokenAsync()
  ↓
POST /api/v1/auth/push-token
  ↓
Backend stores token in users.push_token

// On logout
teardownPushNotifications();
  ↓
DELETE /api/v1/auth/push-token
```

### 14.6 Broadcast Push (Zomato/Blinkit-style)

**Endpoint:** `POST /api/v1/admin/broadcast` (gated by `ADMIN_API_TOKEN`)

```json
{
  "audience": "customers" | "owners" | "all",
  "title": "Special offer!",
  "body": "Get 20% off this weekend",
  "data": { "promo_code": "WEEKEND20" }
}
```

- Fans out to all users in audience
- Respects `notify_promotional` preference
- Batched 100 users per Expo API call
- Audit logged in `broadcast_notifications` table

---

## 15. API Reference

### 15.1 Base URL

- **Production:** `https://trimit-az5h.onrender.com/api/v1`
- **Local dev:** `http://localhost:8001/api/v1`
- **Mobile dev:** Auto-detects Expo host IP or uses production fallback

### 15.2 Authentication Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/auth/signup` | Create account, send OTP |
| POST | `/auth/send-otp` | Resend OTP |
| POST | `/auth/verify-otp` | Verify OTP, return JWT |
| POST | `/auth/login` | Login (OTP flow) |
| GET | `/auth/me` | Get current user profile |
| PATCH | `/auth/profile` | Update profile (name, phone) |
| POST | `/auth/push-token` | Register push token |
| PATCH | `/auth/notification-preferences` | Update notification settings |
| DELETE | `/auth/account` | Delete account |
| POST | `/auth/forgot-password` | Request password reset |
| POST | `/auth/reset-password` | Reset password with token |

### 15.3 Salon Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/salons` | List salons (discovery) |
| GET | `/salons/{id}` | Get salon detail |
| POST | `/salons` | Create salon (owner) |
| PATCH | `/salons/{id}` | Update salon (owner) |
| GET | `/salons/{id}/services` | List salon services |
| POST | `/salons/{id}/services` | Create service (owner) |
| PATCH | `/salons/{id}/services/{service_id}` | Update service (owner) |
| DELETE | `/salons/{id}/services/{service_id}` | Delete service (owner) |

### 15.4 Booking Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/bookings/slots` | Get available slots |
| POST | `/bookings/reserve` | Create slot hold (5 min) |
| POST | `/bookings` | Create booking |
| GET | `/bookings` | List user bookings |
| GET | `/bookings/{id}` | Get booking detail |
| PATCH | `/bookings/{id}/status` | Update booking status |
| PATCH | `/bookings/{id}/reschedule` | Reschedule booking |
| DELETE | `/bookings/{id}` | Cancel booking |
| GET | `/bookings/{id}/history` | Get reschedule history |

### 15.5 Payment Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/payments/create-order` | Create Razorpay order |
| POST | `/payments/verify` | Verify Razorpay payment |

### 15.6 Owner Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/owner/salon` | Get owner's salon |
| GET | `/owner/analytics` | Get analytics (revenue, bookings) |
| GET | `/owner/bookings` | List salon bookings |

### 15.7 Admin Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/admin/broadcast` | Send broadcast push (requires `ADMIN_API_TOKEN`) |
| GET | `/admin/broadcast` | List broadcast history |

### 15.8 Review Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/reviews` | Post review (after completed booking) |
| GET | `/reviews/{salon_id}` | List salon reviews |

### 15.9 Staff Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/staff` | List salon staff (owner) |
| POST | `/staff` | Create staff (owner) |
| PATCH | `/staff/{id}` | Update staff (owner) |
| DELETE | `/staff/{id}` | Delete staff (owner) |

### 15.10 Promotion Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/promotions/validate` | Validate promo code |
| GET | `/promotions` | List salon promos (owner) |
| POST | `/promotions` | Create promo (owner) |
| PATCH | `/promotions/{id}` | Update promo (owner) |
| DELETE | `/promotions/{id}` | Delete promo (owner) |

### 15.11 Request/Response Format

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer <JWT>
Idempotency-Key: <UUID>  (optional, for POST/PATCH/DELETE)
```

**Success Response (200/201):**
```json
{
  "data": { /* response object */ },
  "code": "success"
}
```

**Error Response (4xx/5xx):**
```json
{
  "code": "error_code",
  "message": "Human-readable error message",
  "details": { /* optional */ }
}
```

---

## 16. Deployment & Operations

### 16.1 Deployment Targets

| Service | Platform | Trigger | URL |
|---------|----------|---------|-----|
| Backend | Render | Push to `main` | `https://trimit-az5h.onrender.com` |
| Web | Vercel | Push to `main` | `https://trimit.online` |
| Mobile | Google Play | Manual build + upload | Play Store (com.trimit.app) |
| Database | Supabase | Manual migrations | Supabase dashboard |

### 16.2 Backend Deployment (Render)

**Environment Variables:**
```
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
ALLOWED_ORIGINS=https://trimit.online,https://localhost:3000
ADMIN_API_TOKEN=...
SENTRY_DSN=...
PYTHON_VERSION=3.11.9
```

**Deployment:**
1. Push to `main`
2. Render automatically deploys
3. Verify with `curl https://trimit-az5h.onrender.com/health`

### 16.3 Web Deployment (Vercel)

**Environment Variables:**
```
VITE_BACKEND_URL=https://trimit-az5h.onrender.com
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_SENTRY_DSN=...
```

**Deployment:**
1. Push to `main`
2. Vercel automatically deploys
3. Verify at `https://trimit.online`

### 16.4 Mobile Deployment (Google Play)

**Build:**
```bash
cd mobile
npm run build:aab:local  # Creates AAB for Play Store
```

**Upload:**
1. Open Google Play Console
2. Upload AAB to internal testing / staging / production
3. Follow Play Store review process

**Environment:**
- `.env` must have `EXPO_PUBLIC_API_URL=https://trimit-az5h.onrender.com`
- Build uses production profile (not preview)

### 16.5 Database Migrations (Supabase)

**Process:**
1. Write new migration file: `database/NN_description.sql`
2. Test locally on a copy of prod data
3. Open Supabase SQL Editor
4. Run migration in order
5. Verify with `SELECT * FROM pg_policies;` (for RLS)
6. Commit migration file to repo

**Never:**
- Edit an already-applied migration
- Run migrations out of order
- Skip migrations

### 16.6 Monitoring & Observability

**Backend:**
- Sentry captures all 5xx errors
- Render logs available in dashboard
- Health check: `GET /health`

**Web:**
- Sentry captures exceptions (when enabled)
- Vercel analytics available
- Browser console for client-side errors

**Mobile:**
- Sentry captures crashes
- Expo dashboard for build status
- Local logs via `console.log` (emoji-tagged)

### 16.7 Rollback Procedures

**Backend:**
1. Revert commit on `main`
2. Push to `main`
3. Render redeploys automatically
4. Verify with health check

**Web:**
1. Revert commit on `main`
2. Push to `main`
3. Vercel redeploys automatically
4. Verify at trimit.online

**Mobile:**
1. Build previous APK/AAB
2. Upload to Play Store internal testing
3. Promote to production after QA

**Database:**
1. Write a new migration that reverts the change
2. Apply via Supabase SQL Editor
3. Never delete or edit applied migrations

---

## 17. Known Issues & Roadmap

### 17.1 Open Issues (P0/P1)

See `docs/REMAINING_ISSUES.md` for the canonical list. Key items:

**Backend:**
- B1: Owner UPDATE RLS on bookings is too broad
- B2: Reschedule doesn't validate staff conflicts
- B4: No Razorpay webhook (v1 is cash-only)
- B5: httpx.AsyncClient created per call (no pooling)

**Mobile:**
- M1: Direct API calls in some view files (MVVM violation)
- M2: God components (BookingScreen 1838 lines)
- M3: No notification permission primer for Android 13+

**Web:**
- W1: No Sentry on web
- W2: No CSP header
- W3: No real-time refresh on customer "My Bookings"
- W4: No web push notifications for owners

**Database:**
- O1: No spatial index on salons (lat/lng)
- O4: Bookings UNIQUE doesn't prevent two users on same single-slot

### 17.2 Roadmap (Future)

- Customer UI redesign per Stitch spec
- Web push notifications
- Razorpay webhook + refunds
- Staff availability calendar
- Advanced analytics (owner)
- Loyalty program
- Multi-language support

---

## 18. How to Use This Document

### 18.1 For AI Tools (ChatGPT, Claude, Gemini)

**Recommended prompt:**

```
You are helping build TrimiT, a salon marketplace platform for India.
Read the attached MASTER_PROJECT_CONTEXT.md fully.

Key rules:
1. No API calls in UI files — use repositories + React Query hooks
2. Every network operation handles loading, error, success
3. No `any` in TypeScript
4. Backend is orchestration; reusable logic goes into services
5. New SQL = new migration; never edit applied migrations
6. RLS is the last line of defense
7. Real-time everywhere it matters

My task: [describe your task here]
```

### 18.2 For New Team Members

1. Read this document top-to-bottom
2. Read `/RULES.md` at the repo root
3. Read `CLAUDE.md` for agent guidance
4. Clone the repo and run locally:
   - Backend: `cd backend && uvicorn server:app --port 8001 --reload`
   - Mobile: `cd mobile && npm start`
   - Web: `cd frontend && npm start`
5. Explore the codebase following the file structure

### 18.3 For Code Reviews

- Check MVVM compliance (no direct API calls in views)
- Verify error handling (loading, error, success)
- Ensure TypeScript types (no `any`)
- Check RLS policies for new tables
- Verify idempotency on mutating endpoints
- Test on staging before production

### 18.4 For Debugging

**Mobile:**
- Check emoji-tagged console logs (📅 ⏰ 🚀 🎉)
- Use React Query DevTools
- Check Zustand store state
- Verify Realtime subscriptions

**Backend:**
- Check Sentry for errors
- Review Render logs
- Test endpoints with curl or Postman
- Check database RLS policies

**Web:**
- Check browser console
- Use React Query DevTools
- Check Zustand store state
- Verify API responses in Network tab

---

## Appendix: Quick Reference

### File Paths (Where to Start)

| Task | Start Here |
|------|------------|
| Change booking/slots | `backend/routers/bookings.py`, `mobile/src/screens/customer/BookingScreen.tsx` |
| Owner analytics | `backend/routers/owner.py`, `OwnerDashboardScreen.tsx` |
| Push notification | `backend/services/push_dispatch.py`, `mobile/src/lib/notifications.ts` |
| Navigation | `mobile/src/navigation/types.ts`, `index.tsx` |
| New mobile screen | Mirror under `mobile/src/screens/{customer,owner}/`, wire in stack |
| Database change | New `database/NN_name.sql` + RLS policies |
| Web page | `frontend/src/pages/`, `App.js` routes |
| Auth flow | `backend/routers/auth.py`, `mobile/src/screens/auth/` |

### Common Commands

```bash
# Backend
cd backend && uvicorn server:app --port 8001 --reload

# Mobile
cd mobile && npm start
cd mobile && npm run build:apk:local

# Web
cd frontend && npm start
cd frontend && npm run build

# Database
# Open Supabase SQL Editor and run migrations in order
```

### Key Contacts & Resources

- **Repo:** TrimiT monorepo (salon marketplace)
- **Maintainer:** Arqum Malik
- **Production:** Live on Google Play, trimit.online
- **Canonical Rules:** `/RULES.md` (read on every prompt)
- **Open Issues:** `docs/REMAINING_ISSUES.md`
- **Progress Log:** `docs/PROGRESS.md`

---

**End of MASTER_PROJECT_CONTEXT.md**

*This document is the single source of truth for the entire TrimiT project. Keep it updated as the codebase evolves. When sharing the project with AI tools or new team members, provide this document first.*

