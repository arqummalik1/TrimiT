# TrimiT — Push notifications setup (beginner, Android + iOS)

**Whose fault was the missing FCM?** The engineer’s — for shipping APK/AAB without verifying Firebase/FCM. Not yours.

**What we use**

| Platform | Path |
|----------|------|
| Android | App → Expo token → Backend → Expo Push API → **FCM** → phone tray |
| iOS | App → Expo token → Backend → Expo Push API → **APNs** → phone tray |
| Owner modal while app **open** | Supabase **Realtime** (works even before FCM/APNs) |

You need **both** FCM (Android) and APNs (iOS) for tray alerts when the app is backgrounded or killed.

---

## Part A — Android (FCM) — do this first

### A1. Create / open a Firebase project

1. Open [Firebase Console](https://console.firebase.google.com/)
2. Sign in with your Google account
3. **Add project** (or open existing TrimiT project)
4. Disable Google Analytics if you want (optional)

**Outcome:** You see a Firebase project dashboard.

---

### A2. Add the Android app in Firebase

1. Project overview → **Add app** → Android
2. **Android package name:** `com.trimit.app` (must match exactly)
3. App nickname: `TrimiT Android`
4. Debug signing SHA-1: optional for push (needed for Google Sign-In; you already did SHA-1 elsewhere)
5. Register app

**Outcome:** Firebase shows your Android app with package `com.trimit.app`.

---

### A3. Download `google-services.json`

1. Firebase → Project settings (gear) → **Your apps**
2. Select the Android app `com.trimit.app`
3. Download **`google-services.json`**
4. Save it here on your Mac:

```text
/Users/arqummalik/Software-Development/Trimit/TrimiT/mobile/google-services.json
```

**Outcome:** File exists at `mobile/google-services.json`.

**Check:**

```bash
cd mobile
npm run verify:android-push
```

Must print `google-services.json present OK` (exit 0).

---

### A4. Create FCM V1 service account key (for Expo to *send*)

1. Firebase → Project settings → **Service accounts**
2. Click **Generate new private key** → confirm
3. A JSON file downloads (looks like `your-project-firebase-adminsdk-xxxxx.json`)
4. Store it somewhere safe **outside git** (Desktop is fine). **Do not commit** this file.

**Outcome:** You have a private key JSON. This is **not** the same as `google-services.json`.

| File | Purpose | Commit to git? |
|------|---------|----------------|
| `google-services.json` | Phone registers with FCM | Usually OK |
| `*-firebase-adminsdk-*.json` | Expo servers send via FCM V1 | **Never** |

---

### A5. Upload FCM V1 key to Expo (EAS)

1. Open [expo.dev](https://expo.dev) → sign in
2. Open the **TrimiT** project (same as project id `e4f2eade-fe15-4a16-8766-83b0771a4643`)
3. **Credentials** → **Android** → application id `com.trimit.app`
4. Find **FCM V1 service account key** → **Add / Upload**
5. Upload the `firebase-adminsdk` JSON from A4 → Save

**Or CLI (on your Mac, logged in):**

```bash
cd mobile
npx eas-cli@18.13.0 credentials
# Android → production (or preview) → Google Service Account
# → FCM V1 → Upload a new service account key
```

**Outcome:** Expo Credentials page shows an FCM V1 key for Android. Without this, Expo cannot deliver to Android trays.

---

### A6. Rebuild Android (required after google-services.json)

```bash
cd mobile
npm run verify:android-push   # must pass
npm run build:apk:local       # preview testing
# and/or
npm run build:aab:local       # Play Store
```

1. Uninstall old TrimiT from the phone  
2. Install the **new** APK  
3. Login as **owner** → allow notifications when asked  

**Outcome:** New binary includes FCM client config. `setupPushNotifications` can obtain an Expo push token and sync it to the backend.

---

### A7. Verify Android end-to-end

1. Owner app: Settings → Notifications → push **ON**
2. Keep owner app **backgrounded or killed**
3. From another device / Expo Go customer → book at that salon
4. Owner phone should show a **system tray** notification (loud channel for new booking)
5. Expand notification → Accept / Reject if actions appear (iOS strongest; Android best-effort)

**Optional DB check:** owner `users.push_token` should look like `ExponentPushToken[...]`.

**Outcome:** Tray push works with app closed. Modal when open is bonus (Realtime).

---

## Part B — iOS (APNs) — tray push on iPhone

### B1. Apple Developer — APNs key

1. [developer.apple.com](https://developer.apple.com) → Account → **Certificates, Identifiers & Keys**
2. **Keys** → **+** → enable **Apple Push Notifications service (APNs)**
3. Continue → Register → **Download** `.p8` (once only)
4. Note: **Key ID**, **Team ID**, bundle id `online.trimit.app`

**Outcome:** You have a `.p8` file + Key ID + Team ID.

---

### B2. Upload APNs key to Expo

1. expo.dev → TrimiT → **Credentials** → **iOS** → `online.trimit.app`
2. Push Notifications → upload **APNs Key** (`.p8` + Key ID + Team ID)

**Outcome:** Expo can send to iPhones via APNs.

---

### B3. Xcode / Apple push capability

1. Apple Developer → Identifiers → App ID `online.trimit.app` → enable **Push Notifications**
2. Rebuild iOS (Xcode or EAS) so the binary includes push entitlement
3. Install on a **real iPhone** (simulator push is limited)
4. Login → allow notifications

**Outcome:** Device can register an Expo push token for iOS.

---

### B4. Verify iOS end-to-end

Same as A7: book as customer → iPhone owner/customer tray alert appears in background.

**Outcome:** APNs path works for background/killed.

---

## Part C — What you do **not** need to invent

| Already in TrimiT code | Your job |
|------------------------|----------|
| Backend Expo send (`push_notifications.py`) | Keep Render backend deployed with latest |
| Owner urgent vs soft channels | None after FCM/APNs |
| Accept / Reject / Verify actions | Works after push delivers |
| Realtime in-app modal | Already works when app open |

You only supply **FCM + APNs credentials** and **rebuild**.

---

## Quick failure map

| Symptom | Likely cause |
|---------|----------------|
| Modal only when owner app open | FCM/APNs missing (Realtime only) |
| `verify:android-push` fails | No `mobile/google-services.json` |
| Token in DB but no Android tray | FCM V1 not uploaded to Expo |
| Expo Go customer “appointment soon” | Local reminder — not FCM proof |
| No notification permission | Settings → allow notifications |

---

## Checklist (print / tick)

- [ ] A1 Firebase project  
- [ ] A2 Android app `com.trimit.app`  
- [ ] A3 `mobile/google-services.json` + `npm run verify:android-push` passes  
- [ ] A4 FCM V1 private key downloaded  
- [ ] A5 FCM V1 uploaded on expo.dev Credentials  
- [ ] A6 New APK/AAB installed  
- [ ] A7 Background booking → tray alert  
- [ ] B1 APNs `.p8` created  
- [ ] B2 APNs uploaded to Expo  
- [ ] B3 Push capability + iOS rebuild on device  
- [ ] B4 Background booking → iPhone tray alert  

When A3 is done on disk, tell me — I’ll confirm wiring and help you rebuild.
