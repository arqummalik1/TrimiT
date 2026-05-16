# TrimiT Documentation Hub

**Audit date:** 2026-05-16  
**Scope:** Mobile (Expo), Web (CRA), Backend (FastAPI), Database (Supabase)

This folder is the single source of truth for production readiness, architecture, planning, and QA.

---

## Executive summary

| Question | Answer |
|----------|--------|
| **Production ready?** | **No** — critical backend payment/security gaps and Play Store blockers remain |
| **MVP ready (cash bookings, mobile-first)?** | **Partial** — ~72% complete; usable for closed beta with known limits |
| **Overall completion** | **~72%** (feature breadth high; production hardening ~55%) |
| **Estimated time to launch-ready** | **8–12 engineering days** (focused sprint) |
| **Play Store ready?** | **No** — signing, permissions, Razorpay, assets |

### Production readiness score: **58 / 100**

| Dimension | Score | Notes |
|-----------|-------|-------|
| Architecture | 72 | Refactored FastAPI routers; MVVM inconsistent on clients |
| Security | 48 | Rate limits inert, RPC IDOR risk, mock payments |
| Booking engine | 65 | Holds + atomic RPC; missing slot UNIQUE, pending-payment leak |
| Auth (mobile) | 78 | SecureStore, role nav, session restore — gaps on password reset deep link |
| Auth (web) | 70 | Full reset flow; no API signing, localStorage tokens |
| Notifications | 68 | Expo push + prefs on mobile; no receipts cleanup |
| Play Store | 42 | Debug signing, permissions, missing tracked assets |
| Web parity | 55 | Cash-only; orphaned routes; mobile nav gaps |

---

## Document map

### Audit reports (`/audit`)
| File | Purpose |
|------|---------|
| [production-audit.md](./audit/production-audit.md) | Master audit & verdict |
| [security-audit.md](./audit/security-audit.md) | Security findings & remediation |
| [performance-audit.md](./audit/performance-audit.md) | Bottlenecks & scaling |
| [backend-audit.md](./audit/backend-audit.md) | FastAPI deep dive |
| [database-audit.md](./audit/database-audit.md) | Schema, RLS, migrations |
| [mobile-audit.md](./audit/mobile-audit.md) | Expo / RN audit |
| [web-audit.md](./audit/web-audit.md) | CRA portal audit |
| [notification-audit.md](./audit/notification-audit.md) | Push & preferences |
| [ui-ux-audit.md](./audit/ui-ux-audit.md) | UX consistency |
| [launch-readiness.md](./audit/launch-readiness.md) | Go/no-go checklist |

### Architecture (`/architecture`)
| File | Purpose |
|------|---------|
| [app-flow.md](./architecture/app-flow.md) | End-to-end user journeys |
| [auth-flow.md](./architecture/auth-flow.md) | Auth across clients |
| [booking-flow.md](./architecture/booking-flow.md) | Booking lifecycle |
| [backend-flow.md](./architecture/backend-flow.md) | API & service layer |

### Planning (`/planning`)
| File | Purpose |
|------|---------|
| [roadmap.md](./planning/roadmap.md) | Production roadmap |
| [sprint-plan.md](./planning/sprint-plan.md) | 2-week sprint breakdown |
| [milestones.md](./planning/milestones.md) | MVP → Play Store milestones |
| [mvp-scope.md](./planning/mvp-scope.md) | In/out of MVP |

### QA (`/qa`)
| File | Purpose |
|------|---------|
| [bug-tracker.md](./qa/bug-tracker.md) | Known bugs registry |
| [testing-checklist.md](./qa/testing-checklist.md) | Manual test matrix |
| [release-checklist.md](./qa/release-checklist.md) | Pre-release gates |

### Daily operations
| File | Purpose |
|------|---------|
| [NOTION_LAUNCH_HQ.md](./NOTION_LAUNCH_HQ.md) | Notion-style launch dashboard |

### Existing docs
- [PLAY_STORE_DEPLOYMENT_GUIDE.md](./PLAY_STORE_DEPLOYMENT_GUIDE.md) — **Beginner Play Store + AAB guide**
- [API_GUIDE.md](./API_GUIDE.md)
- [PLAY_CONSOLE_CHECKLIST.md](./PLAY_CONSOLE_CHECKLIST.md)
- Root: [PRODUCTION_READINESS_AUDIT.md](../PRODUCTION_READINESS_AUDIT.md) (detailed Play Store + backend notes)

---

## Critical blockers (fix before public launch)

1. **Razorpay orders mocked** — `backend/routers/payments.py` generates local `order_*` IDs; real payments will fail or be forgeable.
2. **Rate limiter not wired** — `@limiter.limit` decorators are no-ops; auth endpoints unprotected.
3. **Staff API broken** — `backend/routers/staff.py` uses wrong Supabase client API.
4. **Play Store signing** — production AAB needs upload keystore via `eas credentials`.
5. **Web API signing gap** — if `API_SIGNING_SECRET` is set on Render, web mutations return 403.
6. **Slot double-booking risk** — no partial UNIQUE on `(salon_id, booking_date, time_slot)`; RPC uses `FOR SHARE`.
7. **Pending online bookings block slots** — no expiry sweeper for unpaid `payment_status=pending`.
8. **SECURITY DEFINER RPCs callable by anon** — `create_atomic_booking`, `reserve_slot_v1` without `auth.uid()` checks.

---

## Recommended launch strategy

**Phase A — Closed beta (5–7 days):** Cash-only bookings, wire rate limits, fix web signing or disable signing middleware, internal Play track with test creds.

**Phase B — Payment hardening (3–4 days):** Real Razorpay orders + webhooks, pending-booking sweeper, slot UNIQUE index.

**Phase C — Play Store (3–5 days):** Keystore, permission strip, R8, Data Safety form, store assets.

**Phase D — Post-launch:** CRA→Vite, MVVM hook extraction, Expo receipt cleanup, staff router fix.
