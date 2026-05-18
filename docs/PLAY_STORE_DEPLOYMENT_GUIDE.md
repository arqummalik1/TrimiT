# TrimiT — Play Store deployment guide (beginner-friendly)

**Goal:** Build a signed **AAB** file and upload it to Google Play for your **v1 MVP** (cash-only bookings). You can ship updates later without redoing this whole guide.

**Time:** First time: about **2–4 hours** (mostly waiting for cloud builds + filling Play forms).  
**App ID (package name):** `com.trimit.app`  
**Build tool:** [Expo Application Services (EAS)](https://docs.expo.dev/build/introduction/) — builds in the cloud; you do **not** need Android Studio on your Mac for the AAB.

---

## What you will end up with

| Step | Outcome |
|------|---------|
| Accounts ready | Google Play Developer + Expo accounts |
| EAS secrets set | Production API keys baked into the app |
| Upload keystore created | Google-trusted signing identity for your app |
| `eas build` completes | **`.aab` file** (Android App Bundle) — this is what Play Store accepts |
| Play Console app created | Empty app listing ready for uploads |
| Internal testing release | Testers (including you) can install from Play |
| Production release (later) | Public listing on Play Store |

**Important:** Play Store does **not** accept APK for new apps in most cases — it wants **AAB**. Your `eas.json` is already set to `app-bundle` for production.

---

## Glossary (plain English)

| Term | Meaning |
|------|---------|
| **AAB** | Android App Bundle — the zip-like file Google Play installs from. Smaller and required for publishing. |
| **APK** | Old install file. Fine for testing on your phone manually; Play prefers AAB. |
| **Keystore** | A password-protected file that proves *you* built the app. Like a digital passport for updates. |
| **Upload key** | The keystore **you** (or EAS) use to sign the AAB before sending it to Google. |
| **App signing key** | Google’s key that actually signs what users download (Play App Signing). You enroll on first upload. |
| **EAS** | Expo’s cloud build service — compiles your React Native app into AAB on their servers. |
| **Production profile** | Build settings in `mobile/eas.json` named `production` (AAB + auto version code). |
| **Internal testing** | Play track for you and testers only — safest first upload. |
| **versionCode** | Integer that must go **up** every Play upload (EAS `autoIncrement` handles this). |
| **versionName** | User-visible version, e.g. `1.0.0` in `mobile/app.config.js`. |

---

## Before you start (checklist)

### Accounts (one-time fees)

| Account | Why | Cost |
|---------|-----|------|
| [Google Play Console](https://play.google.com/console) | Publish Android apps | **$25 one-time** |
| [Expo](https://expo.dev) | EAS builds | Free tier works; paid if you hit limits |
| GitHub (you have TrimiT repo) | Code source | Free |

### On your computer

| Tool | Install | Check |
|------|---------|-------|
| **Node.js** 18+ | [nodejs.org](https://nodejs.org) | `node -v` |
| **npm** | Comes with Node | `npm -v` |
| **EAS CLI** | `npm install -g eas-cli` | `eas --version` |
| **Git** | [git-scm.com](https://git-scm.com) | `git --version` |

### Services already running (TrimiT)

Confirm these work in a browser before building the app:

- Backend health: `https://trimit-az5h.onrender.com/health` (or your Render URL)
- Privacy policy: https://trimit.online/privacy
- Terms: https://trimit.online/terms

### Gather these secret values (not committed to git)

Write them in a password manager — you will paste them into Expo EAS:

| Secret name | Where to find it |
|-------------|------------------|
| `EXPO_PUBLIC_API_URL` | Render backend URL, e.g. `https://trimit-az5h.onrender.com` |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Same page — **anon public** key only |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Cloud Console → Credentials |
| `EXPO_PUBLIC_PUBLIC_SITE_URL` | `https://trimit.online` |
| `EXPO_PUBLIC_SENTRY_DSN` | Sentry project (optional but recommended) |

`EXPO_PUBLIC_ENABLE_ONLINE_PAY` is already `false` in `eas.json` for v1 (cash at salon only).

---

## Phase 1 — Log in to Expo and link the project

### Step 1.1 — Open the mobile app folder

```bash
cd "/path/to/TrimiT/mobile"
npm install
```

**Outcome:** Dependencies installed; `node_modules` ready.

### Step 1.2 — Log in to Expo

```bash
eas login
```

Follow the browser prompt with your Expo account.

**Outcome:** Terminal shows you are logged in.

### Step 1.3 — Link project to EAS (first time only)

```bash
eas init
```

If asked, confirm the existing project / create one named **trimit**.

**Outcome:** `mobile/app.json` or Expo dashboard shows project ID; builds can run.

---

## Phase 2 — Set environment variables on Expo

Values live on Expo’s servers and are injected at build time (not in GitHub).

**Full table (visibility, no warnings):** [EXPO_ENV_SETUP.md](./EXPO_ENV_SETUP.md)

### Step 2.1 — Add variables in the dashboard

1. [expo.dev](https://expo.dev) → project **trimit** → **Environment variables**
2. Create each variable for **development**, **preview**, and **production**
3. Use **Plain text** for URLs, **Sensitive** for keys — **never “Secret”** on `EXPO_PUBLIC_*` names

### Step 2.2 — Or push from `mobile/.env` (CLI)

```bash
cd mobile
./scripts/push-expo-env.sh
```

**Outcome:** Production build uses your Render API, Supabase, and Maps — not localhost.

### Step 2.3 — Verify assets exist

```bash
ls assets/SquareLogo.png assets/adaptive-icon.png
```

**Outcome:** Build won’t fail for missing icon/splash. (See `mobile/assets/README.md`.)

---

## Phase 3 — Create the upload keystore (signing)

Google Play requires every release to be signed. **Do not lose this keystore** — you need the same one for all future updates.

### Recommended: Let EAS create and store the keystore

This is the easiest path for beginners.

```bash
cd mobile
eas credentials -p android
```

Follow the prompts:

1. Select build profile: **`production`**
2. Choose: **Set up a new keystore** (or “Generate new keystore”)
3. Let EAS manage credentials (recommended)

When finished, choose option to **download credentials** or view **Keystore** details.

**Outcome:**

- EAS stores your **upload keystore** securely
- You get a **SHA-1 fingerprint** (needed for Google Maps restriction later)
- Future `eas build` commands sign the AAB automatically

### Backup (critical)

From the credentials screen or email/download:

1. Save the **keystore file** (`.jks` or `.keystore`) to a safe place (encrypted drive + backup)
2. Save **keystore password**, **key alias**, and **key password** in your password manager

If you lose the upload key and Google Play App Signing is enabled, you may need Google support to reset — avoid that pain by backing up now.

### What is *not* the debug keystore?

Android debug builds use a known debug key. **Play rejects debug-signed releases.** Production profile must use the upload keystore above.

---

## Phase 4 — Build the AAB file

### Option A — Local build (when EAS cloud quota is used up)

Runs on your Mac; does **not** use Expo’s monthly cloud build count.

**Prerequisites:** Android Studio installed, `ANDROID_HOME` set, Java 17+, `eas` CLI logged in, keystore at `mobile/credentials/android/keystore.jks`.

```bash
cd mobile
eas build --profile production --platform android --local
```

Output: a signed `.aab` in the terminal path shown at the end (e.g. `mobile/build-1778928994395.aab`).

**Preview APK (device testing — push notifications, real FCM):**

```bash
cd mobile
npm run build:apk:local
# same as: eas build --profile preview --platform android --local
```

Install the `.apk` on your phone (USB or `adb install build-*.apk`). This is a **standalone release** build — not Expo Go — so push tokens work.

> Push notifications do **not** work in Expo Go (SDK 53+). Use preview or production builds on a physical device.

**Alternative (Gradle only):**

```bash
cd mobile
npx expo prebuild --platform android --clean
# Copy signing into android/ (or use credentials.json with eas credentials)
cd android && ./gradlew bundleRelease
# AAB: android/app/build/outputs/bundle/release/app-release.aab
```

### Option B — EAS cloud build

### Step 4.1 — Start the production build

```bash
cd mobile
eas build --profile production --platform android
```

EAS will:

- Upload your project
- Install dependencies
- Compile native Android code
- Sign with your upload keystore
- Produce an **AAB**

**Outcome (while running):** Terminal shows a build URL like `https://expo.dev/accounts/.../builds/...`

**Wait time:** Often **15–30 minutes** (queue + compile).

### Step 4.2 — Build succeeds

When status is **Finished**:

1. Open the build page in the browser
2. Click **Download** → you get a file like `build-xxxxxxxx.aab`

**Outcome:** `build-xxxxxxxx.aab` on your computer — **this is your Play Store upload file.**

### Step 4.3 — Optional: install on your phone before Play

For quick testing without Play Console, use a **preview APK** build (separate from production AAB):

```bash
eas build --profile preview --platform android
```

Download the APK, install on device (enable “Install unknown apps” if sideloading).

**Outcome:** APK on phone for smoke test. Still upload the **production AAB** to Play, not this APK.

### Step 4.4 — Test the production build on a real device

Best path: upload AAB to **Internal testing** (Phase 6) and install from Play Store link.

Run through: [`docs/qa/CASH_E2E_V1.md`](./qa/CASH_E2E_V1.md) (signup → book cash → owner complete → push).

**Outcome:** Confidence the AAB works before wider release.

---

## Phase 5 — Google Play Console setup (first time)

### Step 5.1 — Create the app

1. [Play Console](https://play.google.com/console) → **Create app**
2. App name: **TrimiT**
3. Default language, App / Game, Free
4. Accept policies

**Outcome:** Empty app dashboard for TrimiT.

### Step 5.2 — Complete required “App content”

Play blocks publishing until these are done. Use [`PLAY_CONSOLE_CHECKLIST.md`](./PLAY_CONSOLE_CHECKLIST.md).

| Section | What to enter | Outcome |
|---------|---------------|---------|
| **Privacy policy** | `https://trimit.online/privacy` | Policy URL accepted |
| **App access** | Test login for reviewers (see checklist) | Google can review login |
| **Ads** | No | Declared |
| **Content rating** | Questionnaire (IARC) | Rating certificate |
| **Target audience** | 18+ | Age declared |
| **Data safety** | Match checklist table | Data disclosure complete |
| **Account deletion** | `https://trimit.online/contact` + in-app delete | Policy compliant |

### Step 5.3 — Store listing + ASO (minimum for internal test)

| Asset | Spec |
|-------|------|
| App icon | 512×512 PNG |
| Feature graphic | 1024×500 PNG |
| Phone screenshots | At least 2 (portrait); 6 recommended with keyword headlines |
| App name | ≤ 30 characters — see [PLAY_STORE_LISTING_COPY.md](./PLAY_STORE_LISTING_COPY.md) |
| Short description | ≤ 80 characters — keyword-optimized copy in same file |
| Full description | Salon booking + salon management keywords — [PLAY_STORE_ASO.md](./PLAY_STORE_ASO.md) |
| Category | **Beauty**; add Tags (Salon, Beauty, …) if shown in Console |
| Hindi (hi-IN) | Strongly recommended for India searches — ASO doc §4 |

**Outcome:** Store page ready for discovery; internal testers see final listing text.

---

## Phase 6 — Upload the AAB to Internal testing

### Step 6.1 — Create internal testing release

1. Play Console → **TrimiT** → **Testing** → **Internal testing**
2. **Create new release**
3. **Upload** your `.aab` file (drag and drop)
4. Wait for processing (minutes)

**Outcome:** Release draft with your AAB attached.

### Step 6.2 — Play App Signing (first upload)

Google will ask to enroll in **Play App Signing**.

- Choose **Use Google-generated app signing key** (recommended for new apps)
- Your **upload key** (from EAS) signs what you upload; Google re-signs for users

**Outcome:** App signing enabled; future updates use same flow.

### Step 6.3 — Release notes and roll out

1. Add release notes, e.g. “v1.0.0 — Initial MVP, book salons, pay at salon.”
2. **Review release** → **Start rollout to Internal testing**

**Outcome:** Release live on internal track.

### Step 6.4 — Add yourself as tester

1. **Internal testing** → **Testers** tab
2. Create email list → add your Gmail
3. Open the **opt-in link** on your Android phone (same Google account)
4. Install **TrimiT** from Play Store (test link)

**Outcome:** Production-signed app installed from Play — closest to real users.

### Step 6.5 — Pre-launch report

After upload, Play runs automated tests (hours).

- Play Console → **Release** → **Testing** → **Pre-launch report**
- Fix crashes or permission issues if any

**Outcome:** List of devices/issues to fix before production.

---

## Phase 7 — Promote to Production (when ready)

Only after internal testing looks good (3–7 days suggested).

1. **Production** → **Create new release**
2. You can **promote** the tested release from internal testing or upload a newer AAB
3. Complete **Countries**, **Pricing** (free)
4. **Review and roll out** → **Production**

**Outcome:** TrimiT visible on Google Play in selected countries.

**Review time:** From hours to several days for first app.

---

## Phase 8 — After v1 ships (updates)

You do **not** recreate the keystore for each update.

| Task | Command / action |
|------|------------------|
| Bump user-visible version | Edit `version` in `mobile/app.config.js` (e.g. `1.0.1`) |
| Build new AAB | `eas build --profile production --platform android` |
| Upload to Play | New release in Production (or internal first) |
| versionCode | Handled by `autoIncrement: true` in `eas.json` |

For **v1.1** (Razorpay, etc.), see [`POST_V1_BACKLOG.md`](./POST_V1_BACKLOG.md).

---

## Restrict Google Maps API key (recommended after first upload)

1. [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services** → **Credentials**
2. Edit your Maps API key → **Application restrictions** → **Android apps**
3. Add:
   - Package: `com.trimit.app`
   - SHA-1: from `eas credentials -p android` → production → fingerprints
   - SHA-1: from Play Console → **Setup** → **App signing** → **App signing key certificate** (after first upload)

**Outcome:** Your Maps key can’t be abused from other apps.

---

## Troubleshooting

| Problem | Likely cause | Fix |
|---------|--------------|-----|
| Build fails “credentials” | No production keystore | Run `eas credentials -p android` |
| Build fails missing icon | Assets not in repo | Add `assets/SquareLogo.png`, etc. |
| App can’t login / API errors | Wrong EAS secrets | Check `EXPO_PUBLIC_API_URL` and Supabase keys |
| Play rejects upload | Wrong file type | Use **AAB** from production profile, not debug APK |
| “Version code already used” | Reused versionCode | Run build again (`autoIncrement` should bump); or bump manually in Play |
| Maps blank on device | Maps key unrestricted / wrong SHA-1 | Restrict key with package + SHA-1 |
| Online payment shown in app | Wrong build profile | Confirm production uses `EXPO_PUBLIC_ENABLE_ONLINE_PAY=false` |

---

## Quick command reference

```bash
# One-time setup
cd mobile
npm install
eas login
eas init

# Keystore (one-time, or to view fingerprints)
eas credentials -p android

# Production AAB (every release)
eas build --profile production --platform android

# List recent builds
eas build:list --platform android
```

---

## Related docs

| Document | Purpose |
|----------|---------|
| [PLAY_STORE_V1_OPS.md](./PLAY_STORE_V1_OPS.md) | Short ops checklist |
| [PLAY_CONSOLE_CHECKLIST.md](./PLAY_CONSOLE_CHECKLIST.md) | Data safety, legal URLs, reviewer accounts |
| [CASH_E2E_V1.md](./qa/CASH_E2E_V1.md) | Test script on device |
| [NOTION_V1_DAILY_TRACKER.md](./NOTION_V1_DAILY_TRACKER.md) | Daily progress / milestones |
| [EAS_PLAY_STORE_OPS.md](./EAS_PLAY_STORE_OPS.md) | Maps key + keystore notes |

---

## MVP v1 scope reminder

What you are shipping now:

- Android app, **cash at salon** payments only (no in-app Razorpay yet)
- Customer + owner flows, push notifications
- Backend on Render, database on Supabase

What comes in a later app update (v1.1+):

- Online payments (Razorpay)
- Staff management API, security hardening, polish

Ship the MVP first, iterate with new AAB uploads — that is the normal Play Store workflow.

---

## Play Store ASO (keywords & listing copy)

**Note:** This affects **Google Play search**, not Google Search Console (website). Paste into Play Console → **Main store listing**.

### App title (max 30 characters)

```text
TrimiT - Salon Booking App
```

### Short description (max 80 characters)

```text
Book haircuts, beard trims & spa slots at salons near you. Fast, easy booking.
```

### Full description (suggested — edit city/region as you expand)

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

### Keyword ideas (for description / promotional text — do not spam)

`salon booking app`, `book haircut`, `barber near me`, `beard trim appointment`, `facial spa booking`, `salon appointment India`, `TrimiT`

### Graphic assets checklist

- [ ] Feature graphic 1024×500
- [ ] Phone screenshots (6–8) showing Discover → Salon → Book → My Bookings
- [ ] App icon 512×512 (matches `mobile` adaptive icon)

Website SEO (sitemap, Search Console): [GOOGLE_SEARCH_CONSOLE_SETUP.md](./GOOGLE_SEARCH_CONSOLE_SETUP.md)
