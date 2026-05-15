# Google Play Console checklist (TrimiT)

Use this when completing **App content** before production release.

## URLs (Vercel or custom domain)

Live site: **https://trimi-t.vercel.app**

| Field | URL |
|-------|-----|
| Privacy policy | https://trimi-t.vercel.app/privacy |
| Terms | https://trimi-t.vercel.app/terms |
| Account deletion | https://trimi-t.vercel.app/contact |

Support: **admin@audentix.com** · **+91 70060 82958**

Set `REACT_APP_PUBLIC_SITE_URL` on Vercel to that base URL (no trailing slash), then redeploy.

For mobile in-app web link, set EAS secret `EXPO_PUBLIC_PUBLIC_SITE_URL` to the same URL before production build.

### Vercel deploy (quick)

1. [vercel.com](https://vercel.com) → **Add New** → **Project** → import GitHub repo **TrimiT**
2. **Root Directory:** `frontend`
3. **Framework Preset:** Create React App (auto-detected)
4. **Environment Variables** (Production):
   - `REACT_APP_BACKEND_URL` = `https://trimit-az5h.onrender.com`
   - `REACT_APP_SUPABASE_URL` = (your Supabase URL)
   - `REACT_APP_SUPABASE_ANON_KEY` = (your anon key)
5. Deploy → open `/privacy` and `/contact` on the assigned `*.vercel.app` URL
6. Render backend → `ALLOWED_ORIGINS` includes `https://trimi-t.vercel.app` (in `render.yaml`; redeploy backend if needed)

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
- **UGC:** Yes — reviews; moderated via admin@audentix.com
- **Sensitive permissions:** Location (while in use), Camera/Photos (owners), Notifications

## Permissions (Android)

| Permission | Reason |
|------------|--------|
| Fine/coarse location | Find nearby salons |
| Camera / read media images | Owner salon photos |
| Post notifications | Booking alerts |

## Supabase Auth (password reset)

In **Supabase → Authentication → URL Configuration**, add:

- **Site URL:** `https://trimi-t.vercel.app`
- **Redirect URLs:** `https://trimi-t.vercel.app/reset-password`, `http://localhost:3000/reset-password`

Set Render env **`PUBLIC_SITE_URL`** = `https://trimi-t.vercel.app` (in `render.yaml`).

## Pre-upload testing

- [ ] Internal track AAB installed on physical device
- [ ] Signup with terms checkbox
- [ ] Book + pay (Razorpay) or cash flow
- [ ] Delete account (customer Profile, owner Settings)
- [ ] Legal URLs load on device browser

## Optional: custom domain (`trimit.app`)

Later: Vercel → Project → **Domains** → add `trimit.app` → DNS at your registrar. Do **not** use `trimit.com` (different company).

## Deferred (your note)

- EAS `EXPO_PUBLIC_API_SIGNING_SECRET` must match Render `API_SIGNING_SECRET` before production API mutations work.
