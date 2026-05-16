# Production Readiness Roadmap

**Horizon:** 6 weeks to Play Store production  
**Strategy:** Stabilize → Secure → Ship → Scale

---

## Phase 0: Immediate (Days 1–3) — Unblock beta

| # | Task | Module | Priority | Est. |
|---|------|--------|----------|------|
| 0.1 | Wire SlowAPI limiter | Backend | P0 | 30m |
| 0.2 | Web API signing OR disable signing in prod | Web/BE | P0 | 2h |
| 0.3 | Fix `MyBookings` Bell import | Web | P0 | 5m |
| 0.4 | Verify mobile assets + EAS env vars | Mobile | P0 | 2h |
| 0.5 | Confirm migration 24 applied in prod Supabase | DB | P0 | 15m |
| 0.6 | Document reviewer test accounts | QA | P0 | 30m |

**Exit criteria:** Cash booking works on mobile + web; auth persists; no 403 on web mutations.

---

## Phase 1: Security & payments (Days 4–8)

| # | Task | Module | Priority | Est. |
|---|------|--------|----------|------|
| 1.1 | Real Razorpay order.create + persist order_id | Backend | P0 | 1d |
| 1.2 | Payment verify: ownership + amount checks | Backend | P0 | 4h |
| 1.3 | Pending booking expiry (15 min cron) | DB/BE | P0 | 4h |
| 1.4 | Slot partial UNIQUE index migration 25 | DB | P0 | 2h |
| 1.5 | Harden RPC: auth.uid() + revoke anon EXECUTE | DB | P0 | 4h |
| 1.6 | Fix or unregister staff router | Backend | P1 | 4h |
| 1.7 | Demote PII logs to DEBUG | Backend | P1 | 2h |
| 1.8 | Production CORS (no localhost) | Backend | P1 | 1h |

**Exit criteria:** One successful Razorpay test payment E2E on mobile staging.

---

## Phase 2: Play Store (Days 9–14)

| # | Task | Module | Priority | Est. |
|---|------|--------|----------|------|
| 2.1 | `eas credentials` upload keystore | Mobile | P0 | 1h |
| 2.2 | Strip Android permissions via config plugin | Mobile | P0 | 3h |
| 2.3 | Enable R8 + test release build | Mobile | P0 | 4h |
| 2.4 | Restrict Maps API key | GCP | P0 | 1h |
| 2.5 | Data Safety form | Ops | P0 | 2h |
| 2.6 | Store listing assets | Design | P0 | 1d |
| 2.7 | Internal track upload + pre-launch report | Ops | P0 | 4h |
| 2.8 | Account deletion E2E test | QA | P0 | 2h |
| 2.9 | Canonical privacy URL (one domain) | Ops | P1 | 1h |

**Exit criteria:** Internal track build passes pre-launch; reviewer can log in.

---

## Phase 3: Polish & parity (Days 15–21)

| # | Task | Module | Priority | Est. |
|---|------|--------|----------|------|
| 3.1 | Mobile password reset deep link | Mobile | P1 | 1d |
| 3.2 | Web mobile navigation | Web | P1 | 4h |
| 3.3 | Wire notification routes on web | Web | P2 | 2h |
| 3.4 | Push tap → booking detail | Mobile | P2 | 4h |
| 3.5 | Respect notify_reminders locally | Mobile | P2 | 2h |
| 3.6 | Owner hasSalon gate (both clients) | Mobile/Web | P2 | 4h |
| 3.7 | Expo push receipt cleanup | Backend | P2 | 1d |
| 3.8 | Trim requirements.txt | Backend | P2 | 2h |

**Exit criteria:** Closed beta with 20 users; <5 P0 bugs open.

---

## Phase 4: Scale prep (Weeks 4–6) — Post-MVP

| # | Task | Module |
|---|------|--------|
| 4.1 | Async Supabase httpx client | Backend |
| 4.2 | Slot query caching (Redis) | Backend |
| 4.3 | CRA → Vite migration | Web |
| 4.4 | MVVM hooks extraction (customer screens) | Mobile |
| 4.5 | pytest suite for booking engine | Backend |
| 4.6 | Web Razorpay checkout | Web |
| 4.7 | Migration numbering cleanup | DB |

---

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Razorpay integration delay | Medium | High | Ship cash-only beta first |
| Play policy rejection (permissions) | Medium | High | Strip permissions early |
| Double booking in prod | Low | Critical | UNIQUE index + FOR UPDATE |
| Web 403 when signing on | High | Medium | Phase 0.2 |

---

## Success metrics

| Metric | Beta target | Production target |
|--------|-------------|-------------------|
| Booking success rate | >95% | >98% |
| Payment success (Razorpay) | >90% | >95% |
| Push delivery | >80% | >90% |
| Crash-free sessions | >99% | >99.5% |
| API p95 latency | <1s | <500ms |
