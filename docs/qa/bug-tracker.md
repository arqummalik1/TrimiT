# Bug Tracker

> Copy rows into [NOTION_LAUNCH_HQ.md](../NOTION_LAUNCH_HQ.md) Bug Tracker table for daily use.

**Legend:** 🔴 P0 (blocker) · 🟠 P1 (major) · 🟡 P2 (minor) · 🟢 P3 (cosmetic)

---

## Open bugs

| ID | Bug | Severity | Platform | Status | Fix reference |
|----|-----|----------|----------|--------|---------------|
| BUG-001 | Razorpay orders mocked — real payments fail | 🔴 P0 | Backend | Open | `routers/payments.py` |
| BUG-002 | Rate limiter decorators not wired | 🔴 P0 | Backend | Open | `server.py`, `core/limiter.py` |
| BUG-003 | Staff API crashes (wrong Supabase client API) | 🔴 P0 | Backend | Open | `routers/staff.py` |
| BUG-004 | Web mutations 403 when API signing enabled | 🔴 P0 | Web | Open | `lib/api.js` |
| BUG-005 | `MyBookings.js` — `Bell` not imported | 🔴 P0 | Web | Open | `MyBookings.js:172` |
| BUG-006 | No slot-level UNIQUE — double-book race | 🔴 P0 | DB | Open | New migration 25 |
| BUG-007 | RPC `create_atomic_booking` callable by anon | 🔴 P0 | DB | Open | REVOKE + uid check |
| BUG-008 | Pending Razorpay bookings block slots forever | 🟠 P1 | Backend | Open | Sweeper job |
| BUG-009 | Payment verify no booking ownership check | 🟠 P1 | Backend | Open | `payments.py` |
| BUG-010 | Play debug keystore / not upload key | 🟠 P1 | Mobile | Open | `eas credentials` |
| BUG-011 | Mobile assets (icons) not in git — build risk | 🟠 P1 | Mobile | Open | `assets/` |
| BUG-012 | apiClient default port 8000 vs docs 8001 | 🟡 P2 | Mobile | Open | `apiClient.ts` |
| BUG-013 | `forgotPassword` swallows errors in authStore | 🟡 P2 | Mobile | Open | `authStore.ts:169-179` |
| BUG-014 | Notification routes 404 on web | 🟡 P2 | Web | Open | `App.js` |
| BUG-015 | `notify_reminders` ignored for local schedule | 🟡 P2 | Mobile | Open | `notifications.ts` |
| BUG-016 | Push tap doesn't open booking detail | 🟡 P2 | Mobile | Open | `notificationNavigation.ts` |
| BUG-017 | LoginPage rememberMe arity mismatch | 🟡 P2 | Web | Open | `LoginPage.js` |
| BUG-018 | Signup terms unchecked — silent return | 🟡 P2 | Web | Open | `SignupPage.js` |
| BUG-019 | Web API logs all requests in production | 🟡 P2 | Web | Open | `api.js` |
| BUG-020 | Duplicate `initializeAuth` on cold start | 🟢 P3 | Mobile | Open | `App.tsx`, `authStore.ts` |
| BUG-021 | `staff_performance` SECURITY DEFINER view ERROR | 🟠 P1 | DB | Open | Supabase advisor |

---

## Fixed bugs (template)

| ID | Bug | Fixed in | Date |
|----|-----|----------|------|
| — | — | — | — |

---

## Bug intake rules

1. **P0:** Blocks launch, payment, auth, or data loss — fix same day
2. **P1:** Major feature broken — fix within sprint
3. **P2:** Workaround exists — schedule in Phase 3
4. **P3:** Polish — backlog

**Screenshot:** Attach Play pre-launch report or Sentry link in Notes column.
