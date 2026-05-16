# Launch Readiness Checklist

**Target:** MVP stable → Production → Play Store  
**Last updated:** 2026-05-16

---

## Go / No-Go matrix

| Gate | Status | Blocker? |
|------|--------|----------|
| Core booking (cash) works E2E | ✅ Pass | No |
| Core booking (Razorpay) works E2E | ❌ Fail | **Yes** |
| Auth mobile + web aligned | ⚠️ Partial | Soft |
| Rate limiting active | ❌ Fail | **Yes** |
| RLS protects customer data | ⚠️ Partial | Soft |
| Push on booking complete | ✅ Pass | No |
| Notification prefs ON/OFF | ✅ Pass (mobile) | No |
| Play AAB signed correctly | ❌ Fail | **Yes** |
| Privacy policy URL live | ⚠️ Domain split | Soft |
| Account deletion works | ⚠️ Unverified E2E | Soft |
| Data Safety form complete | ❌ Not started | **Yes** (Play) |
| Test credentials for reviewer | ❌ Not prepared | **Yes** (Play) |

**Recommendation:** **NO-GO** for public Play Store. **GO** for closed beta (cash-only, invited users) after C2 + C6 + C9.

---

## Pre-launch gates (must all pass)

### Security
- [ ] SlowAPI wired and tested on `/auth/login`
- [ ] `JWT_SECRET` required at startup (no unverified decode fallback)
- [ ] `create_atomic_booking` validates `auth.uid() = p_user_id`
- [ ] Anon EXECUTE revoked on sensitive RPCs
- [ ] Production CORS excludes localhost when `ENVIRONMENT=production`
- [ ] Web implements request signing OR signing disabled in prod
- [ ] PII removed from INFO logs

### Payments
- [ ] Real Razorpay orders created server-side
- [ ] `razorpay_order_id` stored on booking
- [ ] Verify checks booking ownership + amount
- [ ] Webhook endpoint for payment confirmation
- [ ] Pending bookings expire after 15 minutes

### Database
- [ ] Migration `25_slot_unique_index.sql` applied
- [ ] `cleanup_expired_holds` scheduled (pg_cron)
- [ ] Customer UPDATE policy on `bookings` (cancel)
- [ ] Re-run `07_check_rls_policies.sql`

### Mobile
- [ ] Upload keystore via `eas credentials`
- [ ] `versionCode` auto-increment
- [ ] Strip unused Android permissions
- [ ] R8 + shrinkResources enabled and tested
- [ ] Icons/splash assets present in repo or EAS secrets
- [ ] `EXPO_PUBLIC_API_SIGNING_SECRET` set in production
- [ ] `EXPO_PUBLIC_SENTRY_DSN` set
- [ ] Maps API key restricted (package + SHA-1)

### Web
- [ ] API signing implemented in `api.js`
- [ ] Fix `MyBookings.js` missing `Bell` import
- [ ] Wire `/notifications` routes or remove links
- [ ] `GENERATE_SOURCEMAP=false` on Vercel build
- [ ] Remove production console.log from `api.js`

### QA
- [ ] Full customer journey (discover → book → complete → review)
- [ ] Full owner journey (salon → services → accept → complete)
- [ ] Push received on booking complete (physical device)
- [ ] Prefs OFF suppresses push
- [ ] Account deletion E2E
- [ ] Password reset web + mobile forgot flow

### Play Console
- [ ] Data Safety form (see `PLAY_CONSOLE_CHECKLIST.md`)
- [ ] Content rating (IARC)
- [ ] Store listing assets (icon, feature graphic, screenshots)
- [ ] Privacy policy URL (single canonical domain)
- [ ] Account deletion URL in console
- [ ] Reviewer test accounts documented

---

## Beta launch (minimum viable)

Can ship when these pass:

1. Rate limits wired
2. Cash booking E2E verified
3. Mobile production build on internal track
4. Web signing fixed or disabled
5. Test user documentation for reviewers

---

## Production launch

Requires all pre-launch gates + Razorpay live keys + Play closed testing sign-off.

---

## Sign-off template

| Role | Name | Date | Approved |
|------|------|------|----------|
| Engineering | | | ☐ |
| QA | | | ☐ |
| Product | | | ☐ |
