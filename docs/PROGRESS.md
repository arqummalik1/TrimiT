# TrimiT — Project Progress (living document)

> **Purpose:** Single source of truth for humans and AI tools on where TrimiT stands.  
> **Update rule:** Append a session entry and refresh status tables after every meaningful prompt or deploy.

**Last updated:** 2026-05-18 (Google Search Console SEO)  
**Overall readiness:** **8.5 / 10** — Web marketing polished; **mobile AAB + device QA** are the critical path to Play production  
**Latest audit:** [PRODUCTION_AUDIT_REPORT.md](./PRODUCTION_AUDIT_REPORT.md)  
**Launch checklist:** [PRODUCTION_LAUNCH_CHECKLIST.md](./PRODUCTION_LAUNCH_CHECKLIST.md)

---

## Play Store status (quick answer)

| Track | Verdict | Why |
|-------|---------|-----|
| **Production (all users)** | **GO after checklist** | MVP remediation code merged; QA + deploy required |
| **Internal / closed testing** | **GO** | Same build; optional stepping stone |
| **Open beta / nationwide** | **NO** | Enable online pay + staff after v1.1 QA |

### Do these next (in order)

See [PRODUCTION_LAUNCH_CHECKLIST.md](./PRODUCTION_LAUNCH_CHECKLIST.md).

1. **Deploy backend** to Render (hold enforcement, slots auth, duration slots, INSERT-first idempotency).  
2. **Re-run** `database/07_check_rls_policies.sql`.  
3. **Run QA matrix** (below) on physical Android 13+.  
4. **Build AAB:** `cd mobile && npm run verify:env && npm run build:aab:local`.  
5. **Play Console production** track: listing + upload AAB.  
6. Salons: `allow_multiple_bookings_per_slot = false` for v1.

---

## How to use this file (AI tools)

1. Read **Session log** (latest first).  
2. Check **Blockers** — only QA + deploy remain for closed testing.  
3. Status: `COMPLETE` | `CODE_DONE` | `PENDING` | `DEFERRED`

---

## Session log (newest first)

| Date | Summary | Next |
|------|---------|------|
| 2026-05-18 | **Play guide:** `PLAY_STORE_DEPLOYMENT_GUIDE.md` rewritten for **local-only** APK/AAB (`npm run build:aab:local` / `build:apk:local`); EAS cloud moved to optional appendix (quota exhausted). | Upload `build-*.aab` → internal testing → QA. |
| 2026-05-18 | **SEO / Search Console:** `robots.txt`, `sitemap.xml` (build-time generator), per-route `SeoHead` (meta, OG, JSON-LD), optional GA4 + GSC verification env vars, Play Store ASO copy in deployment guide. Docs: `GOOGLE_SEARCH_CONSOLE_SETUP.md`. | Add `REACT_APP_GOOGLE_SITE_VERIFICATION` in Vercel → redeploy → verify in Search Console → submit sitemap. |
| 2026-05-17 (late) | **Landing page v2:** Service card illustrations (`frontend/public/images/services/`), upbeat hero graphic + horizontal logo white-box fix, **Get the Android app** section, Vercel JSX build fix, mobile-responsive layout. Pushed through `5f0962b7`. **Mobile:** `npm run verify:env && npm run build:aab:local` started (Play Store AAB). | Confirm Vercel deploy live → auth signup E2E → finish AAB → install on Android 13+ → QA matrix. |
| 2026-05-17 (night) | **Production domain & web:** `trimit.online` everywhere (code, legal, Render `PUBLIC_SITE_URL`, Vercel). **Auth email:** Resend SMTP + Supabase custom SMTP (user configured); friendly rate-limit copy; `hello@trimit.online` support. **Web UX:** premium landing (hero, illustrated “What we offer”, stats, how-it-works), TrimiT logo PNG sitewide, header **Download App** + footer badges → **Google Drive APK** until Play listing. Guides: `TRIMIT_ONLINE_SETUP.md`, `REMAINING_STEPS_TRIMIT_ONLINE.md`, `AUTH_SMTP_AND_PHONE_OTP_GUIDE.md`. Pushed: `0ba9f645`, `84fc83b3`, `b1bc5669`. | (superseded by late session) |
| 2026-05-17 (eve) | **MVP launch remediation** implemented: hold required, slots auth, duration overlap, idempotency INSERT-first, Write Review CTA, booking UX, Discover map pause. See audit §19. | Deploy → QA → production AAB. |
| 2026-05-17 (pm) | User **applied Supabase migrations 29–35** in SQL editor. Re-audit completed. Critical DB blockers **resolved**. | — |
| 2026-05-17 (am) | Production audit + phases 0–6 **code** remediation. Created `PROGRESS.md`, `V1_FEATURE_FLAGS.md`. | Migrations (done by user). |
| (earlier) | Stitch UI specs, salon images, owner onboarding. | — |

---

## Project snapshot

| Area | Stack | Status |
|------|--------|--------|
| Mobile | Expo SDK 54, RN 0.81, React 19 | MVP remediation in repo; **AAB build in progress**; device QA pending |
| Backend | FastAPI `/api/v1` | **Must deploy** to Render if not already |
| Database | Supabase | **Migrations 01–35 applied** (user confirmed 2026-05-17) |
| Web | CRA `frontend/` at **https://trimit.online** | **CODE_DONE** — landing v2 (hero, service art, Android section); **verify Vercel** after `5f0962b7` |

**Launch scope:** Narrow v1 — cash-only, staff UI off, single-booking salons preferred.

---

## Phase status (audit remediation)

| Phase | Code | DB (Supabase) | QA | Overall |
|-------|------|---------------|-----|---------|
| **0** Prep | COMPLETE | — | — | **COMPLETE** |
| **1** Booking + security | COMPLETE | **COMPLETE** (29–32) | PENDING | **COMPLETE** *pending QA* |
| **2** Mobile core | COMPLETE | — | PENDING | **COMPLETE** *pending QA* |
| **3** UX + security | COMPLETE | 33 applied | PENDING | **COMPLETE** *pending QA* |
| **4** Staff + multi | COMPLETE | **COMPLETE** (34–35) | PENDING | **COMPLETE** *flag off* |
| **5** Payments | COMPLETE | 33 function | PENDING | **DEFERRED** *pay flag off* |
| **6** Polish | COMPLETE | — | PENDING | **COMPLETE** *pending QA* |

---

## Database migrations

| Migration | Applied | Notes |
|-----------|---------|--------|
| 01–27 | Yes | Per prior checklist |
| **29** RPC hardening | **Yes** (2026-05-17) | auth.uid, holds, amount |
| **30** unique index fix | **Yes** | Dropped `uq_bookings_active_slot` |
| **31** reschedule IDOR | **Yes** | |
| **32** idempotency path | **Yes** | |
| **33** expire pending | **Yes** | Cron still optional |
| **34** staff RPC | **Yes** | UI flag still off |
| **35** reschedule holds | **Yes** | |
| `07_check_rls_policies.sql` | **PENDING** | Re-run recommended |

---

## Resolved vs original audit (summary)

| Original ID | Issue | Status after migrations + code |
|-------------|--------|--------------------------------|
| CRIT-01 | Holds not enforced at commit | **RESOLVED** (migration 29) |
| CRIT-02 | Unique index vs multi-booking | **RESOLVED** (migration 30) |
| CRIT-03 | Staff dropped | **RESOLVED** in DB (34); UI gated off v1 |
| CRIT-04 | RPC no auth.uid | **RESOLVED** (29, 34) |
| CRIT-05 | Idempotency cache | **RESOLVED** (code + 32) |
| CRIT-06 | Reschedule IDOR | **RESOLVED** (31) |
| HIGH-02 | Multi-booking hold | **RESOLVED** (API 409 + mobile always reserves) |
| HIGH-03 | Slots anon scrape | **RESOLVED** (auth required) |
| HIGH-05 | Write Review dead | **RESOLVED** (Rate visit CTA) |
| MED-01 | Duration overlap | **RESOLVED** (slots API) |
| MED-02 | Idempotency race | **RESOLVED** (INSERT-first) |
| MED-04/05/08 | Discover stale, success UX, map | **RESOLVED** |
| Remaining | HIGH-04 MVVM, MED-03 `any`, MED-06 cron, MED-07 staff router | **DEFERRED** post-launch |

Full detail: [PRODUCTION_AUDIT_REPORT.md](./PRODUCTION_AUDIT_REPORT.md).

---

## QA matrix

| # | Test | Status |
|---|------|--------|
| 1 | Concurrent reserve + book (single-booking salon) | **PENDING** |
| 2 | Idempotency retry on `POST /bookings/` | **PENDING** |
| 3 | Cold start ×20, no login flash | **PENDING** |
| 4 | Owner foreground → one in-app alert | **PENDING** |
| 5 | Cancel on A → B slots refresh | **PENDING** |
| 6 | Cash booking E2E → Bookings tab | **PENDING** |
| 7 | Release AAB + `npm run verify:env` | **IN_PROGRESS** (local `build:aab:local` 2026-05-17) |
| 8 | Supabase: anon cannot execute `create_atomic_booking` | **PENDING** |

---

## Web & auth launch (2026-05-17)

| Item | Status | Notes |
|------|--------|--------|
| Domain **trimit.online** on Vercel | **CODE_DONE** | User configured DNS + Vercel |
| Resend + Supabase **custom SMTP** | **DONE** (user) | `noreply@trimit.online` for auth mail |
| Render `PUBLIC_SITE_URL` | **DONE** (user) | `https://trimit.online` |
| Signup / reset email E2E test | **PENDING** | New Gmail, check spam |
| APK distribution | **CODE_DONE** | Drive folder via header/footer until Play Store |
| Landing v2 on production | **DONE** | — |
| Search Console sitemap + robots | **CODE_DONE** | Submit `https://trimit.online/sitemap.xml` after deploy |
| GSC ownership verification | **PENDING** | Set `REACT_APP_GOOGLE_SITE_VERIFICATION` in Vercel |
| Phone OTP login | **DEFERRED** | See `AUTH_SMTP_AND_PHONE_OTP_GUIDE.md` |
| Compress `logo-horizontal.png` (~500KB) | **OPTIONAL** | Faster hero load |

---

## Blockers (updated)

| # | Blocker | Status |
|---|---------|--------|
| ~~1~~ | Apply SQL 29–35 | **DONE** |
| ~~2~~ | Render `PUBLIC_SITE_URL` + deploy | **DONE** (user) — verify live `/health` |
| ~~3~~ | Supabase SMTP + Resend domain | **DONE** (user) — verify signup email |
| 4 | Device QA matrix | **PENDING** (blocked on AAB install) |
| 5 | Play Console production listing + AAB upload | **PENDING** (AAB build in progress) |
| 6 | Auth signup E2E (email → trimit.online confirm page) | **PENDING** |

---

## Feature flags (v1 build)

| Flag | Value for first Play upload |
|------|----------------------------|
| `EXPO_PUBLIC_ENABLE_ONLINE_PAY` | `false` |
| `EXPO_PUBLIC_ENABLE_STAFF_SELECTION` | unset / `false` |

See [V1_FEATURE_FLAGS.md](./V1_FEATURE_FLAGS.md).

---

## Key docs

| Doc | Purpose |
|-----|---------|
| [PRODUCTION_AUDIT_REPORT.md](./PRODUCTION_AUDIT_REPORT.md) | Full audit + §19 launch remediation |
| [PRODUCTION_LAUNCH_CHECKLIST.md](./PRODUCTION_LAUNCH_CHECKLIST.md) | Pre-upload ops checklist |
| [TRIMIT_ONLINE_SETUP.md](./TRIMIT_ONLINE_SETUP.md) | Domain, Resend, Vercel, Supabase, Render |
| [REMAINING_STEPS_TRIMIT_ONLINE.md](./REMAINING_STEPS_TRIMIT_ONLINE.md) | What’s left after SMTP setup |
| [AUTH_SMTP_AND_PHONE_OTP_GUIDE.md](./AUTH_SMTP_AND_PHONE_OTP_GUIDE.md) | Email limits, OTP roadmap |
| [GOOGLE_SEARCH_CONSOLE_SETUP.md](./GOOGLE_SEARCH_CONSOLE_SETUP.md) | Verify site, submit sitemap, optional GA4 |
| [database/MIGRATION_ORDER.md](./database/MIGRATION_ORDER.md) | SQL order |
| [PROJECT_MASTER_CONTEXT_FOR_AI.md](./PROJECT_MASTER_CONTEXT_FOR_AI.md) | Architecture |
| [../mobile/BUILD_RELEASE.md](../mobile/BUILD_RELEASE.md) | AAB/APK |

---

*Update this file after deploy, QA, or each Play Console submission.*
