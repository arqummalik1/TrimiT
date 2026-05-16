# Launch Readiness Checklist

**Target:** MVP stable → Production → Play Store  
**Last updated:** 2026-05-16 (post audit remediation)

---

## Audit remediation status (code complete)

| Audit ID | Fix | Status |
|----------|-----|--------|
| B2/B3/B4 | `expo-build-properties` R8/shrink + `withAndroidPermissions` plugin | Code done — verify on EAS build |
| B1/B5 | Upload keystore + Maps SHA-1 | **Ops** — see `docs/EAS_PLAY_STORE_OPS.md` |
| C2/BH5 | Removed HMAC `SignatureMiddleware` + mobile signing | Done |
| C3/C4 | Sentry EAS env + `runtimeVersion` policy | Done |
| H6 | Replaced `expo-av` with `expo-audio` | Done |
| H1 | Babel `transform-remove-console` in production | Done |
| H5 | Razorpay WebView `originWhitelist` | Done |
| BC1 | SlowAPI wired in `server.py` | Done |
| BC3 | Real Razorpay `order.create` + persist `razorpay_order_id` | Done |
| BC4 | pg_cron template in migration 25 | SQL ready — enable in Supabase |
| BC5 | `assert_salon_owner` service-role checks | Done |
| BC6/DC1 | `FOR UPDATE` RPC + partial unique index migration 25 | Done |
| BC2 | Staff router unregistered until rewrite | Done |
| BC7/BC8 | PII logs demoted; JWT required in production | Done |
| BH1/BH3/BH4/BH8/BH10 | CORS, uploads cap, idempotency, render.yaml, list limit | Done |
| BH6/BH7 | Trimmed requirements; deleted `notifications.py` (prior) | Done |
| DC2/DH2/DH3 | `MIGRATION_ORDER.md`, migrations 25/26 | Done |

---

## Go / No-Go matrix

| Gate | Status | Blocker? |
|------|--------|----------|
| Core booking (cash) works E2E | Verify on device | Soft |
| Core booking (Razorpay) works E2E | Code fixed — needs sandbox test | **Yes** until verified |
| Rate limiting active | Done | No |
| Play AAB signed correctly | **Ops** — `eas credentials` | **Yes** |
| Migrations 24–26 applied | **Ops** — Supabase SQL | **Yes** |
| Data Safety form complete | **Ops** — Play Console | **Yes** (Play) |
| Test credentials for reviewer | Documented in `PLAY_CONSOLE_CHECKLIST.md` | Create accounts |

**Recommendation:** **NO-GO** for public Play until EAS production build + Razorpay sandbox E2E + migrations applied. **GO** for internal track after ops steps.

---

## Pre-launch gates (must all pass)

### Security
- [x] SlowAPI wired in `server.py`
- [x] `JWT_SECRET` required in production (`get_current_user`)
- [x] Production CORS excludes localhost
- [x] Request signing removed (TLS + JWT only)
- [x] PII demoted from INFO logs (salons, owner)

### Payments
- [x] Real Razorpay orders created server-side
- [x] `razorpay_order_id` column + persistence (migration 25)
- [x] Verify checks booking ownership + order id match
- [ ] Pending bookings expire after 15 minutes (enable pg_cron in Supabase)
- [ ] Razorpay sandbox E2E on physical device

### Database
- [ ] Migration `24`, `25`, `26` applied in production
- [ ] Redeploy `create_atomic_booking` RPC (`FOR UPDATE`)
- [ ] Re-run `07_check_rls_policies.sql`

### Mobile
- [ ] Upload keystore via `eas credentials`
- [x] `versionCode` auto-increment (`eas.json`)
- [x] Strip unused Android permissions (config plugin)
- [x] R8 + shrinkResources (`expo-build-properties`)
- [x] `EXPO_PUBLIC_SENTRY_DSN` in EAS production env
- [ ] Maps API key restricted (package + SHA-1)

### Play Console
- [ ] Data Safety form
- [ ] Reviewer test accounts created
- [ ] Internal track AAB + pre-launch report

See also: `docs/PLAY_CONSOLE_CHECKLIST.md`, `docs/EAS_PLAY_STORE_OPS.md`, `docs/database/MIGRATION_ORDER.md`.

---

## Remaining edge cases

- **Expo Go:** Remote push unreliable; use EAS builds for push QA.
- **Single `push_token` per user:** Last device wins.
- **Staff API:** `/api/v1/staff/*` disabled until router rewrite.
- **CRA EOL:** Web migration to Vite deferred post-launch.
- **Partial unique index:** May fail apply if duplicate active bookings exist — clean data first.
