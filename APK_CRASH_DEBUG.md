# Debug release APK/AAB crash (Expo Go works, APK closes instantly)

## Why Expo Go works but APK does not

| | Expo Go | Release APK/AAB |
|---|---------|-----------------|
| JS bundle | Dev server + your `.env` via Metro | **Baked at build time** |
| Native code | Expo Go shell | Your app + Maps + Sentry native |
| Env vars | `mobile/.env` on your machine | **Only what was set when you ran `eas build`** |

**Most common root cause:** `mobile/.env` is **gitignored** and **not uploaded** to EAS. If Expo dashboard env vars were cleared, the APK is built with **empty** `EXPO_PUBLIC_SUPABASE_*` and **empty** `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` → native Maps/startup crash or broken auth.

Expo Go still reads your local `.env` → looks fine.

---

## Fix (do this before the next 1-hour build)

### 1. Confirm `mobile/.env` exists

```bash
cd mobile
cp env.example .env   # if needed — then fill real values
```

Required keys:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`

### 2. Verify env (30 seconds)

```bash
cd mobile
npm run verify:env
```

Must show ✓ for all three required vars.

### 3. Build with env loaded automatically

```bash
cd mobile
npm run build:apk:local    # preview APK
# or
npm run build:aab:local    # Play Store AAB
```

Scripts run `scripts/load-env-for-build.sh` → sources `.env` → **fails fast** if keys missing.

**Do not** put `"$EXPO_PUBLIC_*"` in `eas.json` `env` — EAS treats those as Expo-dashboard references and passes literal `$EXPO_PUBLIC_...` strings when dashboard vars are empty (prebuild then fails).

### 4. Push env to Expo (for cloud builds)

```bash
cd mobile
./scripts/push-expo-env.sh
npx eas-cli env:list --environment production
```

### 5. Install cleanly

```bash
adb uninstall com.trimit.app
adb install build-XXXXXXXX.apk
```

---

## Debug **before** building APK (recommended)

### A. Run release-like JS locally (fast)

```bash
cd mobile
npx expo start --no-dev --minify
```

Open on device with Expo Go — closer to production JS (still not identical to standalone APK).

### B. Development build (middle ground)

```bash
cd mobile
npx expo run:android --variant release
```

Uses local `.env` + native binary on device; crashes here usually match APK.

### C. Capture crash log from device (definitive)

Phone: **Settings → Developer options → USB debugging** ON, USB to Mac.

```bash
adb devices
adb logcat -c
adb shell am start -n com.trimit.app/.MainActivity
adb logcat *:E | grep -iE "trimit|ReactNative|AndroidRuntime|FATAL|Maps|Sentry|Hermes"
```

Look for:

- `FATAL EXCEPTION` → native crash (often Maps key, Sentry, ProGuard)
- `Invariant Violation` / `TypeError` → JS crash
- `API key not found` → Google Maps not embedded in manifest

Save log:

```bash
adb logcat -d > ~/Desktop/trimit-crash.log
```

### D. Check what was baked into the last APK

After build, in Metro bundle phase logs, search for:

`EXPO_PUBLIC_SUPABASE_URL`

If empty during build, the APK will crash or show **“This build is missing configuration”** (new guard screen).

---

## What we changed in the repo

1. **`scripts/load-env-for-build.sh`** — sources `.env` before `eas build --local`
2. **`scripts/verify-build-env.js`** — blocks build if Supabase/Maps missing
3. **`app.config.js`** — loads `.env` at config time; **throws** on release build if keys missing; Sentry plugin only if DSN set
4. **`src/lib/buildConfig.ts`** — reads `expo.extra` + env; release screen if config missing
5. **`npm run build:apk:local`** / **`build:aab:local`** — use scripts above

---

## Checklist

- [ ] `mobile/.env` filled (copy from `env.example`)
- [ ] `npm run verify:env` passes
- [ ] `./scripts/push-expo-env.sh` (if using EAS cloud)
- [ ] Uninstall old APK
- [ ] `npm run build:apk:local`
- [ ] If still crashes: `adb logcat` and share `FATAL` block

---

## Still crashing after env fix?

1. Clear app data: Settings → Apps → TrimiT → Storage → Clear storage  
2. Confirm ProGuard / New Arch fixes in `app.config.js` (`newArchEnabled: false`, resource shrink off)  
3. Temporarily remove Sentry from build (unset `EXPO_PUBLIC_SENTRY_DSN`) and rebuild  
4. Share `adb logcat` FATAL section for next fix
