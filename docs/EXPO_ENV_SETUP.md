# Expo environment variables — setup after reset

You cleared all variables in the Expo dashboard. Add back **only** these (v1 cash-only app).

**Do not add** (removed from project):

- `EXPO_PUBLIC_API_SIGNING_SECRET` — not used (backend HMAC signing disabled)
- `EXPO_PUBLIC_API_URL_PROD` — duplicate of `EXPO_PUBLIC_API_URL`

---

## Option A — Expo website (manual)

1. [expo.dev](https://expo.dev) → **arqummalik1** → project **trimit**
2. **Project settings** → **Environment variables** → **Create**
3. For each row below: set **Environments** = development, preview, production

| Name | Visibility | Value (from your `mobile/.env`) |
|------|------------|----------------------------------|
| `EXPO_PUBLIC_API_URL` | **Plain text** | `https://trimit-az5h.onrender.com` |
| `EXPO_PUBLIC_SUPABASE_URL` | **Plain text** | Your Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | **Sensitive** | Supabase **anon** public key |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | **Sensitive** | Google Maps API key |
| `EXPO_PUBLIC_SENTRY_DSN` | **Sensitive** | Sentry DSN (crash reporting in production) |
| `SENTRY_AUTH_TOKEN` | **Sensitive** | Sentry API token for EAS source map uploads ([create token](https://sentry.io/settings/account/api/auth-tokens/) — scopes: `project:releases`, `org:read`) |
| `EXPO_PUBLIC_PUBLIC_SITE_URL` | **Plain text** | `https://trimit.online` |

**Never use “Secret”** for names starting with `EXPO_PUBLIC_` — Expo will warn you, and those values are still embedded in the app.

`EXPO_PUBLIC_ENABLE_ONLINE_PAY` is already `false` in [`mobile/eas.json`](../mobile/eas.json) for production builds — you do not need a dashboard row unless you prefer to override it.

**Outcome:** No yellow warnings; production `eas build` gets API + Supabase + Maps.

---

## Option B — CLI (from `mobile/.env`)

```bash
cd mobile
chmod +x scripts/push-expo-env.sh
./scripts/push-expo-env.sh
```

Uses correct **plaintext** / **sensitive** visibility automatically.

---

## Android keystore (separate from env vars)

Signing is under **Credentials**, not Environment variables.

```bash
cd mobile
npx eas-cli credentials -p android
```

→ **production** → **Keystore** → set up new or upload `credentials/android/keystore.jks`

See [PLAY_STORE_DEPLOYMENT_GUIDE.md](./PLAY_STORE_DEPLOYMENT_GUIDE.md) Phase 3.

---

## Verify

```bash
cd mobile
npx eas-cli env:list --environment production
```

You should see the six variables above (no duplicates, no `EXPO_PUBLIC_*` with Secret visibility).
