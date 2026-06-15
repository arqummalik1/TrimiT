# TrimiT HTTP API guide

This document is the single reference for how clients talk to the FastAPI backend. If something disagrees with code, treat **`backend/server.py`** (router mount) and **`backend/routers/*.py`** as source of truth.

## Versioning: one public API surface

- **All app traffic uses `/api/v1/...`.** There is no separate legacy `/api/...` product API in this repo; older docs or snippets that used `/api/` alone were misleading.
- **`GET /`** returns JSON metadata (name, version, pointers to route groups).
- **`GET /health`** is unversioned for load balancers and ops.

### Why it looked like “two APIs”

Historically some code built URLs as `host + '/api' + path` while other code used `host + '/api/v1' + path`, and one router (`staff`) mistakenly used a **nested** prefix (`/api/v1/staff` inside a router that was *already* mounted at `/api/v1`), which would have produced **`/api/v1/api/v1/staff`**. That is fixed: every sub-router uses a **short** prefix (`/staff`, `/auth`, …) and is mounted once under `APIRouter(prefix="/api/v1")` in `backend/server.py`.

### Mobile / web client convention

- **Base URL** ends with `/api/v1` (no trailing slash issues: use paths like `/salons`, not `salons`).
- **Request paths** are relative to that base, e.g. `GET /salons/?lat=…` → full URL `https://<host>/api/v1/salons/?lat=…`.
- Do **not** repeat `/api/v1` inside individual paths (would double the segment).

### Web (`frontend/`)

- **`REACT_APP_BACKEND_URL`** should be the **API origin without the version path**, e.g. `http://localhost:8001` or `https://your-render-service.onrender.com`.
- `frontend/src/lib/api.js` normalizes that to **`…/api/v1`** and all feature code uses the **same relative paths as mobile** (`/auth/login`, `/salons/`, …).

## Authentication

- Most routes expect **`Authorization: Bearer <Supabase access_token>`** after login.
- **Auth** routes (`/api/v1/auth/signup`, `/api/v1/auth/login`) use the body for credentials.

## Request security model

TrimiT does **not** use app-bundled request HMAC signing. A secret compiled into the mobile AAB or web bundle is recoverable and creates a false sense of security. Production protection is:

- TLS for transport security.
- Supabase JWT bearer auth for user identity and role/tenant checks.
- Backend authorization checks before every mutating operation.
- Supabase RLS as the last line of defense.
- Razorpay webhook signatures (`X-Razorpay-Signature`) for payment/subscription webhooks.

Do not reintroduce `X-Trimit-Signature` without an explicit server-issued nonce/session design.

## Route map (under `/api/v1`)

Below, paths are shown **after** `/api/v1`. Method + path + brief purpose.

### Auth — prefix `/auth`

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| POST | `/auth/signup` | No | Rate limited |
| POST | `/auth/login` | No | Rate limited; returns tokens + profile when present |
| GET | `/auth/me` | Yes | Current user |
| PATCH | `/auth/profile` | Yes | Update profile |
| POST | `/auth/push-token` | Yes | Save Expo push token |
| POST | `/auth/forgot-password` | No | Triggers Supabase recover email |
| POST | `/auth/validate-reset-token` | No | Body: `{ "token" }`; checks token via Supabase before reset form |
| POST | `/auth/reset-password` | No | Body: `{ "token", "password" }` |

### Salons — prefix `/salons`

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| GET | `/salons/` | No | Discovery: `lat`, `lng`, `radius`, `search`, `limit`, `offset`; uses RPC `get_nearby_salons_v1` with fallback |
| GET | `/salons/{salon_id}` | No | Detail + nested services/reviews |
| POST | `/salons/` | Yes | Owner creates salon |
| PATCH | `/salons/{salon_id}` | Yes | Owner updates salon |
| POST | `/salons/{salon_id}/services` | Yes | Owner creates service |
| PATCH | `/salons/{salon_id}/services/{service_id}` | Yes | Owner updates service |
| DELETE | `/salons/{salon_id}/services/{service_id}` | Yes | Owner deletes service |

### Bookings — prefix `/bookings`

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| GET | `/bookings/` | Yes | Customer: own bookings; owner: first salon’s bookings |
| GET | `/bookings/salon/{salon_id}` | Yes | Owner/staff-style listing for one salon |
| PATCH | `/bookings/{booking_id}/status` | Yes | Owner confirms/rejects; customer may set `cancelled` only |
| GET | `/bookings/slots` | No | Query: `salon_id`, `service_id`, `date` or `date_str`, optional `current_time` |
| POST | `/bookings/reserve` | Yes | Slot hold via RPC |
| POST | `/bookings/` | Yes | Create booking (idempotent); rate limited |
| PATCH | `/bookings/{booking_id}/reschedule` | Yes | Reschedule |
| GET | `/bookings/{booking_id}/reschedule-history` | Yes | History |

### Payments — prefix `/payments`

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| POST | `/payments/create-order` | Yes | Razorpay-shaped order payload |
| POST | `/payments/verify` | Yes | Signature verify + mark paid; idempotent |
| GET | `/payments/status` | Yes | Query: `order_id` |

### Promotions — prefix `/promotions`

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| POST | `/promotions/validate` | Yes | Validate code for checkout |
| GET | `/promotions/active` | Yes | Optional `salon_id` |
| POST | `/promotions/` | Yes | Owner creates salon promo |
| GET | `/promotions/owner` | Yes | Owner lists own promos |
| PATCH | `/promotions/{promo_id}` | Yes | Owner updates |
| DELETE | `/promotions/{promo_id}` | Yes | Soft-deactivate |
| GET | `/promotions/{promo_id}/stats` | Yes | Usage stats |

### Staff — prefix `/staff`

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| POST | `/staff` | Yes | Create staff |
| GET | `/staff/salon/{salon_id}` | Mixed | Public listing for salon; see router |
| GET | `/staff/{staff_id}` | Mixed | Detail |
| PATCH | `/staff/{staff_id}` | Yes | Update |
| DELETE | `/staff/{staff_id}` | Yes | Delete |
| POST | `/staff/services/assign` | Yes | Link service to staff |
| POST | `/staff/services/assign-bulk` | Yes | Bulk assign |
| DELETE | `/staff/services/{staff_service_id}` | Yes | Remove assignment |
| GET | `/staff/available/{salon_id}/{service_id}` | No | Query params: `booking_date`, `time_slot`; rate limited |
| POST | `/staff/check-availability` | No | Body: staff/service/date/time; rate limited |
| GET | `/staff/{staff_id}/stats` | Yes | Stats |
| GET | `/staff/salon/{salon_id}/performance` | Yes | Performance list |

### Owner — prefix `/owner`

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| GET | `/owner/salon` | Yes | Owner’s salon + services |
| GET | `/owner/analytics` | Yes | Query: `period` (`today` \| `week` \| `month` \| …) |

### Reviews — prefix `/reviews`

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| POST | `/reviews/` | Yes | Submit review after completed booking |

## Supabase / RLS

The backend proxies to Supabase REST/RPC with either the **user JWT** or **service role** for admin-only operations. Row Level Security applies on user-scoped calls. See `database/` migrations for policies.

## Changing this API

1. Add or modify routes in `backend/routers/<domain>.py` using a **single segment prefix** (e.g. `/foo`), not `/api/v1/foo`.
2. Ensure `v1_router.include_router(...)` in `backend/server.py`.
3. Update **this file** and the mobile `apiClient` only if base path or signing rules change.
