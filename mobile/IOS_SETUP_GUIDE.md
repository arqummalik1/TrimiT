# TrimiT iOS Setup Guide (Beginner)

Complete checklist to open TrimiT in **Xcode**, run on your iPhone, upload to TestFlight, and ship to the App Store.

**Do this once.** Follow in order. Tick each **Outcome** before moving on.

---

## Read this first — three different places (do not mix them up)

| Place | Website / App | What it’s for |
|-------|---------------|---------------|
| **Google Cloud** | console.cloud.google.com | Maps + Google Sign-In keys |
| **Apple Developer** | developer.apple.com | App ID `online.trimit.app`, APNs push key, Team ID |
| **App Store Connect** | appstoreconnect.apple.com | Create the app listing, TestFlight, App Store release |
| **Xcode** | Mac app (not a website) | Build, run on iPhone, Archive, upload to Apple |

**Expo (expo.dev) is optional for this path.** You do **not** need to open Expo to ship via Xcode → TestFlight. Ignore Expo for now.

---

## Where you are right now (typical)

If this matches you:

- ✅ Apple Developer account exists  
- ✅ Identifier `online.trimit.app` created  
- ✅ Google Maps iOS key + iOS OAuth client in `mobile/.env` (or almost there)  
- ❌ **Have not opened the TrimiT project in Xcode yet**  
- ❌ **Have not created the app in App Store Connect yet** (Part C)

**Correct order from here:**

1. Finish **Part A** (Google → `.env`) if anything is still empty  
2. Finish **Part B** (Apple Developer — App ID + APNs + Team ID)  
3. Do **Part C** — create the app in **App Store Connect** (Apple’s website)  
4. **Then** open **Xcode** for the first time (**Part D**)  
5. Run on iPhone → Archive → TestFlight (**Parts F–G**)

**When do I start Xcode?**  
Only after Parts A–C are done (or at least A + B + C1). Opening Xcode earlier is fine to look around, but signing and upload need the App Store Connect app + your Apple team set up first.

---

## Important IDs (do not mix these up)

| Platform | Identifier | Where it lives |
|----------|------------|----------------|
| **iOS** | `online.trimit.app` | Apple App ID, App Store Connect, Xcode, Google iOS OAuth |
| **Android** | `com.trimit.app` | Play Store — **do not change** |

Changing the Android package would break your live Play Store app. Only iOS uses `online.trimit.app`.

---

## Part A — Google Cloud (Maps + Google Sign-In)

You need Google Cloud so **maps** work and **Sign in with Google** works on iPhone.

Open: [https://console.cloud.google.com](https://console.cloud.google.com)  
Select the **same project** you already use for TrimiT Android.

---

### A1. Enable Maps SDK for iOS

1. Left menu → **APIs & Services** → **Library**
2. Search: `Maps SDK for iOS`
3. Open it → click **Enable**

**Outcome:** The page shows **API enabled** (or a Manage button). Maps can work on iOS once a key is allowed for your app.

---

### A2. Create / restrict your Maps API key for iOS

**Best practice:** use a **separate** iOS Maps key (do not overwrite the Android key).

1. **APIs & Services** → **Credentials** → **+ Create credentials** → **API key** (or open your existing iOS Maps key)
2. Restrict it to **iOS apps** → Bundle ID: `online.trimit.app`
3. API restrictions: allow **Maps SDK for iOS**
4. **Save** and copy the key

**Where to put it** — open `mobile/.env` and set:

```bash
# Keep your existing Android key as-is:
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_existing_android_or_shared_key

# Paste the NEW iOS Maps key here:
EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY=PASTE_IOS_MAPS_KEY_HERE
```

| Placeholder | File | Platform |
|-------------|------|----------|
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | `mobile/.env` | Android (Play Store) — **do not replace** |
| `EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY` | `mobile/.env` | iOS only (`online.trimit.app`) |

If you leave `EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY` empty, iOS falls back to the shared/Android key (only works if that key is also allowed for iOS).

**Outcome:** `mobile/.env` has the iOS key on `EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY`. Android key untouched.

---

### A3. Create an iOS OAuth client (Google Sign-In)

1. **APIs & Services** → **Credentials**
2. **+ Create credentials** → **OAuth client ID**
3. Application type: **iOS**
4. Name: `TrimiT iOS`
5. Bundle ID: `online.trimit.app` (must match exactly)
6. Click **Create**
7. Copy the **Client ID**  
   It looks like: `123456789-xxxx.apps.googleusercontent.com`

**Outcome:** You have an **iOS client ID**. You do **not** need a client secret for iOS.

---

### A4. Put the iOS client ID into TrimiT

1. Open `mobile/.env` in Cursor (or any editor)
2. Set (or add) this line:

```bash
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=PASTE_YOUR_IOS_CLIENT_ID_HERE.apps.googleusercontent.com
```

3. Keep your existing `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` — that stays for Android / Supabase. Do not delete it.
4. Save the file

**Outcome:** `mobile/.env` contains a real `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` (not empty).

> After changing this value, regenerate iOS native files before the next Archive (Part E). Google Sign-In URL schemes are baked in at prebuild time.

---

### A5. (Optional but recommended) Supabase Google provider

If customers use Google login:

1. Open Supabase Dashboard → **Authentication** → **Providers** → **Google**
2. Confirm the **Web client ID** matches `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
3. You usually do **not** paste the iOS client ID into Supabase — the Web client stays the “server” client

**Outcome:** Google login still works with the same Web client; iOS native module uses the iOS client from `.env`.

---

## Part B — Apple Developer Portal (App ID + Push)

Open: [https://developer.apple.com/account](https://developer.apple.com/account)  
Sign in with the Apple ID that has the paid Developer Program.

This is **not** Xcode and **not** App Store Connect. This portal owns your App ID and push key.

---

### B1. Accept agreements

1. Open the Account page
2. If you see **Agreement** banners, click and accept them

**Outcome:** No pending agreement warnings. You can create certificates and apps.

---

### B2. Confirm your App ID (Identifier)

You already created this. Double-check:

1. **Certificates, Identifiers & Profiles** → **Identifiers**
2. Find **`online.trimit.app`**
3. Open it → confirm **Push Notifications** is enabled (recommended for booking alerts)
4. Save if you changed anything

**Outcome:** Identifier `online.trimit.app` exists and matches what Xcode and App Store Connect will use later.

---

### B3. Create an APNs key (push notifications)

Do this once; download the file carefully.

**Individual vs Organization:** If you enrolled as an **individual**, you still have a **Team ID**. Apple creates a “personal team” for every paid Developer account. You are not missing it — it just isn’t shown next to the Key ID on the Keys page.

1. Left menu → **Keys**
2. Click **+**
3. Key Name: `TrimiT APNs`
4. Check **Apple Push Notifications service (APNs)**
5. **Continue** → **Register**
6. **Download** the `.p8` file
7. Write down the **Key ID** (10 characters) — shown on the key details page right after you create it
8. Find your **Team ID** (also 10 characters) — separate page:
   - Open [Membership details](https://developer.apple.com/account#MembershipDetailsCard)  
     (or: developer.apple.com → **Account** → **Membership details**)
   - Copy **Team ID**
   - Later in Xcode you can also see it under **Settings → Accounts → your Apple ID → Team**
9. Store the `.p8` in a safe place (password manager / encrypted drive). Apple lets you download it **only once**.

**What you need for push later**

| Value | Where you get it | Individual account? |
|-------|------------------|---------------------|
| `.p8` file | Download once when creating the key | Yes |
| **Key ID** | Keys page (after create) | Yes |
| **Team ID** | Membership details (not on the Keys page) | Yes — you still have one |

**Outcome:** You have a `.p8` file + Key ID + Team ID. Needed later for production push. You can still build and TestFlight without wiring push on day one, but create the key now so you don’t forget.

---

## Part C — App Store Connect (Apple’s website — NOT Xcode)

**This is still not Xcode.**  
App Store Connect is Apple’s **web** portal where the store listing and TestFlight live.

Open: [https://appstoreconnect.apple.com](https://appstoreconnect.apple.com)  
Sign in with the **same** Apple ID as your Developer account.

You must create the app here **before** uploading an Archive from Xcode. If you skip this, Xcode upload to TestFlight will fail or have nowhere to attach the build.

---

### C1. Create the TrimiT iOS app (do this if you haven’t)

1. Click **My Apps**
2. Click the **+** button → **New App**
3. Platforms: tick **iOS**
4. Name: `TrimiT` (what users see; can tweak later if the name is taken)
5. Primary Language: English (or your choice)
6. Bundle ID: from the dropdown, select **`online.trimit.app`**  
   (If it’s missing, go back to Part B2 — the Identifier must exist first)
7. SKU: `trimit-ios` (internal code only; users never see this)
8. User Access: **Full Access**
9. Click **Create**

**Outcome:** Under My Apps you see **TrimiT**. Opening it shows tabs like **Distribution**, **TestFlight**, **App Information**.  
You have **not** needed Xcode yet for this step.

---

### C2. Fill minimum “App Information” (can be rough at first)

Under your new app:

1. Open **App Information**
2. Set a category (e.g. Lifestyle)
3. Add a privacy policy URL if you have one (`https://trimit.online/...`)
4. Screenshots can wait until after TestFlight works

**Outcome:** App record is ready to receive builds. You can still upload a TestFlight build even if screenshots are incomplete.

---

## Part D — Open the project in Xcode for the FIRST time

**Only start this after Parts A–C** (at least A, B, and C1).

Xcode is the Mac app from the App Store / Apple. It is **not** App Store Connect.

---

### D1. Install / open Xcode (the app)

1. Open **Xcode** from Applications (install from Mac App Store if missing)
2. If it asks to install extra components / agree to license, accept
3. **Xcode → Settings → Platforms** — install an iOS Simulator runtime if Xcode asks

**Outcome:** Xcode opens without license / component errors. You still have **not** opened the TrimiT project yet — that’s the next step.

---

### D2. Add your Apple ID inside Xcode

1. **Xcode → Settings** → **Accounts**
2. Click **+** → **Apple ID**
3. Sign in with your Developer Apple ID (same as App Store Connect)
4. Select your team — you should see your name and role (e.g. Account Holder)

**Outcome:** Your team appears under Accounts. Xcode can auto-create signing certificates.

---

### D3. Open the TrimiT project in Xcode (first time)

**Written for Xcode 26** (your Mac has Xcode 26.6). UI labels match current Apple docs.

**Always open the `.xcworkspace` file — never only the `.xcodeproj`.**  
CocoaPods needs the workspace. If you open only `.xcodeproj`, signing/build will be wrong.

In Terminal:

```bash
cd "/Users/arqummalik/Software-Development/Trimit/TrimiT/mobile"
eval "$(fnm env)" && fnm use 22
open ios/TrimiT.xcworkspace
```

Or Finder: go to `mobile/ios/` → double-click **`TrimiT.xcworkspace`** (white workspace icon, not the blue `.xcodeproj`).

If `ios/` is missing or outdated (after you changed `.env` Google keys), run Part E first, then come back here.

**What you should see after it opens**

1. Press **Cmd + 1** so the left sidebar is the **Project navigator** (folder icon).
2. At the **very top** of that left list you should see two projects:
   - **TrimiT** (blue icon) ← **your app** — use this one
   - **Pods** (blue icon) ← CocoaPods libraries — **do not** use this for signing

**Important:** Seeing **TARGETS** under **Pods** is normal and **wrong place** for TrimiT signing. Pods has dozens of library targets. Your app target lives under the **TrimiT** project, in the **middle editor**, not inside the Pods folder in the left list.

**Outcome:** `TrimiT.xcworkspace` is open. Left navigator shows **TrimiT** and **Pods**. Scheme menu at the top (near ▶) says **TrimiT**.

---

### D4. Signing & Capabilities (Xcode 26 — exact clicks)

Apple’s rule: **Signing is on a target, not on the project.**  
If you only select the project (or only open Pods), you will **not** see **Signing & Capabilities**.

#### Step 1 — Select the TrimiT *project* in the left navigator

1. Left sidebar → click the blue **TrimiT** icon at the **top** (above the `TrimiT` folder / source files).
2. Do **not** click **Pods**.
3. The **middle** of the window (editor) should change to project settings.

#### Step 2 — Reveal the PROJECT / TARGETS list (this is what most people miss)

In the **middle editor** (not the far-left file list), there is a second small sidebar:

```
PROJECT
  TrimiT

TARGETS
  TrimiT          ← you need THIS one
```

**If you do not see PROJECT / TARGETS:**

- Look at the **top-left corner of the middle editor** (just under the tabs / toolbar).
- Click the small icon that **shows/hides the Projects and Targets list**  
  (Apple calls this the projects-and-targets list; it looks like a tiny sidebar / column toggle).
- Or try: with the TrimiT project selected, use the **project/target dropdown** at the top of the editor and pick the **TrimiT** target.

After it opens, you should see:

| Section | Name | What it is |
|---------|------|------------|
| PROJECT | TrimiT | Whole project settings (NO Signing tab) |
| TARGETS | **TrimiT** | Your iPhone app ← **select this** |

#### Step 3 — Click the **TrimiT** target (under TARGETS)

1. Under **TARGETS**, click **TrimiT** (the app).
2. Tabs across the top of the editor should now include:
   - **General**
   - **Signing & Capabilities** ← you need this
   - **Resource Tags**
   - **Info**
   - **Build Settings**
   - **Build Phases**
   - **Build Rules**

If you only see **Info** and **Build Settings** (no Signing tab), you still have the **PROJECT** selected — go back and click **TARGETS → TrimiT**.

#### Step 4 — Configure signing

1. Click **Signing & Capabilities**
2. Check **Automatically manage signing**
3. **Team:** choose your Apple Developer team (your name / individual account)
4. **Bundle Identifier:** must be `online.trimit.app`
5. If Xcode shows a red error, wait a few seconds or click **Try Again**

**Outcome:**

- You selected **TARGETS → TrimiT** (not PROJECT, not Pods)
- **Signing & Capabilities** tab is visible
- No red signing errors
- Bundle ID = `online.trimit.app`

If you still see red errors about **devices** or **provisioning profiles**, do **D4-FIX** below before continuing. Do **not** create profiles by hand unless automatic signing still fails after D4-FIX.

#### If you still only see targets under Pods

You clicked **Pods** in the left navigator. Fix:

1. Scroll to the **top** of the left sidebar
2. Click **TrimiT** (the first blue project), not Pods
3. Reveal PROJECT/TARGETS in the middle editor (Step 2)
4. Click **TARGETS → TrimiT**

#### Alternate path (same result)

1. Top toolbar scheme menu (left of the device picker) → make sure scheme is **TrimiT**
2. Menu bar: **Product → Scheme → Edit Scheme…** — scheme **TrimiT** should list target **TrimiT**
3. Then go back to left navigator → blue **TrimiT** project → **TARGETS → TrimiT** → **Signing & Capabilities**

---

### D4-FIX — “No devices” / “No profiles for online.trimit.app” (common)

These two errors usually come together:

> Your team has no devices from which to generate a provisioning profile…  
> No profiles for `online.trimit.app` were found…

**What they mean (plain English):**

- A **provisioning profile** is Apple’s permission slip that says: “this app ID + this Mac’s certificate + these iPhones can run development builds.”
- With **Automatically manage signing**, **Xcode creates the profile for you**. You usually do **not** download one yourself.
- Xcode **cannot** create that profile until Apple knows **at least one iPhone** (device UDID) on your team.

**Recommended fix: plug in your iPhone and let Xcode register + create the profile**

#### Fix step 1 — Confirm the device on Apple’s website

1. Open [Devices](https://developer.apple.com/account/resources/devices/list)
2. You should see your iPhone listed (name + UDID)
3. Platform should be **iOS** (or iPhone)
4. Status should be enabled (not disabled)

If the list is empty, add the device again (you already did this — good).

**Outcome:** At least one iOS device appears on the Devices page.

#### Fix step 2 — Connect that same iPhone to your Mac

1. Unlock the iPhone
2. Plug in USB (or use a trusted wireless pairing if already set up)
3. On iPhone: tap **Trust** this computer if asked
4. In Xcode top bar, open the destination menu → select **your iPhone by name**  
   (not “Any iOS Device” and not only a Simulator for this fix)

**Outcome:** Xcode shows your real iPhone as the run destination.

#### Fix step 3 — Register device from Xcode (if button appears)

1. **TARGETS → TrimiT → Signing & Capabilities**
2. Team selected, **Automatically manage signing** ON
3. Bundle ID = `online.trimit.app`
4. If you see **Register Device** / **Register Device(s)** under Status → click it
5. Wait until the red error clears (can take 10–60 seconds)

**Outcome:** Device is linked to your team from Xcode’s point of view.

#### Fix step 4 — Force Xcode to refresh profiles

1. **Xcode → Settings → Accounts**
2. Select your Apple ID → select your **Team**
3. Click **Download Manual Profiles** (refreshes account assets; safe even with auto signing)
4. Close Settings
5. Back in **Signing & Capabilities**, uncheck **Automatically manage signing**, wait 2 seconds, check it **again**
6. Confirm Team + Bundle ID again
7. If still red: **Product → Clean Build Folder** (⇧⌘K), then try ▶ Run once

**Outcome:** Provisioning Profile line shows something like **Xcode Managed Profile** / `iOS Team Provisioning Profile: online.trimit.app` — **not** “No profiles found”.

#### Fix step 5 — Only if automatic still fails: create a Development profile manually

Most people **skip** this. Use only if Fix steps 1–4 failed.

1. Open [Profiles](https://developer.apple.com/account/resources/profiles/list) → **+**
2. Under **Development**, choose **iOS App Development** → Continue
3. App ID: select **`online.trimit.app`** → Continue
4. Select your **Apple Development** certificate (if none exist, Xcode usually creates one on first successful sign-in — or create one under Certificates → + → Apple Development)
5. Select **your iPhone** (the device you added) → Continue
6. Profile name: `TrimiT Dev` → Generate → Download
7. Double-click the downloaded `.mobileprovision` file (installs into Xcode), **or** drag it onto the Xcode Dock icon
8. In Xcode Signing: you can keep **Automatic** (preferred). If you switch to Manual, pick this profile — beginners should stay on Automatic after installing.

**Outcome:** Profile exists on Apple’s Profiles page and Xcode can use it.

#### Fix step 6 — “Communication with Apple failed”

This is often temporary / network / Apple session:

1. Check internet connection
2. Sign out/in: **Xcode → Settings → Accounts** → remove Apple ID → add again
3. Accept any new agreements on [developer.apple.com/account](https://developer.apple.com/account)
4. Retry Signing & Capabilities / Run

**Outcome:** Xcode talks to Apple again; profile generates.

#### What you do NOT need (yet)

- You do **not** need an App Store Distribution profile to Run on your iPhone
- You do **not** need TestFlight profiles for local device Run
- Simulator-only testing can work without a device profile, but **Archive / device Run** need proper signing; device errors appear when Xcode tries to make a **Development** profile

**Quick checklist**

| Check | OK? |
|-------|-----|
| Device listed on developer.apple.com → Devices | |
| Same iPhone plugged in + Trust | |
| Xcode destination = that iPhone | |
| Automatic signing ON + Team selected | |
| Bundle ID `online.trimit.app` | |
| Signing shows an Xcode Managed Profile (no red text) | |

---

### D5. Pick a run destination

Top toolbar (next to the Play ▶ button):

1. Confirm the **scheme** on the left says **TrimiT** (not a Pods name)
2. Click the destination next to it:
   - **Your iPhone** (USB, unlocked, Trusted) — required to fix provisioning / best for real testing
   - Or an **iPhone simulator** — UI only (push won’t work; may not fix the “no devices” profile error)

**Outcome:** Scheme = **TrimiT**, destination is set, Play (▶) is enabled.

---

## Part E — Rebuild native iOS after Google keys / config changes

### Do you need Part E right now?

| Situation | Need Part E? |
|-----------|----------------|
| Signing works, you just want to ▶ Run / Archive | **No** — skip Part E. Use Xcode buttons only. |
| You changed `mobile/.env` Google Maps / iOS OAuth keys | **Yes** — once, then go back to Xcode |
| You changed `app.config.js` (bundle ID, permissions, plugins) | **Yes** |
| `mobile/ios/` folder is missing | **Yes** |
| You only changed JS/TS screens (React Native code) | **No** — just ▶ Run again |

**If signing already works and you didn’t change keys/config:** ignore Part E. Go to **Part F** (▶ Run).

---

### Where do you run this?

**In Terminal (Mac app), not inside Xcode’s buttons.**

1. Open **Terminal** (Spotlight → type `Terminal`)  
2. Copy/paste the commands below  
3. When it finishes, Xcode opens (or reopen `TrimiT.xcworkspace`)  
4. Then use Xcode buttons again (▶ Run, Archive, etc.)

There is **no** Xcode button that fully replaces `expo prebuild` for this Expo project.

---

### Why scripts instead of Xcode buttons?

TrimiT is an **Expo / React Native** app. Two layers:

| Layer | What it is | Who edits it |
|-------|------------|--------------|
| **JavaScript app** | Screens, booking, login (`mobile/src/…`) | You / Cursor |
| **Native iOS project** | `mobile/ios/` — what Xcode builds | **Generated** from `app.config.js` + `.env` |

Xcode buttons (**▶ Run**, **Archive**, Signing) only work on the **native** `ios/` folder that already exists.

They do **not**:

- Read your `mobile/.env` and bake Maps / Google Sign-In into iOS  
- Recreate `ios/` from Expo config after you change bundle ID or plugins  
- Install CocoaPods the way Expo expects after a clean regen  

So:

- **Day-to-day coding / testing** → Xcode **▶ Run** (or Archive) only  
- **After changing native-related config** (`.env` keys, `app.config.js`) → run Part E **once in Terminal**, then use Xcode again  

`npx expo prebuild` = “rebuild the `ios/` folder from our config.”  
`pod install` = “download iOS libraries the native project needs.”  
`open TrimiT.xcworkspace` = “open the correct Xcode project.”

---

### Commands (Terminal) — only when Part E is needed

```bash
cd "/Users/arqummalik/Software-Development/Trimit/TrimiT/mobile"
eval "$(fnm env)" && fnm use 22
npm run verify:env
npx expo prebuild --platform ios --clean --no-install
cd ios
USE_FRAMEWORKS=static /opt/homebrew/bin/pod install
open TrimiT.xcworkspace
```

| Command | What it does |
|---------|----------------|
| `cd …/mobile` | Go to the mobile app folder |
| `fnm use 22` | Use Node 22 (required) |
| `npm run verify:env` | Checks `.env` keys exist |
| `npx expo prebuild …` | Regenerates `mobile/ios/` from config |
| `pod install` | Installs native iOS dependencies |
| `open TrimiT.xcworkspace` | Opens Xcode on the right file |

Then repeat **D4** (Team + signing) — a clean prebuild can reset signing UI; pick Team again.

**Outcome:** Node 22.x, env check passes, pods install, workspace opens, signing still OK.

> Note: `npx expo prebuild` only generates the `ios/` folder. It is **not** the Expo website and **not** required before every Run.

---

## YOU ARE HERE — signing works ✓

If device + provisioning profile errors are **gone**, do **not** redo Parts A–D.

**Your path from now:**

1. **Part F** — Install & smoke-test on your iPhone from Xcode  
2. **Part F2** — Extensively test the real customer + owner flows  
3. **Part G** — Archive → upload → **TestFlight** (testers)  
4. **Part H** — Fill store listing → **Submit for Review** → **Production** (App Store)

**Skip Part E** unless you changed `.env` / `app.config.js` after the last prebuild.

---

## Part F — First test on your iPhone (from Xcode)

This installs a **development** build directly from your Mac. No TestFlight yet.

### F1. Prepare the phone

1. Unlock iPhone → keep it awake  
2. USB connected (or trusted wireless debugging)  
3. On iPhone, if asked: **Trust This Computer**  
4. First install only: **Settings → General → VPN & Device Management** (or Device Management) → trust your Developer App certificate if iOS blocks launch

**Outcome:** iPhone is trusted and ready to install developer apps.

---

### F2. Select TrimiT + your iPhone in Xcode

1. Scheme (top bar) = **TrimiT**  
2. Destination = **your iPhone name** (not Simulator, not “Any iOS Device” for this step)

**Outcome:** Top bar shows `TrimiT > Your iPhone`.

---

### F3. Build and Run

1. Press **▶ Run** (or **Cmd + R**)  
2. Wait for “Build Succeeded” and install (first time can take several minutes)  
3. App should open on the iPhone automatically  

**You do NOT need Metro / `expo start` for Xcode ▶ on a real iPhone.**  
Device Debug uses the **embedded JS bundle** (fixes “No script URL” / ATS errors when the Mac IP is `192.0.0.2` CLAT or the phone is on cellular).

| Noise in Xcode console | Action |
|------------------------|--------|
| empty dSYM / AppleLanguages / UIScene lifecycle | Ignore |
| ATS / `http://192.0.0.2:8081` | Ignore after this fix (device no longer needs Metro) |
| Red screen “No script URL provided” | Rebuild once after AppDelegate embed fix; Clean Build Folder |

If iOS says “Untrusted Developer”:

1. Settings → General → VPN & Device Management → trust  
2. Open TrimiT again from the home screen (or ▶ Run again)

**Outcome:** TrimiT icon is on the home screen and the app opens without crashing.

---

### F4. Quick smoke checklist (5–10 minutes)

Do these once before deep testing:

| # | Check | Pass? |
|---|--------|-------|
| 1 | Splash / home loads | |
| 2 | Login works (phone OTP or email — whatever you use) | |
| 3 | Google Sign-In (if enabled) | |
| 4 | Maps / nearby salons show (not blank grey) | |
| 5 | Open a salon → services list loads | |
| 6 | Network errors show a clear message (not a white crash) | |

**Outcome:** Core app is alive on a real device. Fix blockers before Part F2.

**If it crashes on launch:**

```bash
cd "/Users/arqummalik/Software-Development/Trimit/TrimiT/mobile"
eval "$(fnm env)" && fnm use 22
npm run verify:env
```

Confirm Maps / Supabase / Google iOS values in `.env`, then Part E (rebuild) + Run again.

---

## Part F2 — Extensive testing on iPhone (before TestFlight)

Stay on the Xcode-installed build. Test like a real user. Prefer **customer** and **salon owner** paths.

### F2-A. Customer flows

| # | Flow | What “good” looks like |
|---|------|------------------------|
| 1 | Discover / map | Salons appear; location permission works |
| 2 | Salon detail | Photos, services, prices load |
| 3 | Book a slot | Slot grid loads; hold/book succeeds |
| 4 | My bookings | Booking appears; status correct |
| 5 | Reschedule / cancel | Works or shows a clear error |
| 6 | Profile / settings | Edits save |
| 7 | Kill app + reopen | Still logged in (persistent login) |
| 8 | Airplane mode → back online | Recovers without stuck spinner forever |

**Outcome:** Customer booking path works end-to-end on your phone.

### F2-B. Owner flows (use an owner account)

| # | Flow | What “good” looks like |
|---|------|------------------------|
| 1 | Owner home / bookings | Today’s bookings load |
| 2 | Accept / complete booking | Status updates |
| 3 | Manage services | Add/edit price works |
| 4 | Salon settings | Save works |
| 5 | Realtime (if possible) | Second device or web shows updates |

**Outcome:** Owner can operate the salon day-to-day on iOS.

### F2-C. Device / polish checks

| # | Check |
|---|--------|
| 1 | Portrait lock — UI doesn’t break |
| 2 | Low network (cellular) — still usable |
| 3 | Push (optional for now) — can wait until APNs fully wired |
| 4 | No obvious crash when backgrounding 1–2 minutes |

**Outcome:** You’re confident enough to share a build with others via TestFlight.

> Tip: Keep notes of bugs. Fix critical ones **before** uploading to TestFlight so you don’t burn build numbers on broken builds.

---

## Part G — Make it available on TestFlight

TestFlight = install via Apple’s **TestFlight** app (not Xcode ▶). Needs App Store Connect app (Part C) + an uploaded Archive.

### G1. Bump the iOS build number

Apple rejects reuse of the same **iOS** build number. Android’s `androidVersionCode` is separate — bump only what you’re shipping.

Edit `shared/app-version.json`:

```json
"version": "1.0.2",
"androidVersionCode": 39,
"iosBuildNumber": "1"
```

| Field | iOS first upload | Later iOS uploads | Android |
|-------|------------------|-------------------|---------|
| `version` | `1.0.2` (shared marketing version) | bump when you want a new “store version” | same |
| `iosBuildNumber` | `"1"` | `"2"`, `"3"`, … | ignore |
| `androidVersionCode` | leave alone | ignore | next Play upload → `40`, then `41`… |

Before each **iOS** Archive/TestFlight upload, increase **only** `iosBuildNumber`.

Optional: after bumping, run Part E if you want native Info.plist to match exactly; or set **Build** in Xcode → General to the same number.

**Outcome:** First iOS upload is build **1** under version **1.0.2**. Android stays on its own ladder from 39/40.
---

### G2. Archive (Release build for Apple)

1. In Xcode, change destination to **Any iOS Device (arm64)**  
   - Not Simulator  
   - Phone does not need to stay plugged in for Archive  
2. Menu: **Product → Destination → Any iOS Device (arm64)** if needed  
3. **Product → Archive**  
4. Wait (often 5–20+ minutes first time)

**Outcome:** **Organizer** window opens (Window → Organizer if it doesn’t) with a new **TrimiT** archive dated today.

If Archive is greyed out: destination is still a Simulator — switch to Any iOS Device.

---

### G3. Upload the archive to App Store Connect

1. In Organizer → **Archives** → select today’s TrimiT archive  
2. Click **Distribute App**  
3. Choose **App Store Connect** → **Next**  
4. Choose **Upload** → **Next**  
5. Keep defaults (include symbols / manage version recommended)  
6. Confirm signing (Automatic is fine) → **Upload**  
7. Wait until Xcode says upload succeeded  

**Outcome:** Upload finished with no error. Build is on Apple’s servers (not public yet).

---

### G4. Wait for processing in App Store Connect

1. Open [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → **My Apps** → **TrimiT**  
2. Open **TestFlight** tab  
3. Find your build (`1.0.2 (40)` or similar)  
4. Status goes **Processing** → **Ready to Submit** / **Ready to Test** (10–30+ minutes)

**First build only:** Apple may ask **Export Compliance** / encryption.

- If you only use HTTPS and standard crypto: complete the questionnaire for standard encryption / HTTPS exemption  
- Save so the build becomes testable  

**Outcome:** Build is **Ready to Test** in TestFlight (not stuck on Missing Compliance).

---

### G5. Internal TestFlight (you + up to 100 teammates)

Fastest path — **no** Beta App Review.

1. TestFlight → **Internal Testing**  
2. Create a group if needed (e.g. `Internal`)  
3. Add **Testers** (App Store Connect users on your team — add yourself)  
4. Add the new **build** to the group  
5. On iPhone: install **TestFlight** from the App Store  
6. Open the invite email/notification → **Install** TrimiT  

**Outcome:** TrimiT installs from **TestFlight** on your iPhone. New uploads appear as updates in TestFlight.

---

### G6. External TestFlight (optional — friends / salons outside your team)

1. TestFlight → **External Testing** → create group  
2. Add the build → fill **What to Test** notes  
3. Submit for **Beta App Review** (can take hours–a day)  
4. Add external testers by email  

**Outcome:** Outside testers can install via TestFlight after Beta Review approval.

---

### G7. TestFlight sanity check

On the TestFlight build, re-check:

- Login  
- Maps  
- Book one slot  
- Owner booking list (if applicable)  

**Outcome:** TestFlight build matches what you saw in Part F/F2. Ready for production submission when happy.

---

## Part H — Production (public App Store)

Do this **only after** TestFlight feels solid.

### H1. Complete the App Store listing

App Store Connect → your app → **Distribution** / **App Store** tab → create a version (e.g. **1.0.2**):

| Field | What to put |
|-------|-------------|
| Screenshots | Required iPhone sizes (use App Store Connect’s size hints) |
| Description | What TrimiT does (salon booking, etc.) |
| Keywords | salon, booking, … |
| Support URL | e.g. `https://trimit.online` |
| Marketing URL | optional |
| Privacy Policy URL | required — your live privacy page |
| Category | e.g. Lifestyle |
| Age rating | complete questionnaire |
| App Privacy | nutrition labels — data you collect (account, location, etc.) |

**Outcome:** Version page has no red “missing metadata” blockers (except choosing a build).

---

### H2. Select the TestFlight build for this version

1. On the version page → **Build** → **+**  
2. Pick the build you tested on TestFlight  
3. Save  

**Outcome:** Version is tied to a specific binary (e.g. 1.0.2 build 40).

---

### H3. Pricing & availability

1. **Pricing and Availability** — Free (or your price)  
2. Countries — start with India (or all)  

**Outcome:** Store availability is set.

---

### H4. Submit for App Review

1. Click **Add for Review** / **Submit to App Review**  
2. Answer export compliance / advertising ID questions honestly  
3. Confirm submission  

**Outcome:** Status = **Waiting for Review** → later **In Review** → **Pending Developer Release** or **Ready for Sale**.

Typical review: ~24–48 hours (can vary).

---

### H5. Release to production

- If you chose **Automatically release**: it goes live after approval  
- If **Manual**: click **Release This Version** when approved  

**Outcome:** TrimiT is live on the **App Store** for customers.

---

### H6. After you’re live (habit)

Every new iOS upload:

1. Bump `iosBuildNumber`  
2. Archive → Upload  
3. TestFlight first  
4. Attach build to a new App Store version when ready → Submit  

**Outcome:** Safe release loop without breaking users.

---

## Part I — Splash screen, app icon, and booking alert tone (iOS)

This section is for branding + owner booking alerts. Do **not** confuse App Store Connect marketing assets with the files inside the app.

---

### I1. App icon — where it goes (project vs App Store Connect)

You need **both**, for different jobs:

| Where | What it is | File / action |
|-------|------------|---------------|
| **In the app project** | Icon on the iPhone home screen + Settings | `mobile/assets/icon.png` wired in `app.config.js` |
| **App Store Connect** | Marketing icon on the App Store page | Upload a **1024×1024** PNG in App Store Connect (App Information / version assets) |

**Project icon (home screen) — TrimiT today**

1. Replace / update: `mobile/assets/icon.png`  
   - Recommended: **1024×1024** PNG, square, no transparency (Apple prefers opaque)  
2. Config already points here in `mobile/app.config.js`:

```js
icon: './assets/icon.png',
```

3. After changing the file, regenerate native assets (**Part E** once), then ▶ Run / Archive  
4. Delete the old app from the phone if the icon looks cached, then reinstall  

**App Store Connect icon**

1. Open App Store Connect → TrimiT → App Information / version  
2. Upload **1024×1024** app icon if Connect asks for one  
3. This does **not** replace `assets/icon.png` inside the binary — it’s for the store listing  

**Also related (Android / notifications — keep as-is for now)**

| File | Role |
|------|------|
| `mobile/assets/adaptive-icon.png` | Android adaptive icon |
| `mobile/assets/notification-icon.png` | Android notification small icon |
| `mobile/assets/SquareLogo.png` | Currently used as **splash** image |

**Outcome:** Home screen shows your TrimiT icon from the project; App Store page shows the 1024 icon from Connect.

---

### I2. Splash screen — how to change the image

**Native splash** (black screen + logo while the app starts) is configured in `mobile/app.config.js`:

```js
splash: {
  image: './assets/SquareLogo.png',
  resizeMode: 'contain',
  backgroundColor: '#000000',
},
```

**To change the splash image**

1. Put your new image in `mobile/assets/` (e.g. keep name `SquareLogo.png` or add `splash.png`)  
2. Recommended: PNG, logo centered, works on black `#000000`  
3. If you rename the file, update `splash.image` in `app.config.js`  
4. Run **Part E** (prebuild) so iOS picks it up  
5. ▶ Run on device — force-quit the app and reopen to see splash  

**Outcome:** Launch shows your splash artwork on a black background.

There is also a short **in-app loading UI** in `App.tsx` (TrimiT title while fonts/auth hydrate). That is separate from the native splash.

---

### I3. Splash duration — seconds, not minutes

**Important:** Expo’s `splash` block in `app.config.js` does **not** have a “show for N seconds” setting.

- Native splash stays up until the JS app is ready (often **~1–3 seconds**, depends on device/speed).  
- It is **not** meant to run for minutes. Users hate long forced splash screens; keep it short (**1–3 seconds** max of artificial delay if you add any).

**If you want a minimum time in seconds** (e.g. always show at least 2 seconds):

1. Install / use `expo-splash-screen` (Expo projects usually already have the capability via the splash config).  
2. In app startup code (`App.tsx`), keep the splash visible, wait N seconds, then hide — pattern:

```ts
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

// after fonts/auth ready:
await new Promise((r) => setTimeout(r, 2000)); // 2000 ms = 2 seconds
await SplashScreen.hideAsync();
```

| Goal | What to set |
|------|-------------|
| Fastest launch | No artificial delay — hide as soon as ready |
| Brand moment | `1000`–`2000` ms (1–2 seconds) |
| Never | Multi-minute splash — feels broken |

**Outcome:** Splash shows for roughly “time to load” + optional fixed seconds you choose in code.

> Ask a developer (or me in a coding session) before adding the delay in `App.tsx` — it is a small code change + test, not an Xcode toggle.

---

### I4. Booking alert tone — how TrimiT plays sound today

TrimiT has **two** sound paths:

| When | How sound plays | File |
|------|-----------------|------|
| **App open (foreground)** — owner gets a new booking (Realtime / in-app modal) | `notificationStore` plays `assets/sounds/notification.mp3` via `expo-audio` | `mobile/assets/sounds/notification.mp3` |
| **App background / locked** — push notification | System notification sound (custom sound registered in `app.config.js`) | Same file listed under `expo-notifications` → `sounds` |

Config already registers the tone:

```js
// app.config.js — expo-notifications plugin
sounds: ['./assets/sounds/notification.mp3'],
```

**To replace the tone**

1. Replace `mobile/assets/sounds/notification.mp3`  
2. Prefer short alert (**under ~5–10 seconds**; iOS custom notification sounds must be **≤ 30 seconds**)  
3. For most reliable iOS notification sounds, Apple prefers **`.caf` / linear PCM / `.wav`**; MP3 often works via Expo but CAF is safer for push  
4. Run **Part E** after changing the sound file / plugin config  
5. Reinstall the app on the phone (notification sound assets are baked at build time)

**Outcome:** New booking uses your custom tone when the OS/app allows sound.

---

### I5. iOS Silent Mode — will the tone ring? (critical for salon owners)

**Honest iOS rules (Apple, not TrimiT):**

| Situation | Rings on silent switch? |
|-----------|-------------------------|
| **Foreground** in-app tone (`expo-audio`) | **Can**, if we set `playsInSilentMode: true` |
| **Background / lock screen push** with normal notification | **Usually NO** — mute switch / Focus can block sound (Expo docs: custom sounds won’t play when silent mode / Focus blocks them) |
| **Critical Alerts** (special Apple entitlement) | **YES** — can bypass silent / DND when Apple approves + user allows |

Android already uses a high-importance channel with `bypassDnd: true` for bookings. **iOS does not have the same switch** without Critical Alerts.

#### What we should do for TrimiT owners (recommended plan)

**A. Foreground (app open) — IMPLEMENTED**

`notificationStore` calls `setAudioModeAsync({ playsInSilentMode: true })` on sound init and before each booking chime.

**Outcome:** When the owner is using TrimiT, new booking tone still plays on silent.

**B. Background push — best effort without Critical Alerts**

1. Keep custom sound registered (`notification.mp3` / better: convert to `.caf`)  
2. Ask owners to:  
   - Allow Notifications → **Sounds** ON for TrimiT  
   - Turn **Focus / Do Not Disturb** off during salon hours, **or** add TrimiT to Focus allowed apps  
   - Prefer **Ring** mode during working hours if possible  
3. Backend can send iOS `interruptionLevel: "time-sensitive"` (helps Focus delivery; **does not** override the physical mute switch)

**Outcome:** Better delivery under Focus; mute switch may still silence pushes.

**C. True “must ring on silent” (Uber/Rapido-class) — Critical Alerts**

Only path that reliably rings through the **silent switch** for background pushes:

1. Request **Critical Alerts** entitlement from Apple (form on developer.apple.com — justify: salon owners must hear new bookings or they lose business)  
2. Wait for Apple approval (can take days–weeks; not guaranteed)  
3. Add entitlement to the iOS app + request `allowCriticalAlerts: true` in notification permissions  
4. Send booking pushes with critical / critical-sound payload  
5. Owner must accept the Critical Alerts permission prompt  

**Outcome (after approval + code):** Booking pushes can sound even in silent mode.

> Until Critical Alerts are approved, tell owners: keep sound enabled for TrimiT, and use Ring mode or allow TrimiT in Focus during salon hours. Foreground chime can still be made to play on silent via `playsInSilentMode`.

---

### I6. Quick checklist — branding + tone

| Task | Where | Done? |
|------|-------|-------|
| Home screen icon | `mobile/assets/icon.png` + Part E | |
| Store listing icon | App Store Connect 1024×1024 | |
| Splash image | `app.config.js` → `splash.image` + asset file + Part E | |
| Splash min time (seconds) | Optional code delay in `App.tsx` (1–2 s max) | |
| Booking tone file | `mobile/assets/sounds/notification.mp3` (+ Part E) | |
| Foreground silent play | **Done in code** (`playsInSilentMode: true`) | ✓ |
| Background / killed + mute | **Critical Alerts** — see Part J (required for Rapido-style) | |

**Outcome:** You know which assets live in the repo vs Connect, and what iOS allows for silent-mode booking alerts.

---

## Part J — Rapido-style booking alerts (app closed / background)

**Goal:** Like Rapido Captain — when a customer books, the **salon owner** gets a banner **and the booking tone plays** even if TrimiT is in the **background** or **fully closed (swiped away)**.

### How this works (plain English)

| App state | Who delivers the alert | Needs app running? |
|-----------|------------------------|--------------------|
| Open (foreground) | In-app chime + modal + push | Yes |
| Background / **killed** | **Apple APNs → system notification** | **No** — OS shows it |

Closed-app alerts are **remote push**, not local code. The phone must have a valid push token and Expo must have your **APNs key**.

**Mute switch / Focus (iOS):** To **force sound like Rapido even on silent**, Apple requires **Critical Alerts** entitlement. Without it, notification can still **appear** when killed, but sound may be silenced by the Ring/Silent switch. Code is already set for Critical Alerts — you must get Apple’s approval.

---

### J0. Code already in the repo (do not re-implement)

| Piece | Behavior |
|-------|----------|
| Backend booking push | `sound: notification.mp3`, `priority: high`, `interruptionLevel: critical`, `badge: 1` |
| Android channel | `bookings_v2` + `bypassDnd: true` (already Rapido-like on Android) |
| iOS entitlements | Time Sensitive + **Critical Alerts** |
| Permission request | Alerts + Sound + **Critical Alerts** |
| Foreground chime | `playsInSilentMode: true` |

After any pull: **Part E** + reinstall on a **physical iPhone**.

---

### J0b. Android Rapido-style (same product bar — shared constants)

Android already delivers FCM/Expo pushes when the app is **killed**. We strengthened the booking channel to match captain apps:

| Setting | Value |
|---------|-------|
| Channel ID | `bookings_v4` (shared with backend) |
| Importance | **MAX** |
| Sound | `notification` (from `notification.mp3`) |
| `bypassDnd` | true |
| Audio usage | **ALARM** (harder for OEMs to silence) |
| Lock screen | PUBLIC |

**Shared source of truth:** `shared/push-constants.json`  
→ synced into `mobile/src/config/push-constants.json` (`npm run sync:shared` / Metro auto-sync)  
→ mobile `src/lib/pushConstants.ts` + backend `push_notifications.py`

**Android checklist**

1. Rebuild APK/AAB after these changes (`npm run build:apk:local` or Play upload)
2. Owner: allow notifications; open **App info → Notifications → New Bookings** → sound ON
3. Optional but recommended on aggressive OEMs (Xiaomi/Vivo/Oppo): disable battery optimization for TrimiT
4. Test: **Force stop** TrimiT → create booking → banner + tone

**Outcome:** Android matches iOS product bar for closed-app booking alerts (tone + banner).

---

### J1. Enable Push on the App ID

1. [Identifiers](https://developer.apple.com/account/resources/identifiers/list) → **`online.trimit.app`**
2. Enable **Push Notifications** → Save

**Outcome:** APNs allowed for this bundle ID.

---

### J2. Request Apple Critical Alerts (REQUIRED for Rapido-style silent ring)

1. Open Apple’s form: [Critical Alerts entitlement request](https://developer.apple.com/contact/request/notifications-critical-alerts-entitlement/)
2. Bundle ID: `online.trimit.app`
3. Justify like a rideshare captain app, for example:
   - TrimiT is a live salon booking platform
   - Owners must **accept/reject bookings in seconds**
   - Missing the tone loses revenue (same urgency as driver trip requests)
4. Wait for Apple email (days–weeks)

Meanwhile on the App ID (after approval):

1. Identifiers → `online.trimit.app`
2. Enable **Critical Alerts** (and Time Sensitive if listed)
3. Save → regenerate provisioning (Xcode automatic signing usually does this)

**Outcome:** Apple approved Critical Alerts for TrimiT. Until then, killed-app **banners** can still work; **forced sound on mute** will not.

---

### J3. APNs key → Expo (REQUIRED or iOS push never arrives when killed)

1. Have `.p8` + Key ID + Team ID (Part B3)
2. Upload to Expo project **trimit** (owner `arqummalik1`):
   - [expo.dev](https://expo.dev) → Credentials → iOS → Push Notifications  
   - or Terminal:

```bash
cd "/Users/arqummalik/Software-Development/Trimit/TrimiT/mobile"
eval "$(fnm env)" && fnm use 22
npx eas-cli@18.13.0 credentials -p ios
```

**Outcome:** Expo can deliver `ExponentPushToken[...]` messages to iPhones via APNs.

---

### J4. Rebuild & install on a real iPhone

```bash
cd "/Users/arqummalik/Software-Development/Trimit/TrimiT/mobile"
eval "$(fnm env)" && fnm use 22
npx expo prebuild --platform ios --clean --no-install
cd ios && USE_FRAMEWORKS=static /opt/homebrew/bin/pod install
open TrimiT.xcworkspace
```

In Xcode → **Signing & Capabilities** for target **TrimiT**:

- **Push Notifications**
- **Time Sensitive Notifications** (if shown)
- **Critical Alerts** (after Apple approval — if signing errors before approval, wait for approval)

▶ Run on **physical iPhone** (not Simulator).

**Outcome:** Binary includes push + sound + critical entitlements.

---

### J5. Owner permissions on the phone

1. Log in as **salon owner**
2. Allow notifications when prompted — including **Critical Alerts** if shown (may need **delete app + reinstall** if you allowed notifications earlier without Critical)
3. Settings → TrimiT → Notifications: Alerts ON, Sounds ON, Critical Alerts ON
4. Confirm Supabase `users.push_token` starts with `ExponentPushToken[`

**Outcome:** Token saved; OS will present booking pushes when app is closed.

---

### J6. Rapido-style acceptance test

| # | Setup | Action | Pass |
|---|-------|--------|------|
| 1 | Owner app **force-quit** (swipe away) | Customer creates booking | Banner appears + tone plays |
| 2 | Owner app backgrounded | New booking | Banner + tone |
| 3 | Phone locked | New booking | Lock-screen alert + tone |
| 4 | Silent switch ON (after Critical approved) | New booking, app killed | **Tone still plays** |
| 5 | Tap notification | Opens app to booking | Can accept/reject |

**Outcome:** Same operational bar as Rapido for salon owners.

---

### J7. If banner never shows when app is closed

| Cause | Fix |
|-------|-----|
| No APNs key on Expo | J3 |
| Simulator | Use real iPhone |
| No push token | Re-login; allow notifications |
| Backend not sending | Check Render logs for `[Push] sent` |
| Old build without sound/entitlements | Part E + reinstall |

### J8. If banner shows but no sound when muted

| Cause | Fix |
|-------|-----|
| Critical Alerts not approved yet | Complete J2 |
| Critical permission not granted | Delete app → reinstall → allow Critical Alerts |
| Entitlement missing on App ID | Enable after Apple approval → rebuild |

---

### J9. Checklist (Rapido bar)

| Step | Done? |
|------|-------|
| Push ON for `online.trimit.app` | |
| APNs key on Expo | |
| Critical Alerts requested / approved by Apple | |
| Critical Alerts enabled on App ID | |
| Fresh device build after entitlements | |
| Owner allowed Critical Alerts + Sounds | |
| Force-quit test: banner + tone | |
| Mute-switch test (after approval): tone still plays | |

**Outcome:** Owners get booking alerts with sound whether TrimiT is open, backgrounded, or closed.

---

## Master checklist (in order)

| # | Where | Step | Outcome |
|---|-------|------|---------|
| A–D | Setup | Keys, Apple, Connect, Xcode signing | No red signing errors ✓ |
| F | Xcode → iPhone | ▶ Run | App installs & opens on phone |
| F2 | iPhone | Customer + owner testing | Critical flows pass |
| I | Assets + iOS rules | Icon, splash, booking tone | Branding set; silent-mode plan clear |
| J | Apple + Expo + device | iOS push notifications | Booking pushes work on iPhone |
| G | Xcode → TestFlight | Archive + Upload | Testers install via TestFlight |
| H | App Store Connect | Listing + Submit | App live on App Store |

---

## What you do NOT need to do

- Do **not** change Android package from `com.trimit.app`
- Do **not** open `TrimiT.xcodeproj` alone — always `TrimiT.xcworkspace`
- Do **not** use Node 23 — use Node 22 (`fnm use 22`)
- Do **not** run broken `pod` from rbenv — use `/opt/homebrew/bin/pod`
- Do **not** wait on Expo / expo.dev for this Xcode → TestFlight path
- Do **not** skip Part C (App Store Connect) before uploading an Archive
- Do **not** submit production (Part H) before you’ve tested on device + TestFlight

---

## Quick command cheat sheet

```bash
# Node 22 + env check
cd "/Users/arqummalik/Software-Development/Trimit/TrimiT/mobile"
eval "$(fnm env)" && fnm use 22
node -v                    # must be v22.x
npm run verify:env
npm run verify:ios-paths   # fails if path has spaces or Pods point at old folder

# Open Xcode (ALWAYS .xcworkspace, ALWAYS from hyphen path)
open ios/TrimiT.xcworkspace

# After renaming/moving the repo OR missing google-maps .xcconfig errors
npm run ios:pods           # wipe Pods + reinstall; then reopen workspace

# After changing Google iOS keys / app.config.js
npx expo prebuild --platform ios --clean --no-install
npm run ios:pods
open ios/TrimiT.xcworkspace
```

> **Never keep the project under a folder name with a space.** Use `Software-Development` only.

---

## If you get stuck

| Symptom | Likely fix |
|---------|------------|
| “I haven’t opened Xcode yet” | Finish Parts A–C, then Part D |
| No app to upload to | Part C — create app on **appstoreconnect.apple.com** |
| Only see TARGETS under **Pods** | Click blue **TrimiT** at top of left sidebar, then reveal PROJECT/TARGETS in the middle editor |
| No **Signing & Capabilities** tab | Reveal targets list → click **TARGETS → TrimiT** |
| Targets list missing in middle editor | Click show/hide **Projects and Targets** at top-left of middle editor |
| **No devices** / **No profiles** | Follow **D4-FIX** |
| **Communication with Apple failed** | D4-FIX step 6 — re-login + accept agreements |
| Signing error / no team | Part D2 — Xcode → Settings → Accounts |
| Bundle ID mismatch | Must be `online.trimit.app` everywhere |
| Maps blank | Part A1–A2 |
| Google Sign-In fails | Part A3–A4 + Part E re-prebuild |
| Archive greyed out | Destination = **Any iOS Device**, not Simulator |
| Duplicate build | Bump `iosBuildNumber` in `shared/app-version.json` |
| TestFlight stuck “Missing Compliance” | Answer export compliance on the build in App Store Connect |
| `pod` crashes | `/opt/homebrew/bin/pod` + `USE_FRAMEWORKS=static` |
| **fmt consteval / “not a constant expression”** (Xcode 26) | Known Apple Clang + fmt 11 bug. Fixed in Podfile + `withFmtXcodeFix` plugin. Run `pod install`, then **Product → Clean Build Folder**, rebuild |
| **Unable to open base configuration… react-native-google-maps.debug.xcconfig** | Stale CocoaPods absolute path (often after renaming `Software Development` → `Software-Development`). Quit Xcode → `npm run ios:pods` → reopen **`TrimiT.xcworkspace`** only |
| **No script URL / ATS blocks http://192.0.0.2:8081** | Mac on CLAT/hotspot + Debug tried Metro. Fixed by embedded device bundle (`withIosDeviceEmbeddedBundle`). Clean Build Folder → ▶ Run (no Metro needed) |
| **Unable to resolve …/shared/push-constants.json** | Metro cannot import outside `mobile/`. Fixed: sync into `src/config/` via `sync-shared-json` (also runs from `metro.config.js`). Clean → ▶ Run |
| **Google button missing / Google sign-in fails on iOS** | Button hidden only in Expo Go. On device: fix URL scheme — `npm run patch:google-ios` (must not be `…placeholder`). Rebuild. Same email OTP+Google merges via Supabase automatic linking |

**Next action for you right now:** **Part F** — ▶ Run on iPhone. Branding/tone details: **Part I**. Then F2 → G TestFlight → H production.
