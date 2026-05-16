# UI/UX Audit

---

## Design system

| App | System | Consistency |
|-----|--------|-------------|
| Mobile | Custom theme (`theme/`), tokens, light/dark | ★★★★☆ Strong |
| Web | Tailwind + Radix primitives | ★★★☆☆ Adequate |

Mobile has richer components (skeletons, error states, offline banner). Web is functional but less polished on small screens.

---

## Customer journey UX

### Mobile — Strong
- Discover map/list with location primer
- Clear booking steps (date → slot → staff → pay)
- Hold timer creates urgency
- Toast + error handler for network failures
- Session expired modal

### Web — Gaps
- No mobile navigation menu
- Map advertised but not implemented
- Booking button shows card icon for cash-only
- Fewer loading error states on discover/dashboard

---

## Owner journey UX

### Mobile
- Dashboard with charts
- Realtime booking modal + sound
- Manage bookings accept/reject flow
- Settings consolidated

### Web
- Functional dashboard and manage screens
- Realtime on dashboard
- No push (expected) — relies on page open

**Gap:** Owner without salon — web/mobile should redirect to create-salon wizard.

---

## Accessibility

| Check | Mobile | Web |
|-------|--------|-----|
| Touch targets | ✅ Generally 44pt+ | ⚠️ Small icon buttons |
| `accessibilityLabel` | ⚠️ Partial coverage | ⚠️ Partial |
| Color contrast | ✅ Theme tokens | ⚠️ Not audited |
| Screen reader booking flow | ❌ Not tested | ❌ Not tested |
| Keyboard nav | n/a | ⚠️ Dropdown traps |

**Recommendation:** Run Play pre-launch report + axe on web before public launch.

---

## Error & empty states

| Screen | Mobile | Web |
|--------|--------|-----|
| Discover (no location) | ✅ Primer | ✅ Message |
| Discover (no salons) | ✅ Empty | ⚠️ Basic |
| Salon load fail | ✅ ErrorState | ✅ Error UI |
| Slots empty | ✅ Message | ✅ Message |
| Network offline | ✅ OfflineBanner | ❌ No banner |
| Auth errors | ✅ Inline + toast | ✅ Inline |

---

## Consistency issues

1. **Domain branding:** `trimi-t.vercel.app` vs `trimit.app` in legal links.
2. **Payment UX:** Mobile offers Razorpay + cash; web cash only — confusing if users switch devices.
3. **Terminology:** "Complete" vs "Completed" — verify copy alignment.
4. **Date/time format:** Ensure timezone labels shown (salon timezone).

---

## UX priorities before launch

| Priority | Item | Effort |
|----------|------|--------|
| P0 | Web mobile nav (hamburger) | 4h |
| P0 | Owner salon creation gate | 4h |
| P1 | Align payment messaging on web | 1h |
| P1 | Fix notification 404 links | 1h |
| P2 | Accessibility pass on booking flow | 1d |
| P2 | Unified empty state components on web | 4h |

---

## Positive patterns to preserve

- Mobile skeleton loaders during fetch
- `useMinLoadingTime` prevents flash of loading
- Permission primers before location/camera
- Legal screens shared content from `shared/legal/`
- Theme-aware components (dark mode)
