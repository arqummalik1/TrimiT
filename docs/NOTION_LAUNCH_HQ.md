# TrimiT — Production Launch HQ

> **How to use:** Duplicate this page in Notion. Create linked databases from each section below. Pin this page for daily standups.

**Last audit:** 2026-05-16 · **Readiness:** ~78/100 (cash-only v1 code done) · **ETA to Play:** 3–7 days ops  

> **Daily tracker (updated):** [NOTION_V1_DAILY_TRACKER.md](./NOTION_V1_DAILY_TRACKER.md)

---

## 🎯 Launch command center

| Metric | Current | Target |
|--------|---------|--------|
| Production readiness | 58% | 90% |
| Feature completeness | 72% | 85% (MVP) |
| Open P0 bugs | 7 | 0 |
| Play Store blockers | 5 | 0 |

**Quick links**
- [Master audit](./audit/production-audit.md)
- [Launch gates](./audit/launch-readiness.md)
- [Roadmap](./planning/roadmap.md)
- [Bug tracker](./qa/bug-tracker.md)
- [Release checklist](./qa/release-checklist.md)

---

## 1. Daily Progress Tracker

**Database properties:** `Task` (title) · `Status` (select) · `Priority` (select) · `Module` (select) · `Deadline` (date) · `Notes` (text) · `Completed` (checkbox)

**Status options:** `Not started` · `In progress` · `Blocked` · `Done`  
**Priority options:** `P0` · `P1` · `P2` · `P3`  
**Module options:** `Backend` · `Mobile` · `Web` · `Database` · `DevOps` · `Design` · `QA` · `Legal`

### Seed tasks (import these rows)

| Task | Status | Priority | Module | Deadline | Completed |
|------|--------|----------|--------|----------|-----------|
| Wire SlowAPI rate limiter | Not started | P0 | Backend | | ☐ |
| Implement real Razorpay order.create | Not started | P0 | Backend | | ☐ |
| Add slot UNIQUE index migration 25 | Not started | P0 | Database | | ☐ |
| Harden RPC — revoke anon EXECUTE | Not started | P0 | Database | | ☐ |
| Web API signing OR disable middleware | Not started | P0 | Web | | ☐ |
| Fix MyBookings Bell import | Not started | P0 | Web | | ☐ |
| EAS upload keystore (not debug) | Not started | P0 | Mobile | | ☐ |
| Strip unused Android permissions | Not started | P0 | Mobile | | ☐ |
| Verify mobile icon/splash assets | Not started | P0 | Mobile | | ☐ |
| Pending payment slot sweeper | Not started | P1 | Backend | | ☐ |
| Fix or disable staff router | Not started | P1 | Backend | | ☐ |
| Account deletion E2E test | Not started | P1 | QA | | ☐ |
| Fill Play Data Safety form | Not started | P1 | Legal | | ☐ |
| Create reviewer test accounts | Not started | P1 | QA | | ☐ |
| Mobile password reset deep link | Not started | P2 | Mobile | | ☐ |
| Web mobile navigation menu | Not started | P2 | Web | | ☐ |
| Push tap → booking detail | Not started | P2 | Mobile | | ☐ |

---

## 2. Bug Tracker

**Database properties:** `Bug` (title) · `Severity` (select) · `Platform` (multi) · `Screenshot` (files) · `Assigned To` (person) · `Status` (select) · `Fix Reference` (url/text)

**Severity:** `Critical` · `High` · `Medium` · `Low`  
**Status:** `Open` · `In progress` · `Fixed` · `Won't fix`  
**Platform:** `Mobile` · `Web` · `Backend` · `Database`

### Active bugs (sync from [bug-tracker.md](./qa/bug-tracker.md))

| Bug | Severity | Platform | Status | Fix Reference |
|-----|----------|----------|--------|---------------|
| Razorpay orders mocked | Critical | Backend | Open | `backend/routers/payments.py` |
| Rate limiter not wired | Critical | Backend | Open | `backend/server.py` |
| Staff API runtime crash | Critical | Backend | Open | `backend/routers/staff.py` |
| Web 403 when signing on | Critical | Web | Open | `frontend/src/lib/api.js` |
| MyBookings Bell not imported | Critical | Web | Open | `MyBookings.js:172` |
| No slot UNIQUE index | Critical | Database | Open | migration 25 |
| RPC IDOR via anon EXECUTE | Critical | Database | Open | migration 26 |
| Pending payments block slots | High | Backend | Open | sweeper job |
| Debug keystore on EAS prod | High | Mobile | Open | `eas credentials` |
| Mobile assets missing from git | High | Mobile | Open | `mobile/assets/` |

---

## 3. Production Readiness Board

**Board type:** Kanban with columns as groups below.  
**Card properties:** `Item` (title) · `Status` (`Todo` / `Doing` / `Done`) · `Owner` · `Notes`

### Column: Security
| Item | Status |
|------|--------|
| Wire rate limits | Todo |
| Fix Razorpay verify authz | Todo |
| Harden SECURITY DEFINER RPCs | Todo |
| Revoke anon RPC execute | Todo |
| Production CORS lockdown | Todo |
| Enable leaked password protection (Supabase) | Todo |

### Column: Backend
| Item | Status |
|------|--------|
| Real Razorpay orders | Todo |
| Pending booking sweeper | Todo |
| Fix staff router | Todo |
| Trim requirements.txt | Todo |
| Async Supabase client | Todo |
| Structured JSON logging | Todo |

### Column: Mobile
| Item | Status |
|------|--------|
| Upload keystore | Todo |
| Permission strip | Todo |
| R8 minification | Todo |
| Sentry DSN in EAS | Todo |
| Maps key restriction | Todo |
| Password reset deep link | Todo |

### Column: Web
| Item | Status |
|------|--------|
| API request signing | Todo |
| Fix Bell import bug | Todo |
| Wire notification routes | Todo |
| Mobile nav drawer | Todo |
| Remove prod console.logs | Todo |
| Supabase auth sync for realtime | Todo |

### Column: Notifications
| Item | Status |
|------|--------|
| Push on booking complete | Done |
| Owner new booking push | Done |
| Prefs ON/OFF UI (mobile) | Done |
| Respect notify_reminders locally | Todo |
| Push tap → booking detail | Todo |
| Expo receipt token cleanup | Todo |

### Column: Store Launch
| Item | Status |
|------|--------|
| Data Safety form | Todo |
| Content rating (IARC) | Todo |
| Store screenshots | Todo |
| Privacy URL canonical | Todo |
| Reviewer test accounts | Todo |
| Internal track upload | Todo |

### Column: Testing
| Item | Status |
|------|--------|
| Auth test matrix | Todo |
| Booking E2E script | Todo |
| Payment E2E (Razorpay test) | Todo |
| Account deletion E2E | Todo |
| Pre-launch report triage | Todo |

### Column: Performance
| Item | Status |
|------|--------|
| Slot query caching | Todo |
| Enable R8 / shrink AAB | Todo |
| Remove unused mobile deps | Todo |
| Render worker count fix | Todo |

---

## 4. MVP Milestones

**Database properties:** `Milestone` (title) · `Target date` · `Status` · `Exit criteria` (text)

| Milestone | Target | Status | Exit criteria |
|-----------|--------|--------|---------------|
| **MVP Stable** | Week 1 | 🔴 Not started | Cash E2E mobile+web; rate limits; auth OK |
| **Production Ready** | Week 2 | 🔴 Not started | Razorpay staging; RPC hardened; UNIQUE index |
| **Beta Launch** | Week 3 | 🔴 Not started | 20 users; internal Play track; Sentry clean |
| **Play Store Launch** | Week 5–6 | 🔴 Not started | Data Safety; production keys; closed test pass |
| **Scaling Phase** | Month 2+ | 🔴 Not started | 1k bookings/mo; async backend; CI tests |

---

## 5. Daily Standup Template

> Copy a new block each morning. Archive yesterday's entry.

### 📅 Standup — YYYY-MM-DD

**What I completed yesterday**
- 

**What I am working on today**
- 

**Current blockers**
- 

**Critical issues (P0)**
- 

**Tomorrow's goals**
- 

---

## 6. Auth alignment tracker (mobile ↔ web)

| Capability | Mobile | Web | Action |
|------------|--------|-----|--------|
| Sign up + role | ✅ | ✅ | — |
| Login | ✅ | ✅ | Fix rememberMe bug (web) |
| Session persist | ✅ SecureStore | ✅ localStorage | Accept for MVP |
| Logout | ✅ | ⚠️ No cache clear | Clear Query on web |
| Password reset | ⚠️ Email only | ✅ Full | Mobile deep link |
| Protected routes | ✅ | ✅ | — |
| API signing | ✅ | ❌ | **P0 web fix** |
| Push prefs | ✅ | ❌ | Post-MVP for web |
| Supabase realtime auth | ✅ | ❌ | Web setAuth |
| Owner hasSalon gate | ⚠️ | ⚠️ | Unified redirect |

---

## 7. Weekly scorecard (update Fridays)

| Week | Readiness % | P0 closed | Builds shipped | Notes |
|------|-------------|-----------|----------------|-------|
| W1 | 58 | 0 | — | Audit complete |
| W2 | | | | |
| W3 | | | | |

---

## Notion setup guide (5 minutes)

1. Create workspace page: **TrimiT — Production Launch HQ**
2. Type `/linked` → create **Daily Progress Tracker** database from Section 1
3. Create **Bug Tracker** database from Section 2
4. Create **Production Readiness** board with 8 column groups from Section 3
5. Create **MVP Milestones** timeline or table from Section 4
6. Add **Standup** as a repeating template button using Section 5
7. Link this repo's `docs/` folder in a **Resources** callout for engineers

**Pro tip:** Use Notion `Synced block` for the P0 bug count in the command center header.
