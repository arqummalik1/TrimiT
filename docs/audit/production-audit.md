# TrimiT Production Audit (Master)

**Date:** 2026-05-16  
**Auditor scope:** Full monorepo — mobile, web, backend, database, shared legal  
**Deployments:** Backend (Render), Web (Vercel), DB (Supabase), Mobile (EAS)

---

## Verdict

| Question | Answer |
|----------|--------|
| Is the app production ready? | **No** |
| Is the MVP feature-complete? | **Mostly** (~72%) |
| Can you ship a closed beta today? | **Yes, with caveats** (cash-only, known payment/security debt) |
| Can you ship Play Store production? | **No** |

**Production readiness score: 58/100**

---

## Layer-by-layer assessment

### Mobile (Expo SDK 54 / RN 0.81)

| Area | Rating | Summary |
|------|--------|---------|
| Feature completeness | ★★★★☆ | Full customer + owner flows, Razorpay WebView, push, prefs |
| Architecture | ★★★☆☆ | Repositories exist; 14 screens call `api` directly |
| Auth | ★★★★☆ | SecureStore, role tabs, `/auth/me` bootstrap |
| Play Store | ★★☆☆☆ | Debug keystore, over-broad permissions, assets not in git |
| Stability | ★★★☆☆ | Large `BookingScreen`; minimal tests |

### Web (CRA + React 19)

| Area | Rating | Summary |
|------|--------|---------|
| Feature completeness | ★★★☆☆ | Core flows; cash-only; map stub |
| Auth | ★★★☆☆ | Reset flow complete; no API signing |
| Architecture | ★★☆☆☆ | No repository/hook layer |
| Production | ★★☆☆☆ | CRA EOL; console logging in prod |

### Backend (FastAPI 1.1)

| Area | Rating | Summary |
|------|--------|---------|
| Structure | ★★★★☆ | Modular routers, middleware, Sentry |
| Security | ★★☆☆☆ | Rate limits inert, mock payments, RPC exposure |
| Booking | ★★★☆☆ | Atomic RPC + holds; race gaps remain |
| Ops | ★★☆☆☆ | Sync httpx in async; bloated requirements |

### Database (Supabase)

| Area | Rating | Summary |
|------|--------|---------|
| Schema design | ★★★★☆ | UUIDs, FKs, indexes, realtime |
| RLS | ★★★☆☆ | Core tables covered; permissive promo inserts |
| Migrations | ★★☆☆☆ | Numbering collisions (03, 15, 16) |
| Advisors | ⚠️ | 1 ERROR (`staff_performance` view), many RPC EXECUTE warnings |

---

## What works well today

1. **Refactored backend** — `server.py` bootstrap + versioned `/api/v1` routers (not a monolith).
2. **Mobile auth core** — SecureStore persistence, 401 → session expired, role-based navigation.
3. **Booking UX (mobile)** — Slot holds, realtime invalidation, promo/staff selection, conflict handling.
4. **Push pipeline** — Expo push + `notification_events` dedupe + per-user preferences (migration 24).
5. **Legal content** — Privacy, terms, contact, account deletion documented in `shared/legal/`.
6. **Idempotency & request IDs** — Infrastructure present (needs tightening).

---

## Critical vs optional

### Critical (before public launch)

| ID | Item | Owner |
|----|------|-------|
| C1 | Real Razorpay `order.create` + verify ownership | Backend |
| C2 | Wire SlowAPI (`app.state.limiter` + middleware) | Backend |
| C3 | Partial UNIQUE index on active bookings per slot | Database |
| C4 | Revoke anon EXECUTE on booking RPCs OR add `auth.uid()` checks | Database |
| C5 | Play upload keystore + strip dangerous permissions | Mobile |
| C6 | Web API signing OR disable signing in prod until web ships | Web/Backend |
| C7 | Pending-payment slot release (cron or verify-first flow) | Backend |
| C8 | Fix or disable `staff` router | Backend |
| C9 | Confirm mobile assets exist for EAS build | Mobile |
| C10 | End-to-end account deletion test | QA |

### Optional (post-MVP)

- CRA → Vite migration
- MVVM hook extraction on all screens
- Mobile password-reset deep link screen
- Web Razorpay + staff selection
- Analytics implementation
- TypeScript `any` cleanup
- Expo push receipt / stale token cleanup

---

## Completion estimate by module

| Module | % Complete | Production % |
|--------|------------|----------------|
| Customer booking (mobile) | 90 | 70 |
| Owner dashboard (mobile) | 85 | 75 |
| Web customer | 75 | 55 |
| Web owner | 80 | 60 |
| Payments (Razorpay) | 40 | 20 |
| Push notifications | 75 | 65 |
| Auth (both clients) | 80 | 70 |
| Staff management | 50 | 30 |
| Promotions | 85 | 75 |
| Reviews | 80 | 70 |
| Database/RLS | 85 | 60 |
| Play Store compliance | 35 | 35 |

**Weighted overall: ~72% feature / ~58% production**

---

## Technical debt summary

| Category | Debt level | Impact |
|----------|------------|--------|
| Payment integration | High | Revenue blocked |
| Client architecture drift | Medium | Maintenance cost |
| Migration hygiene | Medium | Env divergence risk |
| Test coverage | High | Regression risk |
| Security hardening | High | Abuse / fraud risk |
| Dependency bloat (backend) | Medium | Cold start, CVE surface |

---

## Scalability snapshot

**Current scale:** Suitable for hundreds of concurrent users on Render starter + Supabase Pro.

**First bottlenecks:**
1. Sync Supabase REST in async handlers
2. `GET /slots` full-day fetch per request (no cache)
3. Salon list Python-side filter fallback
4. Free Render tier + 4 gunicorn workers mismatch

**Scale path:** Async httpx pool, Redis slot cache, `get_nearby_salons_v1` RPC everywhere, horizontal workers, connection pooling.

---

## Launch timeline estimate

| Phase | Duration | Outcome |
|-------|----------|---------|
| Blocker sprint | 8–12 days | Production-safe backend + signed AAB |
| Closed beta | 1–2 weeks | 20–50 users, cash + limited Razorpay |
| Open beta | 2–4 weeks | Play internal/closed track |
| Production | Week 6+ | Public Play Store |

---

## Related documents

- [launch-readiness.md](./launch-readiness.md) — Go/no-go gates
- [security-audit.md](./security-audit.md) — Security detail
- [../planning/roadmap.md](../planning/roadmap.md) — Remediation roadmap
- [../NOTION_LAUNCH_HQ.md](../NOTION_LAUNCH_HQ.md) — Daily tracker
