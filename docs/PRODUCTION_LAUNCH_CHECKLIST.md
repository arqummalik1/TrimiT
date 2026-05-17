# Production launch checklist (Wave 0)

Complete these **before** promoting the production AAB on Play Console.

## Supabase Auth (email links)

- [ ] **Authentication → URL configuration → Redirect URLs** (all required):
  - `https://trimit.online/auth/email-confirmed`
  - `https://trimit.online/reset-password`
  - (production domain equivalents if different)
- [ ] **Site URL**: `https://trimit.online` (or production web URL)
- [ ] **Custom SMTP** recommended (Supabase default mailer ~2–4 emails/hour per project — causes missing reset/confirm emails)
- [ ] Redeploy **backend** + **frontend (Vercel)** after auth changes
- [ ] `PUBLIC_SITE_URL` / `REACT_APP_SUPABASE_*` env vars match the live project

## Backend

- [ ] Deploy latest `backend/` to Render (`ENVIRONMENT=production`, `GOOGLE_MAPS_API_KEY` set)
- [ ] Smoke: `POST /api/v1/bookings/reserve` and `POST /api/v1/bookings/` (authenticated)
- [ ] Smoke: `GET /api/v1/bookings/slots` returns **401** without `Authorization`
- [ ] Smoke: `POST /api/v1/bookings/` without prior reserve returns **409** `HOLD_REQUIRED`

## Database

- [ ] Run `database/07_check_rls_policies.sql` in Supabase SQL editor
- [ ] Verify anon cannot execute `create_atomic_booking` (QA #8)
- [ ] All live salons: `allow_multiple_bookings_per_slot = false` for v1

## Mobile build

```bash
cd mobile && npm run verify:env && npm run build:aab:local
```

- [ ] Install AAB/APK on physical Android 13+; app opens (no white screen)

## QA matrix (record PASS/FAIL in PROGRESS.md)

1. Concurrent reserve + book (single-booking salon)
2. Idempotency retry on `POST /bookings/`
3. Cold start ×20, no login flash
4. Owner foreground → one in-app alert
5. Cancel on device A → slots refresh on device B
6. Cash booking E2E → Bookings tab
7. Release AAB + verify:env
8. Anon cannot call `create_atomic_booking`

## Play Console (production track)

- [ ] Privacy policy URL live
- [ ] Data safety form (location, bookings, phone)
- [ ] Content rating, screenshots, store listing
- [ ] Flags: `EXPO_PUBLIC_ENABLE_ONLINE_PAY=false`, staff selection unset

## Post-launch (week 1)

- [ ] HIGH-04: migrate 12 screens off direct `lib/api` (incremental)
- [ ] MED-03: remove TypeScript `any` in staff/promo paths
