# TrimiT — Permanent release build guide (Android)

**Verified working:** `build-1778950057693.apk`, `build-1779034030001.aab` (May 2026).

**Default path:** local builds only (Expo EAS **cloud** free quota exhausted). Play Store steps: [docs/PLAY_STORE_DEPLOYMENT_GUIDE.md](../docs/PLAY_STORE_DEPLOYMENT_GUIDE.md).

Always use these commands. Do **not** run raw `eas build --local` without the scripts.

---

## What was blocking the app (root cause)

| # | Problem | Why Expo Go worked | Why APK crashed |
|---|---------|-------------------|-----------------|
| **1** | **Env vars not in the APK** | Metro reads `mobile/.env` on your Mac | EAS local build **does not copy** `.env` (gitignored). Old `eas.json` used `"$EXPO_PUBLIC_*"` which became **empty or literal `$...` strings** when Expo dashboard vars were missing. |
| **2** | **Empty Supabase + Google Maps keys** | N/A | Invalid/missing native Maps config + broken auth → **instant crash** on launch. |
| **3** | (Earlier) R8/shrink/New Arch/Sentry | Dev vs release | Secondary; hardened in `app.config.js`, `proguard-rules.pro`, `startupGuards.ts`. |

**The fix that made your app open:** building with **real** `EXPO_PUBLIC_SUPABASE_*` and `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` embedded via:

1. `npm run build:apk:local` → loads `mobile/.env` into the shell  
2. EAS **preview** environment on expo.dev (backup)  
3. `app.config.js` → `expo.extra` + Metro bundle  
4. **No** `"$EXPO_PUBLIC_*"` placeholders in `eas.json`

---

## Permanent settings (do not revert)

### Build commands

```bash
cd mobile
npm run verify:env       # loads .env, fails fast if keys missing
npm run build:apk:local  # preview APK (~10–30 min)
npm run build:aab:local  # production AAB for Play Store
```

### Files that enforce this

| File | Role |
|------|------|
| `scripts/load-env-for-build.sh` | Sources `.env`, sets defaults |
| `scripts/verify-build-env.js` | Loads `.env`, blocks build if keys missing |
| `scripts/ensure-node-22.sh` | Uses fnm/nvm Node 22 (matches `eas.json`) |
| `scripts/build-apk-local.sh` / `build-aab-local.sh` | Wired entry points |
| `scripts/sync-env-to-dotenv.js` | `eas-build-post-install` hook on EAS |
| `eas.json` | **No** `$EXPO_PUBLIC_*` in `env`; only flags + `NODE_ENV` |
| `app.config.js` | Loads `.env`, validates release keys, `expo.extra`, ProGuard |
| `src/lib/buildConfig.ts` | Runtime reads baked config |
| `.nvmrc` / `.fnmrc` | Node 22 |
| `env.example` | Template for new machines |

### `app.config.js` release hardening

- `newArchEnabled: false`
- `enableShrinkResourcesInReleaseBuilds: false`
- ProGuard rules in `proguard-rules.pro`
- Sentry plugin only if `EXPO_PUBLIC_SENTRY_DSN` is set
- `runtimeVersion: '1.0.0'` (no expo-updates policy warning)

### After every APK/AAB

```bash
adb uninstall com.trimit.app
adb install build-*.apk
```

---

## One-time machine setup

```bash
brew install fnm
echo 'eval "$(/opt/homebrew/bin/fnm env)"' >> ~/.zshrc
fnm install 22 && fnm use 22
cd mobile && cp env.example .env   # fill keys
./scripts/push-expo-env.sh         # Expo cloud builds
```

---

## Expo dashboard env (cloud + backup for local)

Required on expo.dev → **trimit** → Environment variables (preview + production):

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`
- `EXPO_PUBLIC_API_URL`
- `EXPO_PUBLIC_PUBLIC_SITE_URL`
- `EXPO_PUBLIC_SENTRY_DSN` (optional)

---

## Build log warnings (safe to ignore)

- **npm deprecated** (glob, uuid, tar) — transitive from Expo/Jest; not fixable without upstream bumps.
- **NODE_ENV=production** during install — EAS still runs `npm ci --include=dev`; build succeeded.
- **ANDROID_NDK_HOME** — not needed for this app.
- **Gradle JVM metaspace** — increased in `app.config.js`; build completed successfully.

## Build log issues fixed in repo

- **expo-doctor: eas-cli in project** — removed from `devDependencies`; use `eas.json` `cli.version` + `npx eas-cli@18.13.0`.
- **prebuildCommand** — removed (was run as `expo node ... --platform` and failed).

---

See also: [APK_CRASH_DEBUG.md](../APK_CRASH_DEBUG.md), [APK_CRASH_FIX.md](../APK_CRASH_FIX.md)

---

## Android remote push (FCM) — required for Play / preview APK tray alerts

**Stack:** Expo Push API → **FCM** on Android (not a separate “Notify” product).

| What you see | What it actually is |
|--------------|---------------------|
| Owner Accept modal while app open | Supabase **Realtime** (works without FCM) |
| Tray push when app background/killed | Expo Push → **FCM** (needs Firebase) |
| Customer “appointment soon” on Expo Go | Often **local** `scheduleBookingReminder` on device — **not** proof FCM works |

### One-time setup (ops)

1. [Firebase Console](https://console.firebase.google.com/) → project (or create) → add Android app `com.trimit.app`
2. Download **google-services.json** → save as `mobile/google-services.json`
3. Firebase → Project settings → Service accounts → Generate new private key (FCM V1 JSON)
4. [expo.dev](https://expo.dev) → TrimiT project → Credentials → Android → **FCM V1 service account** → upload that JSON
5. Verify: `cd mobile && npm run verify:android-push`
6. Rebuild: `npm run build:apk:local` (or AAB) and reinstall

Without steps 1–4, owners will keep getting **only** the in-app modal when the dashboard is open.
