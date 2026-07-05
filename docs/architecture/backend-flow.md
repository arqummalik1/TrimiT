# TrimiT — Backend Flow (Current)

Last updated: 2026-07-04.

## Entry

- `server.py` — FastAPI app, CORS, Sentry scrubbing, router mount under `/api/v1`
- `config.py` — env settings (fail-fast on misconfig in production)

## Routers

| Prefix | Purpose |
|--------|---------|
| `/auth` | OTP, complete-profile, me, profile, push token |
| `/salons` | Public list (RPC `get_nearby_salons_v1`), CRUD, availability |
| `/bookings` | Slots, reserve, create (atomic RPC), status, reschedule |
| `/payments` | UPI initiate, verify, reject |
| `/owner` | Owner/employee salon, analytics, bank details |
| `/staff` | Staff CRUD, availability, **invite-app** |
| `/subscriptions` | Owner TrimiT Pro (Razorpay) |
| `/admin` | PIN auth, user block, grant subscription |
| `/serviceability` | Geofence check, waitlist |
| `/analytics` | Page views (best-effort) |

## Auth dependencies

- `get_current_user` — JWT + profile cache; blocks `is_blocked` / `deleted_at`
- `require_active_subscription` — owners + employees (employee checks **salon owner's** subscription)
- `assert_salon_manager` — owner OR linked employee for salon mutations

## Salon access (`services/salon_access.py`)

- **Owner** — `salons.owner_id = user.id`
- **Employee** — `staff.user_id = user.id` AND `app_access_status = active`

## Data access pattern

Most writes use **user JWT** for reads and **service role** for sensitive patches (booking status, payments) with Python-side authorization first. Migration **46** revokes direct `UPDATE` on bookings for `authenticated` — status changes go through backend + service role.

## Idempotency

- Infrastructure: `core/idempotency.py` (path-scoped keys, 24h TTL)
- Required: `POST /bookings/` (`@idempotency_required(required=True)`)
- Ad-hoc: UPI payment verify, some payment routes

## Key RPCs (Postgres)

| RPC | Called from | Auth |
|-----|-------------|------|
| `get_nearby_salons_v1` | GET /salons | Public |
| `reserve_slot_v1` | POST /bookings/reserve | `auth.uid() = p_user_id` |
| `create_atomic_booking` | POST /bookings/ | `auth.uid() = p_user_id` |
| `reschedule_booking_atomic` | PATCH reschedule | `auth.uid()` + role checks (migration 56) |
| `validate_promo_code` | bookings, promotions | SECURITY DEFINER |
| `get_available_staff` | staff routers | Public read |

## Errors

Structured envelope via `core/exceptions.py`:

```json
{ "success": false, "error": { "code": "...", "message": "...", "details": {} }, "request_id": "..." }
```

## Rate limiting

SlowAPI (`core/limiter.py`) on auth, bookings, payments, public endpoints.

## Cron / internal

- `POST /salons/internal/run-availability` — admin token (hmac.compare_digest)
- Subscription trial reminders, UPI expiry — pg_cron in SQL migrations

## Tests

- `pytest` + `MockSupabase` in `conftest.py` (monkeypatches `supabase.request`)
- Run: `cd backend && PYTHONPATH=. pytest -q`

## Not implemented / deferred

- PayU ledger tables (migration 48) — schema only, backend uses UPI-on-salon-VPA
- Admin user invite email — stub returns success without send
