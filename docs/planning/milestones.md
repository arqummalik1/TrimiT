# MVP Milestones

---

## M1: MVP Stable (Internal)
**Target:** End of Week 1  
**Status:** 🔴 Not started

| Criteria | Measure |
|----------|---------|
| Cash booking E2E | Mobile + web pass test script |
| Auth persists 24h+ | Cold start `/auth/me` success |
| Owner accept/complete | Status transitions + push |
| Rate limits active | 429 after threshold on login |
| Zero P0 security open | Audit items C1–C4 addressed |

---

## M2: Production Ready (Backend)
**Target:** End of Week 2  
**Status:** 🔴 Not started

| Criteria | Measure |
|----------|---------|
| Razorpay live (staging keys) | 10 test payments success |
| Slot UNIQUE enforced | Concurrent booking test fails gracefully |
| RPC hardened | Supabase advisor: no anon on create_atomic_booking |
| Pending payments expire | Slots free after 15 min |
| Sentry receiving errors | Backend + mobile DSN configured |

---

## M3: Beta Launch (Closed)
**Target:** Week 3  
**Status:** 🔴 Not started

| Criteria | Measure |
|----------|---------|
| Internal Play track | Build uploaded |
| 20 beta users | Onboarded with feedback channel |
| Crash-free >99% | Sentry dashboard |
| Support process | Email/WhatsApp in contact.md tested |

---

## M4: Play Store Launch (Production)
**Target:** Week 5–6  
**Status:** 🔴 Not started

| Criteria | Measure |
|----------|---------|
| Data Safety approved | Play Console green |
| Content rating complete | IARC certificate |
| Production Razorpay | Live keys in Render + EAS |
| Store listing live | All assets uploaded |
| 7-day closed test | No P0 from pre-launch report |

---

## M5: Scaling Phase
**Target:** Month 2+  
**Status:** 🔴 Not started

| Criteria | Measure |
|----------|---------|
| 1000+ bookings/month | Analytics or DB count |
| API p95 <500ms | Sentry/APM |
| Async backend client | Deployed |
| Automated test suite | CI runs pytest + smoke |

---

## Milestone timeline (visual)

```
Week 1    Week 2    Week 3    Week 4-6    Month 2+
  |         |         |          |            |
  M1        M2        M3         M4           M5
 MVP      Prod      Beta      Play Store   Scale
Stable    Ready     Launch    Launch
```
