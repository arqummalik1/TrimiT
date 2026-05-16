# Testing Checklist

Manual QA matrix before each release. Check ✅ when passed on **staging** with date + tester initials.

---

## Authentication

| # | Test | Mobile | Web | Pass |
|---|------|--------|-----|------|
| A1 | Sign up customer | ☐ | ☐ | |
| A2 | Sign up owner | ☐ | ☐ | |
| A3 | Email confirmation flow | ☐ | ☐ | |
| A4 | Login valid credentials | ☐ | ☐ | |
| A5 | Login invalid password | ☐ | ☐ | |
| A6 | Session persists after kill app | ☐ | ☐ | |
| A7 | Session persists after browser refresh | n/a | ☐ | |
| A8 | Logout clears session | ☐ | ☐ | |
| A9 | 401 shows session expired (mobile) / redirect (web) | ☐ | ☐ | |
| A10 | Forgot password email received | ☐ | ☐ | |
| A11 | Reset password (web full flow) | n/a | ☐ | |
| A12 | Wrong role cannot access owner routes | ☐ | ☐ | |
| A13 | Delete account E2E | ☐ | ☐ | |

---

## Customer booking

| # | Test | Mobile | Web | Pass |
|---|------|--------|-----|------|
| B1 | Discover with location granted | ☐ | ☐ | |
| B2 | Discover with location denied | ☐ | ☐ | |
| B3 | View salon detail + services | ☐ | ☐ | |
| B4 | Load slots for date | ☐ | ☐ | |
| B5 | Slot hold timer works | ☐ | n/a | |
| B6 | Book cash — success | ☐ | ☐ | |
| B7 | Book Razorpay — success | ☐ | n/a | |
| B8 | Concurrent slot — second user blocked | ☐ | ☐ | |
| B9 | Cancel pending booking | ☐ | ☐ | |
| B10 | Reschedule booking | ☐ | n/a | |
| B11 | Realtime slot update (2 devices) | ☐ | n/a | |
| B12 | Apply valid promo code | ☐ | n/a | |
| B13 | Review after completed | ☐ | n/a | |

---

## Owner flows

| # | Test | Mobile | Web | Pass |
|---|------|--------|-----|------|
| O1 | Create salon profile | ☐ | ☐ | |
| O2 | Add/edit/delete service | ☐ | ☐ | |
| O3 | Receive new booking alert | ☐ | ☐ | |
| O4 | Accept booking | ☐ | ☐ | |
| O5 | Reject booking | ☐ | ☐ | |
| O6 | Complete booking | ☐ | ☐ | |
| O7 | Dashboard stats load | ☐ | ☐ | |
| O8 | Create promo code | ☐ | n/a | |
| O9 | Manage staff | ☐ | n/a | |

---

## Notifications

| # | Test | Mobile | Pass |
|---|------|--------|------|
| N1 | Register push token after login | ☐ | |
| N2 | Owner push on new booking | ☐ | |
| N3 | Customer push on completed | ☐ | |
| N4 | Turn off push_enabled — no remote push | ☐ | |
| N5 | Turn off notify_booking_updates — no status push | ☐ | |
| N6 | Tap notification → bookings screen | ☐ | |
| N7 | Local reminder (if enabled) | ☐ | |

---

## Security smoke

| # | Test | Pass |
|---|------|------|
| S1 | Login rate limit triggers 429 | ☐ |
| S2 | Cannot verify payment for another user's booking | ☐ |
| S3 | Cannot access owner routes as customer | ☐ |

---

## Play Store (pre-upload)

| # | Test | Pass |
|---|------|------|
| P1 | Release AAB installs on physical device | ☐ |
| P2 | No debug banner / dev menu | ☐ |
| P3 | Location permission dialog shows rationale | ☐ |
| P4 | Privacy policy link opens HTTPS 200 | ☐ |
| P5 | Account deletion works in-app | ☐ |

---

## Regression after fix

When closing a P0 bug, re-run all tests in that section plus one full happy-path E2E.
