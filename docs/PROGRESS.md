# TrimiT — Project Progress (living document)

> **Purpose:** Single source of truth for humans and AI tools on where TrimiT stands.  
> **Update rule:** Append a session entry and refresh status tables after every meaningful prompt or deploy.

**Last updated:** 2026-05-17 (MVP launch remediation)  
**Overall readiness:** **8.2 / 10** — Code ready for **production** track after ops checklist + device QA  
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
| 2026-05-17 (eve) | **MVP launch remediation** implemented: hold required, slots auth, duration overlap, idempotency INSERT-first, Write Review CTA, booking UX, Discover map pause. See audit §19. | Deploy → QA → production AAB. |
| 2026-05-17 (pm) | User **applied Supabase migrations 29–35** in SQL editor. Re-audit completed. Critical DB blockers **resolved**. | — |
| 2026-05-17 (am) | Production audit + phases 0–6 **code** remediation. Created `PROGRESS.md`, `V1_FEATURE_FLAGS.md`. | Migrations (done by user). |
| (earlier) | Stitch UI specs, salon images, owner onboarding. | — |

---

## Project snapshot

| Area | Stack | Status |
|------|--------|--------|
| Mobile | Expo SDK 54, RN 0.81, React 19 | MVP remediation in repo; **build + device QA pending** |
| Backend | FastAPI `/api/v1` | **Must deploy** to Render if not already |
| Database | Supabase | **Migrations 01–35 applied** (user confirmed 2026-05-17) |
| Web | CRA `frontend/` | Non-blocking for mobile launch |

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
| 7 | Release AAB + `npm run verify:env` | **PENDING** |
| 8 | Supabase: anon cannot execute `create_atomic_booking` | **PENDING** |

---

## Blockers (updated)

| # | Blocker | Status |
|---|---------|--------|
| ~~1~~ | Apply SQL 29–35 | **DONE** |
| 2 | Deploy latest backend to Render | **PENDING** (verify) |
| 3 | Device QA matrix | **PENDING** |
| 4 | Play Console production listing + AAB upload | **PENDING** |

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
| [database/MIGRATION_ORDER.md](./database/MIGRATION_ORDER.md) | SQL order |
| [PROJECT_MASTER_CONTEXT_FOR_AI.md](./PROJECT_MASTER_CONTEXT_FOR_AI.md) | Architecture |
| [../mobile/BUILD_RELEASE.md](../mobile/BUILD_RELEASE.md) | AAB/APK |

---

*Update this file after deploy, QA, or each Play Console submission.*
