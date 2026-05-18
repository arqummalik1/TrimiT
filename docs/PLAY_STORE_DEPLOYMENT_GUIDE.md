# TrimiT — Play Store deployment guide (beginner-friendly)

**Goal:** Build a signed **AAB** on your Mac, upload it to Google Play for your **v1 MVP** (cash-only bookings), and test with a local **APK** before you publish.

**Build approach (2026):** **Local builds only** — Expo’s free **EAS cloud build quota is used up**, so we compile on your machine with `npm run build:aab:local` / `npm run build:apk:local`. These scripts load `mobile/.env`, verify keys, and run `eas build --local` (no cloud minutes).

**Time:** First time: about **2–4 hours** (one local AAB compile ~15–45 min + Play Console forms).  
**App ID (package name):** `com.trimit.app`  
**Canonical build doc:** [mobile/BUILD_RELEASE.md](../mobile/BUILD_RELEASE.md)

---

## What you will end up with

| Step | Outcome |
|------|---------|
| Accounts ready | Google Play Developer account ($25 one-time) |
| `mobile/.env` filled | Production API keys baked into every local build |
| Upload keystore ready | Signs your AAB/APK (via EAS credentials on disk) |
| `npm run build:aab:local` | **`.aab` file** in `mobile/` (e.g. `build-1779034030001.aab`) — Play upload |
| `npm run build:apk:local` | **`.apk` file** for phone testing (push, booking smoke test) |
| Play Console app created | Listing + internal testing release |
| Production release (later) | Public listing on Google Play |

**Important:** Play Store wants an **AAB** for publishing. Use **APK** only for sideload testing on your phone before or between Play uploads.

---

## Glossary (plain English)

| Term | Meaning |
|------|---------|
| **AAB** | Android App Bundle — what Google Play installs from. |
| **APK** | Direct install file for testing on your device (USB / Drive). |
| **Local build** | `eas build --local` runs Gradle on **your Mac**; does **not** use Expo cloud quota. |
| **Keystore** | Password-protected file that signs releases. **Back it up** — same file for all future updates. |
| **Upload key** | Your keystore signs the AAB you upload; Google re-signs for users (Play App Signing). |
| **EAS CLI** | Expo tool that orchestrates local or cloud builds; we use **`npx eas-cli@18.13.0`** via npm scripts. |
| **Internal testing** | Play track for you and testers only — safest first upload. |
| **versionCode** | Integer that must **increase** every Play upload (`autoIncrement` in `eas.json` on local builds). |
| **versionName** | User-visible version in `mobile/app.config.js` (e.g. `1.0.0`). |

---

## Before you start (checklist)

### Accounts

| Account | Why | Cost |
|---------|-----|------|
| [Google Play Console](https://play.google.com/console) | Publish Android apps | **$25 one-time** |
| [Expo](https://expo.dev) | Optional — credentials / project link only (no cloud builds required) | Free |
| GitHub | TrimiT source | Free |

### On your Mac (required for local builds)

| Tool | Install | Check |
|------|---------|-------|
| **Node.js 22** | `fnm` / `nvm` — see `mobile/.nvmrc` | `node -v` → v22.x |
| **npm** | With Node | `npm -v` |
| **Android Studio** | [developer.android.com/studio](https://developer.android.com/studio) | SDK + platform tools installed |
| **ANDROID_HOME** | Set in `~/.zshrc` after Studio install | `echo $ANDROID_HOME` |
| **Java 17+** | Bundled with Android Studio | `java -version` |
| **Git** | [git-scm.com](https://git-scm.com) | `git --version` |

EAS CLI is invoked by npm scripts (`npx eas-cli@18.13.0`); a global `eas` install is optional.

### Services (verify in browser)

- Backend: `https://trimit-az5h.onrender.com/health`
- Privacy: https://trimit.online/privacy
- Terms: https://trimit.online/terms

### `mobile/.env` (required — not in git)

```bash
cd mobile
cp env.example .env
# Edit .env — fill Supabase + Google Maps keys
npm run verify:env
```

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_API_URL` | Render backend, e.g. `https://trimit-az5h.onrender.com` |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase **anon** key only |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | Maps (Android-restricted key recommended) |
| `EXPO_PUBLIC_PUBLIC_SITE_URL` | `https://trimit.online` |
| `EXPO_PUBLIC_ENABLE_ONLINE_PAY` | `false` for v1 (cash at salon) |
| `EXPO_PUBLIC_SENTRY_DSN` | Optional |

**Why `.env` matters:** Local EAS builds **do not** read a gitignored `.env` automatically. Our scripts (`load-env-for-build.sh`) export these into the shell **before** `eas build --local`, so the APK/AAB is not empty/crash on launch. See [BUILD_RELEASE.md](../mobile/BUILD_RELEASE.md).

---

## Phase 1 — One-time project setup

### Step 1.1 — Install dependencies

```bash
cd "/path/to/TrimiT/mobile"
npm install
```

### Step 1.2 — Verify environment

```bash
npm run verify:env
```

**Outcome:** Script confirms Supabase, Maps, and API URL are set.

### Step 1.3 — Expo login (credentials only)

Needed once for keystore management; **not** for cloud builds.

```bash
npx eas-cli@18.13.0 login
```

If the project is not linked:

```bash
npx eas-cli@18.13.0 init
```

### Step 1.4 — Confirm assets

```bash
ls assets/SquareLogo.png assets/adaptive-icon.png
```

---

## Phase 2 — Upload keystore (signing)

Google Play requires every release to be signed with the **same upload key**.

### Create or use existing keystore

```bash
cd mobile
npx eas-cli@18.13.0 credentials -p android
```

1. Profile: **`production`**
2. **Set up / use existing keystore** (EAS can generate one)
3. For local builds, credentials are read from `mobile/credentials/` (or EAS-stored credentials on disk after download)

### Backup (critical)

Save to encrypted storage + password manager:

- Keystore file (`.jks`)
- Keystore password, key alias, key password
- SHA-1 fingerprint (for Google Maps restriction)

**Do not** ship debug-signed builds to Play.

---

## Phase 3 — Build locally (primary path)

Always use the npm scripts — they load `.env`, enforce Node 22, and call EAS with `--local`.

### Production AAB (Play Store upload)

```bash
cd mobile
npm run verify:env
npm run build:aab:local
```

**Wait time:** Often **15–45 minutes** (first run longer while Gradle caches).

**Output:** `mobile/build-<timestamp>.aab` (example: `build-1779034030001.aab`)

**Upload this file** to Play Console → Internal testing or Production.

### Preview APK (device testing)

```bash
cd mobile
npm run verify:env
npm run build:apk:local
```

**Output:** `mobile/build-<timestamp>.apk`

Install on a physical Android 13+ phone:

```bash
adb uninstall com.trimit.app   # optional clean install
adb install build-*.apk
```

Or copy the APK to Google Drive (website download link) for testers.

> Push notifications **do not** work in Expo Go. Use **preview APK** or **internal testing** from Play for real FCM.

### After each new build

1. Note the `build-*.aab` filename and `versionCode` (terminal / Play upload screen).
2. Run [CASH_E2E_V1.md](./qa/CASH_E2E_V1.md) on device before promoting to production.

### What the scripts do (reference)

| Script | EAS profile | Output |
|--------|-------------|--------|
| `npm run build:aab:local` | `production` | Signed **AAB** |
| `npm run build:apk:local` | `preview` | Signed **APK** |

Implementation: `mobile/scripts/build-aab-local.sh`, `build-apk-local.sh` → `eas build --local --non-interactive`.

---

## Phase 4 — Google Play Console setup (first time)

### Step 4.1 — Create the app

1. [Play Console](https://play.google.com/console) → **Create app**
2. Name: **TrimiT**, Free app, accept policies

### Step 4.2 — App content (required before publish)

Use [`PLAY_CONSOLE_CHECKLIST.md`](./PLAY_CONSOLE_CHECKLIST.md).

| Section | What to enter |
|---------|---------------|
| **Privacy policy** | `https://trimit.online/privacy` |
| **App access** | Test login for reviewers |
| **Content rating** | IARC questionnaire |
| **Data safety** | Match checklist |
| **Account deletion** | `https://trimit.online/contact` + in-app delete |

### Step 4.3 — Store listing + ASO

| Asset | Spec |
|-------|------|
| App icon | 512×512 PNG |
| Feature graphic | 1024×500 PNG |
| Screenshots | ≥2 portrait; 6 recommended |
| Title / descriptions | See [Play Store ASO](#play-store-aso-keywords--listing-copy) below |

---

## Phase 5 — Upload AAB to Internal testing

1. Play Console → **Testing** → **Internal testing** → **Create new release**
2. **Upload** your `build-*.aab` from `mobile/`
3. Enroll in **Play App Signing** (recommended: Google-managed app signing key)
4. Release notes → **Start rollout to Internal testing**
5. Add testers → open opt-in link on Android → install from Play

### Pre-launch report

After upload, check **Pre-launch report** for crashes; fix and upload a new AAB if needed.

---

## Phase 6 — Promote to Production

After internal testing passes (suggested 3–7 days):

1. **Production** → **Create new release**
2. Promote tested release or upload a newer AAB
3. Countries, pricing (free) → **Roll out**

First app review: hours to several days.

---

## Phase 7 — Ship updates (v1.0.1, v1.1, …)

Same keystore. **Do not** create a new one.

| Task | Action |
|------|--------|
| Bump user-visible version | `version` in `mobile/app.config.js` (e.g. `1.0.1`) |
| Build new AAB | `cd mobile && npm run verify:env && npm run build:aab:local` |
| Upload to Play | New release (internal first, then production) |
| `versionCode` | `autoIncrement: true` in `eas.json` bumps on each local production build |

For Razorpay / v1.1 features: [`POST_V1_BACKLOG.md`](./POST_V1_BACKLOG.md).

---

## Restrict Google Maps API key (after first upload)

1. [Google Cloud Console](https://console.cloud.google.com) → Credentials → your Maps key
2. **Android apps** restriction:
   - Package: `com.trimit.app`
   - SHA-1: from `eas credentials -p android` (upload key)
   - SHA-1: Play Console → **Setup** → **App signing** → app signing certificate (after first upload)

---

## Troubleshooting (local builds)

| Problem | Likely cause | Fix |
|---------|--------------|-----|
| White screen / instant crash on APK | Empty env in bundle | `npm run verify:env` then rebuild with `build:apk:local` |
| `mobile/.env not found` | No `.env` file | `cp env.example .env` and fill keys |
| Build fails “credentials” | No production keystore | `npx eas-cli@18.13.0 credentials -p android` |
| `ANDROID_HOME` not set | Android Studio SDK | Install Studio; export `ANDROID_HOME` in `~/.zshrc` |
| Wrong Node version | EAS expects Node 22 | `fnm use 22` or run script (uses `ensure-node-22.sh`) |
| Play rejects upload | Debug APK uploaded | Use **AAB** from `build:aab:local`, not preview APK |
| Version code already used | Re-uploaded same build | Run `build:aab:local` again (`autoIncrement`) |
| Maps blank | Key not restricted / wrong SHA-1 | Add package + SHA-1 in Cloud Console |
| Online pay shown | Wrong env | `EXPO_PUBLIC_ENABLE_ONLINE_PAY=false` in `.env` |

More detail: [BUILD_RELEASE.md](../mobile/BUILD_RELEASE.md), [APK_CRASH_DEBUG.md](../APK_CRASH_DEBUG.md).

---

## Quick command reference (local)

```bash
cd mobile
npm install
cp env.example .env          # once — fill keys
npm run verify:env             # before every release build

npm run build:apk:local        # test APK → mobile/build-*.apk
npm run build:aab:local        # Play AAB → mobile/build-*.aab

adb install build-*.apk        # install latest APK

npx eas-cli@18.13.0 credentials -p android   # keystore / SHA-1
```

---

## Optional — EAS cloud build (when quota is available)

Expo free tier has a **monthly limit** on **cloud** builds (`eas build` without `--local`). When quota resets or you upgrade:

```bash
cd mobile
./scripts/push-expo-env.sh    # sync .env to expo.dev (cloud only)
eas build --profile production --platform android
```

**Until then, use local commands only** — they do not consume cloud build quota.

---

## Related docs

| Document | Purpose |
|----------|---------|
| [../mobile/BUILD_RELEASE.md](../mobile/BUILD_RELEASE.md) | **Local build bible** — env, scripts, crash fixes |
| [PLAY_CONSOLE_CHECKLIST.md](./PLAY_CONSOLE_CHECKLIST.md) | Data safety, legal URLs |
| [CASH_E2E_V1.md](./qa/CASH_E2E_V1.md) | Device test script |
| [EAS_PLAY_STORE_OPS.md](./EAS_PLAY_STORE_OPS.md) | Maps key + keystore notes |
| [GOOGLE_SEARCH_CONSOLE_SETUP.md](./GOOGLE_SEARCH_CONSOLE_SETUP.md) | Website SEO (separate from Play) |

---

## MVP v1 scope reminder

Shipping now:

- Android app, **cash at salon** only
- Customer + owner flows, push on release builds
- Backend on Render, Supabase DB

Later (v1.1+): Razorpay, staff UI, polish — new AAB via same local commands.

---

## Play Store ASO (keywords & listing copy)

**Note:** Play ranking uses the **store listing**, not your website sitemap.

### App title (max 30 characters)

```text
TrimiT - Salon Booking App
```

### Short description (max 80 characters)

```text
Book haircuts, beard trims & spa slots at salons near you. Fast, easy booking.
```

### Full description (suggested)

```text
TrimiT is the easy way to book salon appointments on your phone.

• Discover salons near you
• See live available time slots
• Book haircut, beard trim, facial, and spa services in minutes
• Manage your upcoming appointments
• Salon owners: accept bookings and run your schedule from one app

Whether you need a quick haircut, beard grooming, facial, or spa treatment, TrimiT connects you with local salons so you can skip the phone calls and book online.

Download TrimiT, create a free account, and book your next visit today.

Keywords: salon booking, barber app, haircut appointment, beard trim, facial booking, spa appointment, salon near me, book salon online, India salon app
```

### Keyword ideas (natural use in description)

`salon booking app`, `book haircut`, `barber near me`, `beard trim appointment`, `facial spa booking`, `salon appointment India`, `TrimiT`

### Graphic assets checklist

- [ ] Feature graphic 1024×500
- [ ] Phone screenshots (6–8): Discover → Salon → Book → My Bookings
- [ ] App icon 512×512 (matches `mobile` adaptive icon)
