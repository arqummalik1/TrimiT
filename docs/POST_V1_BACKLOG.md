# Post–v1.0 backlog (deferred)

Items intentionally **not** in Play Store v1 (cash-only). Schedule for v1.1+.

## v1.1 — Payments

- [ ] Set `EXPO_PUBLIC_ENABLE_ONLINE_PAY=true` in EAS production
- [ ] Razorpay sandbox E2E on device
- [ ] Enable pg_cron job in [`database/25_booking_integrity_and_payments.sql`](../database/25_booking_integrity_and_payments.sql)
- [ ] Optional Razorpay webhook endpoint

## Security

- [ ] Migration: `REVOKE EXECUTE` on `create_atomic_booking`, `reserve_slot_v1` from `anon`
- [ ] Add `auth.uid() = p_user_id` checks inside SECURITY DEFINER RPCs
- [ ] Enable Supabase leaked-password protection

## Staff

- [ ] Rewrite [`backend/routers/staff.py`](../backend/routers/staff.py) to use `supabase.request`
- [ ] Re-enable full `/api/v1/staff/*` CRUD on mobile owner screens

## Web

- [ ] Razorpay checkout
- [ ] Wire `/notifications` routes in `App.js`
- [ ] Mobile nav drawer (`<md` breakpoints)
- [ ] Supabase `setAuth` for realtime on web
- [ ] CRA → Vite migration

## Quality

- [ ] MVVM data hooks for customer screens
- [ ] Split `BookingScreen.tsx`
- [ ] Maestro / Detox E2E
- [ ] Expo push receipt cleanup (stale tokens)
- [ ] Push tap → booking detail by `bookingId`
- [ ] Respect `notify_reminders` before local schedule

## Growth

- [ ] iOS App Store
- [ ] Analytics (replace stub)
- [ ] Map view on web + mobile polish
- [ ] Email notifications
