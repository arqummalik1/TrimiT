# Web Audit (Create React App)

**Deploy:** Vercel (`vercel.json` SPA rewrite)  
**Stack:** React 19, React Router 7, TanStack Query 5, Zustand, Tailwind

---

## Production readiness: **Partial (55%)**

Web portal supports owner operations and basic customer booking but lags mobile on payments, architecture, and mobile UX.

---

## Auth audit

| Flow | Status | File |
|------|--------|------|
| Login | ✅ | `LoginPage.js` |
| Signup + role | ✅ | `SignupPage.js` |
| Session persist | ✅ | `authStore.js` + `trimit-auth` |
| Bootstrap | ✅ | `initializeAuth` → `/auth/me` |
| Logout | ⚠️ | No Query cache clear |
| Forgot password | ✅ | `ForgotPasswordPage.js` |
| Reset password | ✅ | `ResetPasswordPage.js` + `recoveryToken.js` |
| Account delete | ✅ | `AccountPage.js` |
| Protected routes | ✅ | `App.js` `ProtectedRoute` |

### Bugs
- `LoginPage` passes `rememberMe` to `login()` but store accepts 2 args only.
- `MyBookings.js` uses `<Bell />` without import — **runtime crash** on status banner.

### Gaps vs mobile
| Gap | Severity |
|-----|----------|
| No API request signing | **Critical** if backend enforces |
| JWT in localStorage | High (XSS) |
| No Supabase session sync | Medium (realtime may miss events) |
| No refresh token storage | Medium |
| No notification preferences UI | Low |
| Owner `hasSalon` not enforced on routes | Medium |

---

## Route map

**Registered (`App.js`):**
- Public: `/`, `/login`, `/signup`, legal
- Customer: `/discover`, `/salon/:id`, `/booking/:salonId/:serviceId`, `/my-bookings`, `/account`
- Owner: `/owner/dashboard`, `/owner/salon`, `/owner/services`, `/owner/bookings`, `/owner/settings`

**Orphaned (exist but not routed):**
- `CustomerNotifications.js` → `/notifications`
- `OwnerNotifications.js` → `/owner/notifications`

`NotificationBell.js` links to these — **404 for users**.

---

## Booking audit

| Step | Implementation | Gap |
|------|----------------|-----|
| Discover | Geolocation + `GET /salons/` | Map is placeholder |
| Salon detail | `GET /salons/:id` | OK |
| Slots | `GET /bookings/slots` | No realtime invalidation |
| Create | `POST /bookings/` | **cash only** (`salon_cash`) |
| My bookings | List + cancel | Realtime without `setAuth` |
| Owner manage | Accept/reject/complete | OK |

**Marketing mismatch:** `LandingPage.js` promises secure online payments — web cannot deliver Razorpay.

---

## MVVM compliance: **Fail**

- No repositories or data hooks (except `useNotificationSound.js`).
- All pages use inline `useQuery`/`useMutation` with direct `api` import.
- `NotificationBell.js` patches bookings directly.

---

## Responsive design

| Aspect | Status |
|--------|--------|
| Tailwind breakpoints | ✅ Used |
| Viewport meta | ✅ `index.html` |
| Mobile navigation | ❌ Header nav hidden below `md` — no hamburger |
| Notification dropdown | ⚠️ Fixed `w-96` overflows small screens |
| Auth forms | ✅ `max-w-md` centered |

---

## SEO

| Item | Status |
|------|--------|
| Static title/description | ✅ `index.html` only |
| Per-route meta | ❌ |
| Open Graph / Twitter | ❌ |
| Sitemap | ❌ |
| SSR/SSG | ❌ (CRA SPA) |

Acceptable for authenticated app portal; poor for marketing/discover pages.

---

## Security

| Risk | Detail |
|------|--------|
| Token in localStorage | XSS exfiltration |
| Console logging all API calls | `api.js` — remove for prod |
| No CSP headers documented | Add in Vercel |
| Source maps in prod | Set `GENERATE_SOURCEMAP=false` |

---

## Pre-launch web checklist

- [ ] Implement HMAC signing in `api.js` (mirror mobile)
- [ ] Fix `Bell` import in `MyBookings.js`
- [ ] Wire notification routes OR remove bell links
- [ ] Remove/guard `console.log` in `api.js`
- [ ] Add mobile nav drawer for `<md`
- [ ] Clear React Query on logout
- [ ] Sync Supabase auth for realtime
- [ ] Align marketing copy with cash-only OR add Razorpay

---

## CRA technical debt

`react-scripts 5` is end-of-life. Plan Vite migration post-launch (1–2 days).
