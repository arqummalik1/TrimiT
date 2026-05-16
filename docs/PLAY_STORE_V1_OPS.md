# Play Store v1 — Operations checklist

Engineering code for cash-only v1 is in place. Complete these **manual** steps to ship.

## 1. Commit mobile assets (if not in git)

Verify locally:

```bash
ls mobile/assets/SquareLogo.png mobile/assets/adaptive-icon.png
```

If missing from git remote, add and commit (required for EAS build on CI).

## 2. EAS upload keystore

```bash
cd mobile
eas credentials -p android
```

Production profile → create/upload keystore. **Back up** keystore + passwords.

## 3. EAS production secrets

Set in Expo dashboard for `production` profile:

| Secret | Example |
|--------|---------|
| `EXPO_PUBLIC_API_URL` | `https://trimit-az5h.onrender.com` |
| `EXPO_PUBLIC_SUPABASE_URL` | Your Supabase URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Anon key only |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | Restricted Maps key |
| `EXPO_PUBLIC_PUBLIC_SITE_URL` | `https://trimi-t.vercel.app` |
| `EXPO_PUBLIC_SENTRY_DSN` | Sentry mobile DSN |
| `EXPO_PUBLIC_ENABLE_ONLINE_PAY` | `false` (set in eas.json) |

## 4. Production build

```bash
cd mobile
eas build --profile production --platform android
```

## 5. Play Console

Follow [`PLAY_CONSOLE_CHECKLIST.md`](./PLAY_CONSOLE_CHECKLIST.md):

- Data Safety form
- Content rating (IARC)
- Privacy URL: https://trimi-t.vercel.app/privacy
- Account deletion URL: https://trimi-t.vercel.app/contact
- Reviewer credentials (customer + owner with salon)
- Upload AAB to **internal testing**
- Review pre-launch report

## 6. Maps key restriction (after first upload)

GCP → Credentials → Android restriction:

- Package: `com.trimit.app`
- SHA-1: upload keystore + Play App Signing certificate

## 7. Go / no-go

- [ ] [`docs/qa/CASH_E2E_V1.md`](./qa/CASH_E2E_V1.md) signed off
- [ ] No P0 crashes in pre-launch report
- [ ] Legal URLs return HTTP 200
