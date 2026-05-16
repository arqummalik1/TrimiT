# TrimiT — Production Readiness & Play Store Pre-Submission Audit

**Audit date:** 2026-05-16
**Scope:** Mobile (Expo/RN), Backend (FastAPI on Render), Web (CRA on Vercel), Database (Supabase Postgres), Legal/Compliance assets.
**Target releases:** Google Play Store (mobile AAB), production backend on Render, web portal on Vercel.

> **TL;DR — Submission status:** **NOT READY.** There are **5 Play Store blockers** in the mobile build, **3 critical security/payment defects** in the backend, **1 Razorpay implementation flaw that will fail real payments**, and a handful of compliance polish items. Most fixes are 1–4 hours each; the largest is rewiring Razorpay order creation server-side. Realistically, **2–4 engineering days** to a submittable build if work starts immediately.

---

## 0. Verdict Matrix

| Layer | Production-ready? | Play-Store-ready? | Top blocker |
|---|---|---|---|
| Mobile (Expo Android) | ⚠️ Partial | ❌ No | Debug keystore signing, R8/shrink disabled, over-broad permissions |
| Backend (FastAPI) | ❌ No | n/a | Razorpay order creation is mocked; rate limiter wired but inert; payment flow exploitable |
| Web (CRA) | ⚠️ Partial | n/a | CRA (`react-scripts 5`) is EOL; Supabase anon URL/key in `env.example` is a placeholder |
| Database (Supabase) | ⚠️ Partial | n/a | Migration numbering collisions (two `03_`, `15_`, `16_`); no enforcing UNIQUE on `(salon_id, booking_date, time_slot)` |
| Legal (Privacy/Terms/Contact) | ✅ Substantively complete | ✅ Acceptable | Hosted under `trimi-t.vercel.app`, not `trimit.app` referenced in commits — pick one and lock it before Data Safety form |

---

## 1. Mobile — Google Play Store Submission Audit

### 🚫 BLOCKERS (must fix before upload)

| # | Finding | File / Evidence | Fix |
|---|---|---|---|
| **B1** | App is signed with the **debug keystore**. EAS profile points at default debug signing; no upload keystore configured via `eas credentials`. | `mobile/eas.json` (production profile), `mobile/android/app/build.gradle` signingConfigs | Run `eas credentials` → "Set up a new keystore". Back up keystore + passwords off-machine. AAB signed with debug key is rejected by Play. |
| **B2** | **R8 / ProGuard minification & resource shrinking disabled.** `enableProguardInReleaseBuilds=false`, `enableShrinkResources=false` (Expo defaults). Result: ~80 MB AAB with all Hermes + RN code unobfuscated. | `mobile/android/gradle.properties`, `mobile/android/app/proguard-rules.pro` | Set `enableProguardInReleaseBuilds=true`, `enableShrinkResources=true`. Test a release build end-to-end; some RN libraries (Razorpay WebView, Reanimated) need keep-rules. |
| **B3** | **Over-broad permissions in merged AndroidManifest**: `SYSTEM_ALERT_WINDOW`, `RECORD_AUDIO`, `USE_FINGERPRINT`, `USE_BIOMETRIC`, `READ_EXTERNAL_STORAGE` (legacy). Each triggers a Data Safety form question and possible policy review. None are used by your code. | `mobile/android/app/src/main/AndroidManifest.xml` | Add an `expo-build-properties` plugin in `app.config.js` with `android.permissions: ["INTERNET","ACCESS_FINE_LOCATION","ACCESS_COARSE_LOCATION","CAMERA","POST_NOTIFICATIONS","VIBRATE"]` and a `removePermissions: [...]` block to strip the rest, or write a config plugin that rewrites the manifest. |
| **B4** | Invalid permission string `<uses-permission android:name="NOTIFICATIONS"/>` (no such constant). Play Store linter will flag. | `mobile/android/app/src/main/AndroidManifest.xml` | Use `android.permission.POST_NOTIFICATIONS` (Android 13+). Already added — remove the bogus one. |
| **B5** | **Google Maps API key is unrestricted** (or restriction unverified). If the key is shipped in the AAB without package + SHA-1 fingerprint restriction in GCP, anyone can extract it and rack up your billing. | `mobile/app.config.js` `android.config.googleMaps.apiKey`, `mobile/.env` | In GCP Console → Credentials → restrict to Android apps with package `com.audentix.trimit` + the SHA-1 from your **upload** keystore (and the **Play App Signing** SHA-1, available after first internal-track upload). |

### 🔴 CRITICAL

- **C1.** `versionCode` is static / hand-edited. Play rejects re-uploads with the same code. Add `versionCode: parseInt(process.env.BUILD_NUMBER ?? "1")` and bump on each build, or use `eas.json` `autoIncrement: true`.
- **C2.** Client ships an HMAC signing secret for `X-Trimit-Signature` (request signing). Bundled secrets are recoverable from an AAB — they are not "secret". Either remove the signature middleware entirely (rely on TLS + Supabase JWT, which is what protects you) or move signing to a backend-issued ephemeral nonce.
- **C3.** Sentry DSN missing from `eas.json` production env — crashes go nowhere. Add `EXPO_PUBLIC_SENTRY_DSN` to the `production` build profile env.
- **C4.** Inconsistent OTA/updates metadata between `app.config.js` and `eas.json` runtime version policy. Pin `runtimeVersion: { policy: "appVersion" }` to avoid bricked OTA pushes.
- **C5.** No build-number injection in CI. Manual versionCode bumps will be forgotten.
- **C6.** Secure-token storage (`expo-secure-store`) usage unverified across all auth paths — confirm Supabase session + refresh token are stored there, not AsyncStorage.

### 🟠 HIGH

- **H1.** 77 `console.log` calls remaining in production source (including in payment/booking paths). Babel-strip in production: add `react-native-clean-console` or a `transform-remove-console` Babel plugin to `babel.config.js` under the `production` env.
- **H2.** Analytics module (`mobile/src/lib/analytics.ts`) is a stub — no events recorded. Either implement (Amplitude, PostHog) or remove from Data Safety form to avoid misrepresentation.
- **H3.** Legal/help URLs in `mobile/src/legal/content.ts` and `app.config.js` point at `trimi-t.vercel.app`, but `EXPO_PUBLIC_PUBLIC_SITE_URL` is unset. Resolve the final domain (`trimit.app` per recent commit vs current Vercel URL) and pin it in EAS production env. Play Console privacy URL must be reachable and stable.
- **H4.** `android:enableOnBackInvokedCallback` not set — predictive back UX disabled. Set `true` in manifest.
- **H5.** Razorpay WebView lacks origin allow-list — the WebView allows arbitrary navigation. Add `originWhitelist={['https://api.razorpay.com', 'https://checkout.razorpay.com']}`.
- **H6.** `RECORD_AUDIO` permission is pulled in transitively by `expo-av` which appears unused. Remove `expo-av` from `package.json`.
- **H7.** SDK versions: Expo 54 / RN 0.81 / React 19 — bleeding-edge stack. Confirm all native libs (Reanimated 3, Razorpay WebView, react-native-map-clustering) have RN 0.81 compatible releases pinned, not `latest`.

### 🟡 MEDIUM

- No `google-services.json` referenced in `app.config.js` — Firebase Cloud Messaging not wired; you use Expo Push, which is fine, but means iOS rich notifications and Android channel customization rely on Expo's relay. Document this choice.
- Splash assets may not meet adaptive icon spec (108×108 dp foreground at 432×432 px). Verify `mobile/assets/`.
- Deprecated `Constants.isDevice` usage (`expo-constants` v17+ deprecated this).
- 24 `: any` / `as any` casts in TypeScript violate the CLAUDE.md "no any" invariant.
- Stale `mobile/error.log` at app root — should be gitignored.
- Large unused deps: `crypto-js`, `base-64`, `react-native-web`, `react-dom` (web target not used in mobile). Trim to reduce AAB size.
- `reactNativeArchitectures` includes `x86`, `x86_64` — fine for AAB, but you can drop to `arm64-v8a, armeabi-v7a` to cut intermediate build time.
- No automated accessibility audit (`accessibilityLabel` coverage). Play's pre-launch report will surface low contrast / missing labels.
- No OTA update channel configured for staged rollouts.

### 🟢 LOW

- Sentry init uses `tracesSampleRate: 0.2` — appropriate.
- Query cache `staleTime: 1h` is aggressive for live marketplace data; ensure booking/slot queries override per-query (most already do via `useRealtimeBookings`).
- `react-native-webview` is acceptable for Razorpay checkout.
- `useLegacyPackaging=false` correctly set.

---

## 2. Backend (FastAPI / Render) Audit

> **Correction to CLAUDE.md**: `server.py` is **189 lines** (a bootstrap), not 54k. Routing lives in `backend/routers/{auth,bookings,salons,payments,promotions,owner,reviews,staff,uploads}.py`. Please update CLAUDE.md.

### 🔴 CRITICAL

| # | Finding | File / Evidence | Fix |
|---|---|---|---|
| **BC1** | **Rate limiter is decorated but never wired.** `slowapi.Limiter` is created and 23 endpoints (login, signup, booking, payment) carry `@limiter.limit(...)` decorators, but `server.py` never registers `app.state.limiter`, `SlowAPIMiddleware`, or the exception handler. Decorators are silent no-ops. **Login is wide open to credential stuffing.** | `backend/core/limiter.py:13`, `backend/server.py` | Add: `app.state.limiter = limiter; app.add_middleware(SlowAPIMiddleware); app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)`. Also set `default_limits=["120/minute"]`. |
| **BC2** | **`routers/staff.py` is dead at runtime.** It imports `from core.supabase import supabase` (which is an httpx wrapper) and then calls `.table(...).select(...).execute()` (the supabase-py SDK API). Every `/api/v1/staff/*` route raises `AttributeError`. | `backend/routers/staff.py:21, 49, 61, 89, 138, 193, 219, 246, 264, 289, 320, 344, 370, 389, 410, 535, 544, 553, 561, 590, 599` | Rewrite to use the project's `supabase.request(...)` httpx wrapper, OR instantiate a real `supabase.Client` (already in requirements) and wrap blocking calls with `run_in_threadpool`. |
| **BC3** | **Razorpay order creation is mocked.** Server generates `order_id = f"order_{uuid4().hex[:16]}"` locally instead of calling `razorpay.Client().order.create(...)`. Result: (a) real Razorpay payments cannot be verified because the order doesn't exist on Razorpay's side, OR (b) signature verification logic happens to match a client-crafted triplet → **forgeable payment confirmations**. | `backend/routers/payments.py:30, 48-55` | Use `razorpay_client.order.create({"amount":..,"currency":"INR","receipt":booking_id,"notes":{...}})`. Persist the returned `id` on the booking row at create-time. Pass that `order_id` to the mobile checkout. Verify webhook signatures too (separate endpoint). |
| **BC4** | **Bookings are committed BEFORE payment verification with `payment_status=pending`**, and there is no sweeper to expire unpaid pending bookings. Combined with the slot generator counting any `status != 'cancelled'` row as taken, a malicious or abandoned client can hold all of a salon's slots indefinitely. | `backend/routers/bookings.py:642`, `backend/database/booking_rpc.sql:42`, `backend/routers/payments.py:18` | Either (a) only create the booking row in the `verify_payment` handler after signature validation, using the `slot_holds` table during checkout, or (b) add a Postgres `pg_cron` job that sets `status='cancelled'` for `payment_status='pending' AND payment_method='razorpay' AND created_at < now() - interval '15 minutes'`. |
| **BC5** | **Salon ownership checks called as anon, not authenticated.** Endpoints like `PATCH /salons/{id}`, `DELETE /salons/{id}`, promo CRUD all fetch `owner_id` via `supabase.request("GET", …)` without `token=` or `service_role=True`, hitting PostgREST anonymously. Works today because RLS allows public reads of salons, but (a) leaks `owner_id` linkage publicly and (b) if RLS is ever tightened, ownership checks silently fail-open. | `backend/routers/salons.py:207, 218, 254, 282`, `backend/routers/promotions.py:117, 239, 298` | Use `service_role=True` for ownership lookups, then enforce `owner_id == current_user.id` in Python. |
| **BC6** | **Atomic booking RPC uses `FOR SHARE` instead of `FOR UPDATE`.** Two concurrent callers can both pass the capacity check and both insert. The CLAUDE.md "Final Guard" claim relies on an enforcing UNIQUE index that **does not exist** — migration 08 only adds the `max_bookings_per_slot` column with no partial unique index on `(salon_id, booking_date, time_slot)`. | `backend/database/booking_rpc.sql:27-31`, `database/08_add_max_bookings_per_slot.sql` | Change to `FOR UPDATE`. Add `CREATE UNIQUE INDEX CONCURRENTLY uq_bookings_slot ON public.bookings (salon_id, booking_date, time_slot) WHERE status <> 'cancelled';` in a new migration `25_*.sql`. |
| **BC7** | **PII leaked to logs at INFO**: full salon rows, full Supabase response bodies, owner emails. Render's log aggregator persists these. | `backend/routers/salons.py:173, 178`, `backend/routers/owner.py:32` | Demote to `DEBUG` and gate with `if settings.ENVIRONMENT != "production"`. Audit all `logger.info(...)` calls for PII. |
| **BC8** | **JWT signature verification falls back to unverified decode** when `JWT_SECRET` is missing or equals a placeholder. Limits the immediate blast radius but is a fail-open pattern. | `backend/dependencies/auth.py:43-49` | Remove the fallback. Make `JWT_SECRET` required in `config.py`, raise on startup. |

### 🟠 HIGH

- **BH1.** `CORS allow_origins` always extends with `http://localhost:*` even in production, combined with `allow_credentials=True`. A malicious site running on the victim's localhost can hit prod with the Bearer token. Gate localhost origins on `ENVIRONMENT != "production"`. (`backend/server.py:97-118`)
- **BH2.** `GET /api/v1/salons/{id}/slots` uses `service_role=True` while being a fully public endpoint. Functional today, but couples a public surface to RLS bypass — a future field-list change could leak `slot_holds.user_id`. Replace with a SECURITY DEFINER RPC that returns occupancy only.
- **BH3.** `POST /uploads` reads the entire file into memory with no size cap, and validates MIME by client-supplied `content_type.startswith("image/")`. 500 MB upload → OOM on Render's 512 MB worker. Add size check (5 MB cap) and Pillow body validation.
- **BH4.** `Idempotency-Key` decorator silently no-ops if header missing; cache key doesn't include `request_path`, so the same key can replay across endpoints. Enforce required header on `POST /payments/verify` and `POST /bookings`; filter cache by path.
- **BH5.** `SignatureMiddleware` is fail-open when `API_SIGNING_SECRET` is unset. Require at startup in production. Also: this whole feature is undermined by the secret being bundled into the mobile app (see C2). Recommend dropping the signing scheme.
- **BH6.** `requirements.txt` carries unused, large, and CVE-prone packages: `python-jose` (CVE-2024-33664/33663), `passlib`, `bcrypt`, `pandas`, `numpy`, `tqdm`, `pillow`, `openai`, `google-generativeai`, `google-genai`, `litellm`, `stripe`. None are imported. Trim aggressively — speeds Render cold start, shrinks image, reduces attack surface.
- **BH7.** **Two parallel push-notification modules** with divergent semantics (`services/notifications.py` vs `services/push_notifications.py`). Only `push_notifications` is imported. Delete `notifications.py`. Neither handles Expo's push **receipts** — `DeviceNotRegistered` tokens never get cleaned up.
- **BH8.** **Render `plan: free` + `gunicorn -w 4 --log-level debug`** is incoherent. 512 MB plan cannot host 4 workers (especially with the bloated requirements). Switch to `starter` plan or drop to `-w 2`, change log level to `info`, set `healthCheckPath: /health` in `render.yaml`.
- **BH9.** Profile auto-create on every orphaned-JWT request uses service role with no per-user cooldown — a fresh wave of JWTs (leaked anon key abuse) could hammer the write path.
- **BH10.** Default unbounded `limit` on list endpoints (`GET /salons?limit=...`). Cap at 100.

### 🟡 MEDIUM

- `DEBUG=True` default in `Settings`. Set `False`; rely on env to flip in dev.
- **Migration sprawl**: `backend/database/` holds 3 SQL files, `database/` at repo root holds 26. Migration numbering collides (two `03_*`, two `15_*`, two `16_*`). Order of application is ambiguous. Consolidate into a single directory and rename to a strict timestamp scheme `20260516_001_*.sql`. Document applied state in a `schema_migrations` table.
- No `pytest` harness configured beyond `backend_test.py` (integration). Add real unit tests for the booking engine, slot generator, and Razorpay signature paths.
- No structured request logs (`X-Request-ID` correlated). `python-json-logger` is in requirements but unused.
- No Sentry init verified in backend startup.
- Sync Supabase REST calls inside `async def` block the event loop. Wrap with `httpx.AsyncClient`.

### 🟢 LOW

- API versioning at `/api/v1/` is consistent.
- `/health` exists but is not referenced in `render.yaml`.

---

## 3. Web Frontend (CRA) Audit

### 🔴 CRITICAL

- **WC1.** `react-scripts 5.0.1` is **end-of-life**. Facebook deprecated CRA. Webpack 5 polyfills are missing, security advisories on transitive deps accumulate. Plan migration to **Vite** (1–2 days), or accept maintenance debt.
- **WC2.** `env.example` shows `REACT_APP_SUPABASE_URL=https://your-project.supabase.co` placeholder — make sure your `.env.production.local` (or Vercel env vars) are set to real values and that **only anon key** (never service role) is in any `REACT_APP_*`. CRA inlines these into the JS bundle.

### 🟠 HIGH

- **WH1.** Domain inconsistency: `env.example` uses `trimi-t.vercel.app`; recent commits reference `trimit.app`. Pick one before submitting Data Safety (privacy URL must be stable). Update `mobile/app.config.js`, `shared/legal/contact.md`, `backend/.env PUBLIC_SITE_URL`.
- **WH2.** `vercel.json` rewrites everything to `/index.html`. Make sure `/privacy`, `/terms`, `/contact` are crawlable (set explicit routes or sitemap.xml; Play Console's privacy URL verifier should get a 200).
- **WH3.** Source maps published in production (CRA default). Run `GENERATE_SOURCEMAP=false npm run build` for prod or upload them to Sentry only.

### 🟡 MEDIUM

- React 19 + `react-router-dom` 7 + `react-day-picker` 9 — all very new; confirm peer-dep compatibility. Lock file present.
- No Lighthouse / CI accessibility check.
- No SEO meta on legal pages (Play Console doesn't care, but link previews do).

### 🟢 LOW

- Tailwind setup is standard; Radix UI is a good a11y baseline.
- TanStack Query 5 + Zustand match the mobile stack — good consistency.

---

## 4. Database (Supabase) Audit

### 🔴 CRITICAL

- **DC1.** No enforcing UNIQUE on `(salon_id, booking_date, time_slot) WHERE status <> 'cancelled'`. Combined with `FOR SHARE` in the RPC, double-booking is racy. (Same as BC6.) Add the partial unique index.
- **DC2.** Migration numbering **collisions**: `03_fix_schema_mismatch.sql` vs `03_setup_storage.sql`; `15_reschedule_atomic_time_compare.sql` vs `15_staff_selection.sql`; `16_fix_staff_availability.sql` vs `16_reschedule_remove_booking_updated_at.sql`. Apply order is ambiguous — different environments may diverge silently.

### 🟠 HIGH

- **DH1.** `RUN_THIS_FIX.sql` at repo root is an ad-hoc destructive script. Move into `database/` with a number, or delete after confirming it's been applied.
- **DH2.** RLS audit (`07_check_rls_policies.sql`) needs to be re-run after adding `slot_holds`, `push_tokens`, `idempotency_keys`, `promo_codes`, `user_notification_preferences`. Confirm every authenticated-writable table has a policy.
- **DH3.** `slot_holds` has no UNIQUE constraint either — same race risk.
- **DH4.** Supabase **point-in-time recovery (PITR)** must be enabled at the project level (paid tier). Document this in `DEPLOYMENT_CHECKLIST.md` as a verification step.

### 🟡 MEDIUM

- Verify indexes on `bookings.user_id`, `bookings.salon_id`, `bookings.booking_date`, `salons.owner_id`, `services.salon_id`, `push_tokens.user_id`.
- Realtime is enabled on `bookings` (migrations 05/06). Ensure replication slot retention does not balloon — Supabase logs warn if slot lag > 1 GB.
- `user_notification_preferences` (migration 24): confirm Data Safety form lists the categories.

### 🟢 LOW

- Schema uses `gen_random_uuid()`, `TIMESTAMPTZ`, FK `ON DELETE CASCADE` consistently — good hygiene.
- RLS is `ENABLE`d on `slot_holds` with sensible "own rows only" policies.

---

## 5. Play Store Compliance — Pre-Submission Checklist

Mapped to the questions Play Console actually asks you.

### 5.1 App content

| Item | Status | Notes |
|---|---|---|
| Privacy policy URL | ⚠️ Pick a domain | Currently both `trimi-t.vercel.app/privacy` and `trimit.app` referenced. Choose one, ensure HTTPS, ensure 200. |
| App access (test credentials) | ❌ TODO | Provide a customer + owner login for Play reviewer. Use throwaway emails. |
| Ads | ✅ "No ads" | Confirm no AdMob initialized. |
| Content rating (IARC) | ❌ TODO | Re-fill; expect PEGI 3 / Everyone given content. |
| Target audience | ✅ 18+ (per Terms §1) | Confirm checkbox. Add age gate at signup if not present. |
| News app | ✅ No | |
| COVID-19 contact tracing | ✅ No | |
| Data safety | ❌ TODO | See 5.2. |
| Government app | ✅ No | |
| Financial features | ⚠️ Maybe | Razorpay payments may require this section depending on flow — declare as "payments processed by third party". |

### 5.2 Data Safety form (Play Console)

Based on what the code actually collects:

| Data type | Collected? | Shared? | Encrypted in transit? | User can request deletion? | Optional? |
|---|---|---|---|---|---|
| Email address | Yes | No | Yes (HTTPS) | Yes | No |
| Name | Yes | With salons on booking | Yes | Yes | No |
| Phone number | Yes | With salons on booking | Yes | Yes | No |
| Password | Yes (hashed by Supabase Auth) | No | Yes | Yes | No |
| Photos (profile, salon images) | Yes | Publicly visible salon photos | Yes | Yes | Yes |
| Precise location | Yes (foreground only) | No (Google Maps used to render) | Yes | Yes | Yes |
| Approximate location | Yes | No | Yes | Yes | Yes |
| Purchase history | Yes (booking history) | With salons | Yes | Yes | No |
| Payment info | Processed by Razorpay; we store `payment_status`, `payment_id`, no PAN | Razorpay | Yes | Yes | No |
| App interactions | Currently no analytics (stub) | — | — | — | — |
| Crash logs | Yes (Sentry, if DSN configured) | Sentry | Yes | Yes | Yes |
| Push tokens | Yes (Expo / FCM tokens) | Expo Push relay | Yes | Yes | Yes |
| Device IDs | Likely yes via Sentry | Sentry | Yes | — | — |

**Action:** fill this form precisely; misrepresentation triggers policy strikes.

### 5.3 Account deletion (mandatory)

Play Store requires accounts to be deletable in-app **and** via a publicly-listed URL.

- ✅ Documented at `shared/legal/contact.md#account-deletion` with phone, email, and in-app paths.
- ⚠️ **Verify the in-app "Delete account" actions actually work end-to-end** (cascade deletes user row, bookings as cancelled, salons archived/orphan-handled, push tokens removed, Supabase Auth user deleted). Write an integration test.
- ⚠️ Confirm the URL appears in Play Console → App content → Account deletion.

### 5.4 Permissions justification

Play will ask you to justify each. Pre-write these in Play Console:

| Permission | Justification |
|---|---|
| `ACCESS_FINE_LOCATION` / `ACCESS_COARSE_LOCATION` | Show nearby salons on the discovery map. Foreground only; user can deny and see manual search. |
| `CAMERA` | Profile photo capture, salon image uploads. |
| `POST_NOTIFICATIONS` | Booking confirmations, owner approvals, reminders. |
| `INTERNET` | Network access. |
| `VIBRATE` | Notification feedback. |

If `RECORD_AUDIO`, `SYSTEM_ALERT_WINDOW`, `USE_FINGERPRINT`, `READ_EXTERNAL_STORAGE` remain in the manifest, **each requires its own justification or a Sensitive Permissions Declaration**. Easier path: strip them (see B3).

### 5.5 Signing & versioning

- ❌ Upload keystore: generate via `eas credentials`.
- ✅ Play App Signing: enroll on first internal-track upload (default for AAB).
- ❌ `versionCode` autoincrement: not configured.
- ✅ `applicationId` `com.audentix.trimit` is set and unique.

### 5.6 Store listing assets (gather before submission)

- App icon 512×512 PNG (no transparency)
- Feature graphic 1024×500 PNG
- Screenshots: phone (≥2, ≤8), 16:9 or 9:16; 7" and 10" tablets optional
- Short description (≤80 chars)
- Full description (≤4000 chars)
- App category: "Beauty"
- Tags: salon, beauty, booking, appointment

### 5.7 Pre-launch report (automated)

When you upload to internal track, Play runs the app on 5 devices. Expect failures around:
- Login (provide test creds)
- Map screen permission dialog
- Razorpay WebView (network calls)

Have a test account + a sandbox Razorpay key ready.

---

## 6. Prioritized Remediation Plan

### Day 1 — Unblock submission
1. **B1**: Generate real upload keystore via `eas credentials`. (30 min)
2. **B5**: Restrict Google Maps API key in GCP to package + SHA-1. (15 min)
3. **B3, B4, H6**: Strip unused permissions via `app.config.js` plugin; remove `expo-av`; remove bogus `NOTIFICATIONS`. (1 h)
4. **B2**: Enable R8 + shrinkResources, fix any ProGuard breakage on Razorpay/Reanimated. (2 h)
5. **C3, H3**: Pick final domain (`trimit.app` or vercel); set `EXPO_PUBLIC_SENTRY_DSN`, `EXPO_PUBLIC_PUBLIC_SITE_URL` in `eas.json` production env. (30 min)
6. **C2**: Remove client-bundled HMAC signing OR move to backend-issued nonces. (1 h)

### Day 2 — Backend hardening
7. **BC1**: Wire `slowapi` middleware + exception handler. (15 min)
8. **BC3**: Replace mocked Razorpay order creation with real `razorpay.Client().order.create(...)`. Persist `razorpay_order_id`. (2 h)
9. **BC4**: Either commit booking only after payment OR add 15-min cancel-pending `pg_cron` job. (1 h)
10. **BC5**: Switch ownership lookups to service-role-with-Python-check. (1 h)
11. **BC6 / DC1**: Change RPC to `FOR UPDATE`; add partial UNIQUE index migration `25_*.sql`. (30 min)
12. **BC2**: Either fix or remove `routers/staff.py`. (2 h)
13. **BC7**: Demote PII logs to DEBUG. (30 min)
14. **BH8**: Bump Render plan, fix gunicorn workers, set `healthCheckPath: /health`. (15 min)

### Day 3 — Cleanup & compliance
15. **BH6**: Trim `requirements.txt`. (30 min)
16. **BH7**: Delete `services/notifications.py`; implement Expo push receipts cleanup. (2 h)
17. **DC2, M2**: Consolidate migrations, fix numbering collisions, document applied state. (2 h)
18. **H1**: Babel `transform-remove-console` plugin for production. (15 min)
19. **5.3**: End-to-end test of in-app account deletion. (2 h)
20. **DH4**: Enable Supabase PITR; document in checklist. (15 min + propagation)

### Day 4 — Submission
21. Build internal-track AAB.
22. Fill Data Safety form per §5.2.
23. Upload screenshots, descriptions.
24. Internal testing with 2–3 reviewers.
25. Promote to closed track → production.

---

## 7. Items intentionally not blocking submission

These are real issues but don't gate the Play upload. Schedule for the first post-launch sprint.

- CRA → Vite migration (WC1).
- Backend Sentry integration.
- Backend pytest suite for booking engine.
- Mobile analytics implementation.
- Migration numbering consolidation beyond duplicate fixes.
- TypeScript `any` cleanup.
- Per-query staleTime tuning.
- Bundle size optimization (drop `crypto-js`, `base-64`, `react-native-web`, `react-dom` from mobile).

---

## 8. Files referenced

**Mobile:** `mobile/app.config.js`, `mobile/eas.json`, `mobile/android/app/build.gradle`, `mobile/android/app/src/main/AndroidManifest.xml`, `mobile/android/app/proguard-rules.pro`, `mobile/android/gradle.properties`, `mobile/App.tsx`, `mobile/src/services/apiClient.ts`, `mobile/src/lib/security.ts`, `mobile/src/lib/notifications.ts`, `mobile/src/lib/analytics.ts`, `mobile/src/legal/content.ts`, `mobile/src/screens/customer/PaymentScreen.tsx`.

**Backend:** `backend/server.py`, `backend/config.py`, `backend/core/limiter.py`, `backend/core/middleware.py`, `backend/core/idempotency.py`, `backend/core/supabase.py`, `backend/dependencies/auth.py`, `backend/routers/auth.py`, `backend/routers/bookings.py`, `backend/routers/payments.py`, `backend/routers/salons.py`, `backend/routers/promotions.py`, `backend/routers/staff.py`, `backend/routers/uploads.py`, `backend/services/push_notifications.py`, `backend/database/booking_rpc.sql`, `backend/requirements.txt`, `render.yaml`.

**Database:** `database/01_schema.sql`, `database/07_check_rls_policies.sql`, `database/08_add_max_bookings_per_slot.sql`, `database/22_create_slot_holds.sql`, and the full `database/*.sql` set (numbering collisions noted).

**Web:** `frontend/package.json`, `frontend/vercel.json`, `frontend/env.example`, `frontend/src/lib/api.js`.

**Legal:** `shared/legal/privacy.md`, `shared/legal/terms.md`, `shared/legal/contact.md`.

---

*Audit produced by reading the codebase end-to-end; severity calls reflect current Play Store policy as of the audit date. Re-run after the Day 1–3 remediation completes.*

---

## Appendix A — Remediation log (2026-05-16)

Code remediation per implementation plan. **Ops still required:** EAS upload keystore, GCP Maps SHA-1 restriction, apply SQL migrations 24–27 in Supabase, Play Console Data Safety + reviewer accounts, Razorpay sandbox E2E test.

| Area | Key files changed |
|------|-------------------|
| Mobile Play | `app.config.js`, `plugins/withAndroidPermissions.js`, `package.json`, `eas.json` |
| Mobile security | `apiClient.ts` (signing removed), `PaymentScreen.tsx`, `babel.config.js`, `notificationStore.ts` (expo-audio) |
| Backend | `server.py`, `payments.py`, `salon_auth.py`, `idempotency.py`, `uploads.py`, `requirements.txt`, `render.yaml` |
| Database | `25_*`, `26_*`, `27_*`, `docs/database/MIGRATION_ORDER.md` |
| Docs | `docs/audit/launch-readiness.md`, `docs/EAS_PLAY_STORE_OPS.md`, `docs/PLAY_CONSOLE_CHECKLIST.md`, `CLAUDE.md` |

Full checklist: `docs/audit/launch-readiness.md`.
