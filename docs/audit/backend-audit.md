# Backend Audit (FastAPI)

**Version:** 1.1.0  
**Deploy:** Render (`render.yaml`)  
**Entry:** `backend/server.py` (189 lines — bootstrap only)

---

## Architecture

```
server.py
├── Middleware: RequestID, Signature (HMAC), CORS
├── Exception handlers (structured JSON + request_id)
├── /health, /
└── /api/v1/*
    ├── auth.py
    ├── salons.py
    ├── bookings.py
    ├── payments.py
    ├── promotions.py
    ├── staff.py      ← BROKEN
    ├── owner.py
    ├── reviews.py
    └── uploads.py

services/
├── push_notifications.py
├── push_dispatch.py
├── push_preferences.py
├── booking_push.py
├── auth_errors.py
└── logger.py
```

**Assessment:** Good modular split post-refactor. Business logic still heavy in routers; acceptable for MVP.

---

## API inventory (security-relevant)

| Endpoint | Auth | Rate limit* | Notes |
|----------|------|-------------|-------|
| POST `/auth/signup` | Public | 15/min* | Email confirmation flow |
| POST `/auth/login` | Public | 10/min* | |
| POST `/auth/forgot-password` | Public | 3/hour* | |
| GET `/auth/me` | JWT | — | Profile + prefs |
| PATCH `/auth/notification-preferences` | JWT | — | |
| POST `/auth/push-token` | JWT | — | |
| DELETE `/auth/account` | JWT | 3/hour* | Service role deletes auth user |
| GET `/salons/` | Public | — | Haversine / RPC |
| GET `/bookings/slots` | Public/optional JWT | — | Service role reads |
| POST `/bookings/reserve` | JWT | 5/min* | `reserve_slot_v1` RPC |
| POST `/bookings/` | JWT | 10/min* | `create_atomic_booking` |
| PATCH `/bookings/{id}/status` | JWT | — | Role checks in Python |
| POST `/payments/create-order` | JWT | 5/min* | **MOCKED** |
| POST `/payments/verify` | JWT | 5/min* | HMAC verify only |
| POST `/staff/*` | JWT | Various* | **Runtime errors** |

\*Decorated but **not enforced** — limiter not wired.

---

## Middleware

### RequestIDMiddleware
- Adds correlation ID — good for support.

### SignatureMiddleware (`core/middleware.py`)
- Requires `X-Trimit-Timestamp` + `X-Trimit-Signature` on mutating methods.
- Bypassed for auth paths and `/health`.
- **Disabled when `API_SIGNING_SECRET` unset** — logs warning.
- Mobile signs via `lib/security.ts`; web does not.

### CORS
- `ALLOWED_ORIGINS` env + hardcoded localhost — risk in production with `allow_credentials=True`.

---

## Auth dependency (`dependencies/auth.py`)

1. Verify JWT locally (`JWT_SECRET`, HS256) when configured.
2. Fallback: Supabase `auth/v1/user`.
3. TTLCache profile (5 min, 1000 entries).
4. Auto-create `users` row via service role if missing.

**Issues:**
- Unverified JWT decode when secret missing/placeholder.
- `request.state.user` never set — per-user rate limits won't work.

---

## Booking engine

### Slot generation (`GET /bookings/slots`)
- 30-min windows from salon hours.
- Subtracts non-cancelled bookings + active holds.
- 5-minute past grace (timezone-aware).

### Reserve (`POST /bookings/reserve`)
- `reserve_slot_v1` RPC with `FOR SHARE`.
- Service-role fallback if RPC fails.

### Create (`POST /bookings/`)
- Optional hold check (not enforced for online pay).
- `create_atomic_booking` RPC — counts bookings, not holds.
- Sets `payment_status=pending` for Razorpay path.

### Gaps
- No partial UNIQUE on slot triple.
- Pending payments block slots indefinitely.
- `FOR SHARE` allows concurrent capacity passes.

---

## Payments

```python
# payments.py — current behavior
order_id = f"order_{uuid.uuid4().hex[:16]}"  # NOT Razorpay API
# verify: hmac only, patches any booking_id
```

**Required production flow:**
1. Create booking with `pending` OR hold-only until paid.
2. `razorpay.order.create(amount, receipt=booking_id)`.
3. Client checkout with returned `order_id`.
4. `verify` + webhook double-confirm.
5. Mark `paid`, trigger push.

---

## Push notifications

Flow: `booking_push.py` → `push_dispatch.py` → `push_preferences.should_send_push` → `PushNotificationService` → Expo API.

**Events covered:** booking created, status changes, reschedule (per `booking_push.py`).

**Gaps:**
- No Expo receipt polling (`DeviceNotRegistered` cleanup).
- No rich notification images (branding) in payload — add `icon` / `channelId` on Android.

---

## Error handling

- `core/exceptions.py` — structured errors with `request_id`.
- Some routes return raw Supabase error bodies.

---

## Logging & observability

- `logging.basicConfig(INFO)` — unstructured.
- `python-json-logger` in requirements — **unused**.
- Sentry initialized when `SENTRY_DSN` set — good.
- PII in salon/owner logs — fix before prod.

---

## Performance

| Issue | Impact | Fix |
|-------|--------|-----|
| Sync httpx per call in `async def` | Event loop blocking | `httpx.AsyncClient` pool |
| New client per request | Connection churn | Singleton client |
| Full-day booking fetch per slots | DB load | Cache / materialized view |
| All-salons Python filter | Memory | Use `get_nearby_salons_v1` only |
| Bloated `requirements.txt` | Cold start 30s+ | Trim unused packages |

---

## Render deployment (`render.yaml`)

- Verify plan supports worker count.
- Set `healthCheckPath: /health`.
- `gunicorn -w 2` on starter plan (not 4).
- `DEBUG=False` in production env.

---

## Recommendations (ordered)

1. Wire SlowAPI (15 min)
2. Fix payments (1 day)
3. Fix/disable staff router (2h)
4. Async Supabase client (4h)
5. Trim requirements.txt (30 min)
6. Pending booking sweeper (2h)
7. Structured JSON logging (2h)
