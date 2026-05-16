# Cash-only v1 — E2E test script (physical device)

Use an **EAS preview or production** build (not Expo Go for push).

## Prerequisites

- Migrations 24–27 applied on production Supabase
- Backend deployed with `staff_availability` router
- Two test accounts: **customer** and **owner** (owner has salon + at least one service)

## Test 1 — Customer cash booking

1. Log in as customer
2. Grant location → open a salon → select service
3. Pick date + available slot → confirm **Cash at Salon** only (no online option)
4. Confirm booking → success screen
5. Open **Bookings** tab → booking appears as pending/confirmed

**Pass:** Booking created; no navigation to Payment screen.

## Test 2 — Owner flow + push

1. On owner device (or same device after logout), log in as owner
2. New booking appears on Bookings / Dashboard
3. Accept → Complete booking
4. On customer device: push notification received (prefs ON)

**Pass:** Status updates; customer push on complete.

## Test 3 — Account deletion (smoke)

1. Settings → Delete account (or Profile)
2. Confirm → logged out
3. Cannot log in with same credentials

**Pass:** Account removed per product policy.

## Test 4 — Concurrent slot (optional)

1. Two customers attempt same slot within 30s
2. Second booking should fail with slot conflict

**Pass:** Only one active booking per slot (migration 25 index).

## Sign-off

| Tester | Date | Build (EAS id) | Pass |
|--------|------|----------------|------|
| | | | |
