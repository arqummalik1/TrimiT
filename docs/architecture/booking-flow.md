# TrimiT — Booking Flow (Current)

Last updated: 2026-07-04.

## Overview

Slot-based booking with **90-second holds**, **atomic create RPC**, optional **staff selection**, and **UPI manual payment** verification.

## Happy path (customer)

```
1. GET /salons/:id + services
2. GET /bookings/slots?salon_id&service_id&date
3. (Optional) GET /staff/available/... — pick stylist or "any staff"
4. POST /bookings/reserve  → reserve_slot_v1 RPC (hold ~90s)
5. POST /bookings/         → create_atomic_booking RPC (requires Idempotency-Key)
6. If UPI: POST /payments/upi/initiate → customer pays in UPI app
7. Owner/employee: POST /payments/upi/verify or reject
8. PATCH /bookings/:id/status → confirmed → in_service → completed
```

## Realtime slot invalidation

When another user books or holds a slot, clients subscribe to:

- `bookings` changes for `salon_id`
- `slot_holds` changes for `salon_id`

Must use **authenticated** Supabase client (JWT) so RLS delivers events.

## Slot availability logic

Computed server-side in `GET /bookings/slots`:

- Salon working hours + `accepting_bookings` / `closed_until` (migration 53)
- Existing bookings (pending, confirmed, in_service)
- Active slot holds (other users)
- Staff working hours / days off (if staff selected)
- `max_bookings_per_slot` / `allow_multiple_bookings_per_slot`

Fallback if RPC fails on salon list: Python filters `subscription_active`, `accepting_bookings`, closed windows.

## Atomic create (`create_atomic_booking`)

Migration **34** (14 params including `p_staff_id`, `p_any_staff`):

- Verifies `auth.uid() = p_user_id`
- Validates hold belongs to user (if holds enabled)
- Counts holds + bookings for capacity
- Applies promo via DB trigger / validate RPC
- Sets initial status: `pending` (UPI) or `confirmed` (cash, if auto_accept)

## Payment methods (salon)

Gated by `salons.upi_id` (not legacy `payment_methods` column):

| Method | When available |
|--------|----------------|
| `salon_cash` | Always |
| `upi` | Salon has `upi_id` set |

## Booking statuses

`pending` → `confirmed` → `in_service` → `completed`

Also: `cancelled`, `no_show`

Owner "reject" of pending booking → **`cancelled`** (not a separate `rejected` status).

UPI pending bookings can expire via cron (`expire_unverified_upi_payments`, migration 49).

## Owner / employee actions

| Action | Endpoint |
|--------|----------|
| Accept pending | PATCH status → `confirmed` |
| Reject pending | PATCH status → `cancelled` |
| Verify UPI | POST `/payments/upi/verify` |
| Reject UPI | POST `/payments/upi/reject` |
| Complete | PATCH status → `completed` (blocked until UPI verified) |

Employees (`role=employee`) have the same booking management access as owners for their linked salon.

## Reschedule

`PATCH /bookings/:id/reschedule` → `reschedule_booking_atomic` RPC (migration **56**):

- `auth.uid()` must match `p_user_id`
- Customer: own booking only
- Owner/employee: salon bookings only
- Re-validates staff availability and slot capacity

## Concurrency

- Holds prevent double-book during checkout window
- RPC uses row locks (`FOR UPDATE`) on hot paths
- Idempotency key on create prevents duplicate bookings on retry

## Client implementation reference

- **Mobile:** `BookingScreen.tsx` + `bookingRepository` + `bookingStore` (best reference)
- **Web:** `BookingPage.js` — uses authenticated realtime + direct API (repository migration pending)
