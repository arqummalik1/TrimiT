# Sign in with Apple — Easy setup guide (TrimiT)

**Who this is for:** you (owner / first-time Apple portals)  
**Goal:** App Review sees a working **Sign in with Apple** on iPhone (Guideline 4.8)  
**What you do here:** Apple Developer + Supabase + new iOS build — **not** new login code  

| Your numbers | Value |
|--------------|--------|
| iOS Bundle ID | `online.trimit.app` |
| Android (ignore for Apple) | `com.trimit.app` |
| Supabase project | `etpoecagsfhodtfuhblk` |
| Supabase URL | `https://etpoecagsfhodtfuhblk.supabase.co` |
| Apple callback into Supabase | `https://etpoecagsfhodtfuhblk.supabase.co/auth/v1/callback` |
| Web return URL | `https://trimit.online/auth/callback` |
| Supabase Apple settings | [Auth → Providers](https://supabase.com/dashboard/project/etpoecagsfhodtfuhblk/auth/providers) |

---

## 30-second picture

```
User taps black "Sign in with Apple" on iPhone
        ↓
Apple face ID sheet → identity token
        ↓
Supabase turns token into a normal login session
        ↓
TrimiT app calls GET /auth/me (same as Google)
        ↓
New user → Complete Profile | Returning user → home
```

- **No Apple secret in the app `.env`.**
- **Yes**, you need keys in **Apple Developer** + a **JWT secret** pasted into **Supabase**.
- **Team ID is 10 characters** (letters + numbers).  
  App Store Connect account numbers (e.g. 11-digit IDs in the profile menu) are **not** the Team ID.

---

## What is already done in code (you only finish portals + ship a build)

| Piece | Place |
|--------|--------|
| Black Apple button on Login (iOS) | `mobile/src/components/AppleSignInButton.tsx` |
| Get token + nonce | `mobile/src/services/appleAuthService.ts` |
| Token → Supabase → `/auth/me` | `mobile/src/store/authStore.ts` (`appleSignIn`) |
| Capability flags for next native build | `mobile/app.config.js` → `usesAppleSignIn: true` + plugin `expo-apple-authentication` |
| Web Apple button (optional for Review) | `frontend` Login/Signup |

**Outcome of “code exists”:** app *can* run the flow.  
**If portals / new build missing:** button missing or sign-in fails. Reviewers never see a laptop; they test the **uploaded iOS build**.

You need the branch/build that contains these Apple files (not an old store binary that only had Google).

---

## Three websites (do not mix them)

| Site | URL | Use for |
|------|-----|---------|
| **Apple Developer** | [developer.apple.com/account](https://developer.apple.com/account) | Team ID, App ID capability, Services ID, `.p8` key |
| **App Store Connect** | [appstoreconnect.apple.com](https://appstoreconnect.apple.com) | TestFlight, screenshots, submit for review |
| **Supabase** | [supabase.com/dashboard](https://supabase.com/dashboard) | Enable Apple provider + paste secret |

Use the **same paid Apple Developer** account that owns bundle `online.trimit.app`.

---

## Master checklist (tick as you go)

```
[ ] 1  Team ID saved (10 chars, Developer Membership — NOT App Store Connect menu)
[ ] 2  App ID online.trimit.app → Sign In with Apple ON
[ ] 3  Services ID online.trimit.app.auth + Supabase domain/return URL
[ ] 4  SIWA Key .p8 downloaded once + Key ID saved
[ ] 5  JWT secret generated on Mac with repo script
[ ] 6  Supabase Apple provider ON + Client IDs + secret saved
[ ] 7  Supabase Redirect URLs include web callback
[ ] 8  Supabase automatic identity linking ON
[ ] 9  New iOS build; Xcode shows Sign In with Apple capability
[ ] 10 TestFlight on real iPhone: full Apple login works
[ ] 11 Resubmit App Review + short review note
```

---

# Part 1 — Apple Developer

### Step 1 — Get the real Team ID

1. Open [Membership details](https://developer.apple.com/account#MembershipDetailsCard).  
2. Find **Team ID**.  
3. It is **exactly 10** characters (example shape: `A1B2C3D4E5`).  
4. Save as `APPLE_TEAM_ID` in a password manager.

**Not the Team ID:** email, “Farid Hussain|…”, or long numbers in App Store Connect’s profile dropdown.

**Outcome:** you have a 10-character Team ID you will paste into the secret script / Supabase.

---

### Step 2 — Turn on Sign In with Apple for the iPhone app

1. Open [Identifiers](https://developer.apple.com/account/resources/identifiers/list).  
2. Open App ID **`online.trimit.app`**.  
3. Under Capabilities, enable **Sign In with Apple**.  
4. If asked: primary App ID = this app. Leave server notification URL blank.  
5. **Save** (confirm if asked).

**Outcome:** Apple allows this bundle to use Sign in with Apple. Without this, native SIWA fails even if the button shows.

---

### Step 3 — Create a Services ID (required for Supabase secret + web)

Native iPhone talks with the **App ID**.  
Supabase’s Apple provider still needs a **Services ID** + return URL for OAuth config (and for **website** login).

1. [Identifiers](https://developer.apple.com/account/resources/identifiers/list) → **+** → **Services IDs**.  
2. Description: `TrimiT Web Auth`.  
3. Identifier: **`online.trimit.app.auth`** (if free; keep this exact name).  
4. Register → open it → enable **Sign In with Apple** → **Configure**.  
5. Primary App ID: **`online.trimit.app`**.  
6. **Domains and Subdomains** (only the host, no https):

   ```text
   etpoecagsfhodtfuhblk.supabase.co
   ```

7. **Return URLs** (exact):

   ```text
   https://etpoecagsfhodtfuhblk.supabase.co/auth/v1/callback
   ```

8. Save everything on the Services ID.

**Outcome:** Services ID exists with correct Supabase domain + return URL. Web Apple login and Supabase secret setup can work.

---

### Step 4 — Create the Sign in with Apple key (`.p8`)

1. Open [Keys](https://developer.apple.com/account/resources/authkeys/list) → **+**.  
2. Name: `TrimiT Sign in with Apple`.  
3. Enable **Sign in with Apple** → choose primary App ID **`online.trimit.app`**.  
4. Continue → Register.  
5. **Download** the `.p8` file **once** (Apple will not let you download again).  
6. Note **Key ID** (10 characters) → save as `APPLE_KEY_ID`.  
7. Store the file **outside the git repo**, e.g.:

   ```text
   ~/secrets/trimit/AuthKey_XXXXXXXXXX.p8
   ```

**Never** put `.p8` on GitHub or in chat.

**Outcome:** you have (1) file on disk, (2) Key ID, (3) Team ID from Step 1 — enough to generate the Supabase secret.

---

# Part 2 — Secret JWT + Supabase

### Step 5 — Generate the Apple client secret (on your Mac)

Apple does **not** give you a long-lived “API key string” for Supabase.  
You **sign** a short JWT (max ~6 months) with the `.p8` file.

From repo root:

```bash
node scripts/generate-apple-client-secret.mjs \
  --team-id YOUR_TEAM_ID_10_CHARS \
  --key-id YOUR_KEY_ID_10_CHARS \
  --client-id online.trimit.app.auth \
  --p8 ~/secrets/trimit/AuthKey_XXXXXXXXXX.p8
```

- The script prints one long JWT (three dots `xxx.yyy.zzz` style).  
- That string is Supabase’s **Secret Key** / client secret.  
- Do not commit it or paste it into GitHub, Slack, or Cursor chat.

**Outcome:** you have a JWT to paste into Supabase. Without it, Supabase Apple stays broken.

---

### Step 6 — Enable Apple in Supabase

1. Open [Auth → Providers → Apple](https://supabase.com/dashboard/project/etpoecagsfhodtfuhblk/auth/providers).  
2. **Enable** Apple.  
3. Fill (labels may vary slightly):

| Field | Put this |
|--------|----------|
| **Client IDs** | `online.trimit.app` **and** `online.trimit.app.auth` (both — bundle for native, Services ID for web) |
| **Secret Key** | JWT from Step 5 |
| **Team ID** (if shown) | 10-char Team ID from Step 1 |
| **Key ID** (if shown) | 10-char Key ID from Step 4 |

4. Save.

Upstream reference: [Supabase — Login with Apple](https://supabase.com/docs/guides/auth/social-login/auth-apple).

**Outcome:** Supabase can accept Apple tokens from the iPhone app and web OAuth.  
Button in the app can succeed after Step 6 + a good build (not only after Step 2).

---

### Step 7 — Redirect URLs (needed for web Apple; good hygiene for all OAuth)

1. Supabase → **Authentication** → **URL Configuration**.  
2. Site URL: production site, e.g. `https://trimit.online`.  
3. **Redirect URLs** must include at least:

```text
https://trimit.online/auth/callback
http://localhost:3000/auth/callback
http://localhost:5173/auth/callback
```

**Outcome:** after web Apple login, browser returns to TrimiT without “redirect URL not allowed”.

---

### Step 8 — Link identities (one human = one account)

1. Supabase → Auth settings / providers area → **automatic linking** (same verified email).  
2. Turn **ON**.

**Outcome:** same person using Google yesterday and Apple today does **not** create two TrimiT users.

---

### Step 9 — Calendar: secret expires every ≤ 6 months

- Remind yourself: “Regenerate Apple Supabase secret” every **5 months**.  
- Re-run Step 5 with the **same** `.p8` → paste new JWT into Supabase.  
- If you forget: web Apple (and misconfigured provider) can break until you rotate.

**Outcome:** you will not wake up one day with random Apple login failures from an expired JWT.

---

# Part 3 — Build the iOS app + App Store

### Step 10 — Confirm App Store Connect app exists

1. [App Store Connect](https://appstoreconnect.apple.com) → My Apps.  
2. App for bundle **`online.trimit.app`** should exist (create if missing).  

**Note:** ASC has **no** separate “turn on Sign in with Apple” switch for code. Capability comes from Developer + **entitlement inside the binary**.

**Outcome:** you have a place to upload the new build and send for review.

---

### Step 11 — Rebuild iOS (portals alone do not fix an old IPA)

1. Ship the code branch that already has Apple files (Login button, `expo-apple-authentication`, `usesAppleSignIn: true`).  
2. Bump **iOS build number** if you already uploaded that number.  
3. Confirm in `mobile/app.config.js`:

```js
// plugins include:
'expo-apple-authentication'
// ios:
usesAppleSignIn: true
```

4. Rebuild native iOS (your normal path), for example:

```bash
cd mobile
npx expo prebuild --platform ios   # if you regenerate the ios/ project
# then Xcode Archive, or EAS production iOS
```

5. In Xcode: target → **Signing & Capabilities** → **Sign In with Apple** must appear.  
   - If only push (`aps-environment`) shows, prebuild/capability is missing — do **not** submit that build.

**Outcome:** a new IPA/TestFlight build that **includes** the SIWA entitlement and black Apple button code. Reviewers get this build, not your Metro-only machine.

---

### Step 12 — TestFlight test on a real iPhone

Install the new build. On **physical iPhone** (not only simulator / Expo Go):

```
[ ] Black “Sign in with Apple” under Google on Login
[ ] Cancel Apple sheet → no crash, no spam error
[ ] First success → Complete Profile (name / role) if new user
[ ] Second open → correct home (customer / owner)
[ ] Hide My Email still signs in (relay email is OK)
[ ] Sign out → Sign in with Apple again works
[ ] Home / my bookings load (proves /auth/me + backend JWT work)
```

**Outcome:** you personally proved SIWA before Review. Do **not** resubmit until every line is green.

---

### Step 13 — Resubmit + review reply (Guideline 4.8)

In the review notes (or reply to rejection):

```text
Hello App Review Team,

We implemented Sign in with Apple alongside Google Sign-In / email OTP.

How to test:
1. Install the submitted build.
2. Open the app → Login screen.
3. Tap “Sign in with Apple” (black button).
4. Complete the Apple sheet (Sandbox Apple ID if needed).
5. New accounts complete profile; existing accounts enter the app.

Sign in with Apple is available on iOS when the device supports it.
Thank you.
```

**Outcome:** reviewers know where the button is and how to exercise it.

---

# Optional (not required for first pass)

| Item | Why |
|------|-----|
| Hide My Email communication | Apple Developer → Services → email communication |
| Sandbox Apple ID | App Store Connect → Users and Access → Sandbox |
| Web Sign in with Apple | Uses same Supabase Apple config; less urgent than iOS for this rejection |

---

# Backend note (no new Render endpoint)

```
iPhone  →  Supabase Auth JWT  →  Authorization: Bearer …
        →  FastAPI GET /auth/me  →  profile / complete-profile
```

Same path as Google. Do **not** invent a custom “Apple login API” on Render.

---

# Troubleshooting (symptom → fix)

| What you see | Likely cause | Fix |
|--------------|--------------|-----|
| No Apple button | Android, or old build without SIWA, or `isAvailableAsync` false | Real iPhone + new SIWA build |
| Button → provider / idp error | Supabase Apple off or bad secret | Steps 5–6 again |
| Nonce / id_token error | Old/wrong binary | Ship current `appleAuthService` nonce flow |
| Web “invalid client” | Bad Services ID domain/return URL | Step 3 exact host + callback |
| Worked months ago, fails now | JWT expired | Step 5 + re-paste in Supabase |
| Two accounts same email | Link identities off | Step 8 |
| Email looks like `privaterelay.appleid.com` | Hide My Email | Normal |
| Review still rejects | Old binary uploaded | Step 11–13 again |

**Logs:** Supabase → Logs → Auth while you fail a sign-in once.

---

# Security (non-negotiable)

- Never commit: `.p8`, Apple JWT secret, Supabase **service_role** key.  
- If `.p8` leaks: revoke key in Apple Developer → new key → new JWT → update Supabase.

---

# Done = all of these true

1. Real iPhone TestFlight signs in with Apple.  
2. `/auth/me` / home works after that login.  
3. New user can complete profile.  
4. That same build is submitted **In Review** (or approved).

---

## Related

| Doc / file | Role |
|------------|------|
| [`auth-flow.md`](../architecture/auth-flow.md) | Architecture sketch |
| [`SIGN_IN_WITH_APPLE_WITHOUT_SUPABASE.md`](./SIGN_IN_WITH_APPLE_WITHOUT_SUPABASE.md) | Not used by TrimiT |
| [`mobile/IOS_SETUP_GUIDE.md`](../../mobile/IOS_SETUP_GUIDE.md) | Xcode / TestFlight general |
| `scripts/generate-apple-client-secret.mjs` | JWT generator |
| [Supabase Login with Apple](https://supabase.com/docs/guides/auth/social-login/auth-apple) | Official provider docs |

---

*Last updated: 2026-08-10 — project `etpoecagsfhodtfuhblk`. Code path: Expo + Supabase (native id token).*
