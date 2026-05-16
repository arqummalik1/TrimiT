# Sprint Plan — 2-Week Launch Sprint

**Sprint goal:** Production-safe backend + Play Store internal track  
**Dates:** Week 1–2 (adjust start date when sprint begins)

---

## Sprint 1 (Week 1): Backend hardening + beta unblock

### Monday
| Task | Owner | Hours |
|------|-------|-------|
| Wire SlowAPI | BE | 1 |
| Web signing or disable middleware | BE/Web | 3 |
| Fix MyBookings Bell bug | Web | 0.5 |
| Verify EAS env + assets | Mobile | 3 |

### Tuesday
| Task | Owner | Hours |
|------|-------|-------|
| Razorpay order.create integration | BE | 6 |
| Store razorpay_order_id on booking | BE | 2 |

### Wednesday
| Task | Owner | Hours |
|------|-------|-------|
| Payment verify authz + amount | BE | 4 |
| Pending booking sweeper SQL + cron | BE/DB | 4 |

### Thursday
| Task | Owner | Hours |
|------|-------|-------|
| Migration 25 slot UNIQUE index | DB | 2 |
| RPC auth hardening migration 26 | DB | 4 |
| Apply + verify on staging Supabase | DB | 2 |

### Friday
| Task | Owner | Hours |
|------|-------|-------|
| E2E cash + Razorpay test script | QA | 4 |
| Fix staff router or disable | BE | 4 |
| Sprint 1 retro + bug triage | All | 1 |

**Sprint 1 deliverable:** Staging backend passes payment + booking tests.

---

## Sprint 2 (Week 2): Play Store + closed beta

### Monday
| Task | Owner | Hours |
|------|-------|-------|
| eas credentials keystore | Mobile | 2 |
| Permission strip plugin | Mobile | 4 |

### Tuesday
| Task | Owner | Hours |
|------|-------|-------|
| R8 release build + smoke test | Mobile | 6 |
| Maps key restriction | Ops | 1 |

### Wednesday
| Task | Owner | Hours |
|------|-------|-------|
| Data Safety form draft | Ops | 3 |
| Store screenshots + copy | Design | 4 |

### Thursday
| Task | Owner | Hours |
|------|-------|-------|
| Internal track upload | Mobile | 2 |
| Pre-launch report triage | QA | 4 |
| Account deletion E2E | QA | 2 |

### Friday
| Task | Owner | Hours |
|------|-------|-------|
| Invite 10 beta users | Product | 2 |
| Monitor Sentry + fix P0s | All | 4 |
| Sprint 2 demo + go/no-go | All | 1 |

**Sprint 2 deliverable:** Internal track build + 10 beta users onboarded.

---

## Daily ceremony

- **Standup:** 15 min — use [NOTION_LAUNCH_HQ.md](../NOTION_LAUNCH_HQ.md) standup template
- **Bug triage:** EOD if any P0/P1 open
- **Deploy:** Staging backend after each merged PR; mobile EAS build Wed/Fri

---

## Definition of Done (sprint)

- [ ] Code reviewed and merged to `main`
- [ ] Tested on staging (or local + Render preview)
- [ ] No new P0 bugs introduced
- [ ] Docs updated if API/env changed
