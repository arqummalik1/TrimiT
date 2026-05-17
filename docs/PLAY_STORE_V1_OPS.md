# Play Store v1 — Operations checklist

> **Full beginner guide (AAB + keystore + Play upload):** [PLAY_STORE_DEPLOYMENT_GUIDE.md](./PLAY_STORE_DEPLOYMENT_GUIDE.md)

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

## 3. Expo environment variables

After clearing the dashboard, re-add variables — see **[EXPO_ENV_SETUP.md](./EXPO_ENV_SETUP.md)** (Plain text vs Sensitive; do not use Secret on `EXPO_PUBLIC_*`).

| Variable | Visibility | Example |
|----------|------------|---------|
| `EXPO_PUBLIC_API_URL` | Plain text | `https://trimit-az5h.onrender.com` |
| `EXPO_PUBLIC_SUPABASE_URL` | Plain text | Your Supabase URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Sensitive | Anon key only |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | Sensitive | Maps key |
| `EXPO_PUBLIC_PUBLIC_SITE_URL` | Plain text | `https://trimit.online` |
| `EXPO_PUBLIC_SENTRY_DSN` | Sensitive | Optional |

`EXPO_PUBLIC_ENABLE_ONLINE_PAY=false` is in `eas.json` for production builds.

## 4. Production build

```bash
cd mobile
eas build --profile production --platform android
```

## 5. Store listing ASO (before or with first upload)

Paste into Play Console → **Main store listing**:

- **[PLAY_STORE_LISTING_COPY.md](./PLAY_STORE_LISTING_COPY.md)** — title, short/full description, screenshot headlines
- **[PLAY_STORE_ASO.md](./PLAY_STORE_ASO.md)** — keyword strategy, Hindi (hi-IN), category **Beauty**, tags

## 6. Play Console

Follow [`PLAY_CONSOLE_CHECKLIST.md`](./PLAY_CONSOLE_CHECKLIST.md):

- Data Safety form
- Content rating (IARC)
- Privacy URL: https://trimit.online/privacy
- Account deletion URL: https://trimit.online/contact
- Reviewer credentials (customer + owner with salon)
- Upload AAB to **internal testing**
- Review pre-launch report

## 7. Maps key restriction (after first upload)

GCP → Credentials → Android restriction:

- Package: `com.trimit.app`
- SHA-1: upload keystore + Play App Signing certificate

## 8. Go / no-go

- [ ] [`docs/qa/CASH_E2E_V1.md`](./qa/CASH_E2E_V1.md) signed off
- [ ] No P0 crashes in pre-launch report
- [ ] Legal URLs return HTTP 200
