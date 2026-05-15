# Google Play Console checklist (TrimiT)

Use this when completing **App content** before production release.

## URLs (after `trimit.app` is deployed)

| Field | URL |
|-------|-----|
| Privacy policy | https://trimit.app/privacy |
| Account deletion | https://trimit.app/contact |

## Data safety (summary)

| Data type | Collected | Optional | Shared | Purpose |
|-----------|-----------|----------|--------|---------|
| Name | Yes | No | Salons you book | Account, bookings |
| Email | Yes | No | Salons you book | Account, login |
| Phone | Yes | No | Salons you book | Account, contact |
| User IDs | Yes | No | Supabase | Authentication |
| Precise location | Yes | Yes | No | Nearby salon discovery |
| Photos | Owners only | No | Hosting | Salon listings |
| Purchase history | Yes | No | Razorpay | Payments |
| Crash logs | If Sentry DSN set | No | Sentry | Stability |
| Device/other IDs | Push token | No | Expo/FCM | Notifications |
| User-generated content | Reviews | No | Public on salon | Ratings |

- **Encryption in transit:** Yes (HTTPS)
- **Account deletion:** Yes (in-app + web + email)
- **Data sold:** No

## Declarations

- **Target audience:** 18+; not designed for children
- **Ads:** No (unless you add ads later)
- **Financial features:** Yes — payments for physical salon services via Razorpay (not Play Billing)
- **UGC:** Yes — reviews; moderated via support email (privacy@trimit.app)
- **Sensitive permissions:** Location (while in use), Camera/Photos (owners), Notifications

## Permissions (Android)

| Permission | Reason |
|------------|--------|
| Fine/coarse location | Find nearby salons |
| Camera / read media images | Owner salon photos |
| Post notifications | Booking alerts |

## Pre-upload testing

- [ ] Internal track AAB installed on physical device
- [ ] Signup with terms checkbox
- [ ] Book + pay (Razorpay) or cash flow
- [ ] Delete account (customer Profile, owner Settings)
- [ ] Legal URLs load on device browser

## DNS (trimit.app)

Point `trimit.app` to your Render static site (`trimit-frontend`) or Vercel project. Enable HTTPS. Verify `/privacy` shows TrimiT salon policy (not trimit.com).

## Deferred (your note)

- EAS `EXPO_PUBLIC_API_SIGNING_SECRET` must match Render `API_SIGNING_SECRET` before production API mutations work.
