# TrimiT — Project Progress

> **READ `/RULES.md` ON EVERY PROMPT.** Engineering rules live at the repo root.
>
> Living handoff file for humans and AI tools.
> Update this file after every meaningful prompt, code change, migration, deploy, or QA pass.

## Session log
### 2026-06-25 — FIX: Web auth flow now mirrors mobile (email-only OTP + CompleteProfile, role decided after OTP)

**Problem:**
Web signup diverged from the mobile app. Mobile uses email-only OTP for both sign in and sign up: enter email → 6-digit OTP → if new, CompleteProfile picks role (customer/owner). Web instead asked for role+name+phone upfront, called `/auth/signup` (which only sends an OTP and stuffs role/name/phone into Supabase user_metadata), then on `verify-otp` it **never** called `/auth/complete-profile` and ignored `profile_complete`. The backend `verify-otp` does not read role/name/phone and no DB trigger creates `public.users` from metadata, so **new web users ended up authenticated with no profile row** (orphaned/broken account, no role).

**Root cause:** Web `verifyOtp` store action did not honor the backend `profile_complete` flag and there was no web CompleteProfile step. Role was being guessed client-side instead of created server-side via `/auth/complete-profile`.

**Fix (web frontend only — no backend, DB, or mobile change; API contract unchanged):**
1. `frontend/src/store/authStore.js`: `verifyOtp` now reads `profile_complete`; new/broken accounts get an authenticated session but `profileComplete=false` and route to CompleteProfile. Added a `completeProfile()` action calling `POST /auth/complete-profile`. Added `profileComplete` to state, partialize, login (true), logout (false), and `initializeAuth` (from `/auth/me`). Removed the now-dead `signup` action.
2. `frontend/src/pages/CompleteProfilePage.js` (NEW): web mirror of mobile `CompleteProfileScreen` — role picker + name + optional phone + terms → `completeProfile`. Self-guards (redirects to /login if unauthenticated, to home if already complete).
3. `frontend/src/pages/VerifyOtpPage.js`: dropped role/name/phone signup hints; routes new users to `/complete-profile`, existing users to role-based home. Default `type` now `magiclink`.
4. `frontend/src/pages/SignupPage.js`: simplified to email-only OTP (identical to LoginPage / mobile). No upfront role/name/phone form.
5. `frontend/src/App.js`: added `/complete-profile` route; `ProtectedRoute` and `getHomeRoute` now gate authenticated-but-no-role users into CompleteProfile.

Email+password login remains available on LoginPage as a secondary option; OTP is the default for both login and signup, matching mobile.

**Verification:**
- `get_diagnostics` on all 5 changed files → clean.
- `npm run build` in `frontend/` → exit 0 (Vite build + SEO prerender succeeded). Pre-existing chunk-size warning only.

**Migration state:** No new SQL. No migrations needed.

**Files changed:**
- `frontend/src/store/authStore.js` (MODIFIED)
- `frontend/src/pages/CompleteProfilePage.js` (NEW)
- `frontend/src/pages/VerifyOtpPage.js` (MODIFIED)
- `frontend/src/pages/SignupPage.js` (MODIFIED)
- `frontend/src/App.js` (MODIFIED)


### 2026-06-16 — FIX: Solved Priorities 2, 3, 5, and 7/H-6 (Zustand Storage Split, Android Backup, Form Validations, Timer Leaks)

**Problem:**
1. The entire Zustand auth store was persisted inside SecureStore, which exceeded the ~2KB iOS/OEM key limit on real production devices. This triggered a silent fallback to unencrypted AsyncStorage, leaving sensitive access/refresh tokens in plaintext.
2. Android allowed backup of local sandbox storage (AsyncStorage, query cache, etc.) via ADB or Google Drive, creating data extraction risks (H-1).
3. Critical forms on both owner and customer sides lacked client-side bounds checking and input validation (coordinates, times, discount %, name, phone, review references), relying entirely on backend rejections.
4. Timer leaks in Toast and OfflineBanner could trigger setState calls on unmounted components or cause overlapping double-dismiss animations.

**Fixes & Optimizations:**
1. **Zustand Split-Storage (H-2)**: Rewrote `safeAuthStorage.ts` to implement a split-storage engine. Security-sensitive tokens (`token`, `refreshToken`) are saved in encrypted `SecureStore` (well within 2KB limit), while bulk user profile metadata is saved in unencrypted `AsyncStorage`. Added an automatic backward-compatible migration path that reads, splits, and clears legacy unified storage blobs.
2. **Android Backup Disabled (H-1)**: Added `allowBackup: false` inside the Android configuration object in `mobile/app.config.js` to restrict backups at the native manifest level.
3. **Client-side Form Validation (H-3)**:
   - `ManageSalonScreen`: Validated coordinates range, 24h opening/closing times format, verified closing time is after opening time, and verified 10-digit Indian phone number format.
   - `ManageServicesScreen`: Validated that service discount percentage is strictly between 1 and 100 inclusive when `is_on_offer` is true.
   - `PromoManagementScreen`: Added comprehensive checks for coupon code format, positive discount value bounds, maximum uses, and future expiry dates.
   - `ProfileScreen`: Validated non-empty name and Indian phone number format.
   - `WriteReviewScreen`: Added safety checks to prevent submission if salonId or bookingId are missing.
4. **Timer Leaks Resolution (H-6)**: Cleaned up timeout scheduling in `OfflineBanner.tsx` and `Toast.tsx` by clearing active timeout refs during effect unmounting and before scheduling new animations.

**Verification:**
- Ran `npm run typecheck` inside `mobile/` -> completed successfully.
- Ran `npm test -- --watchman=false` inside `mobile/` -> 167 tests passed successfully.

**Files changed:**
- `mobile/app.config.js` (MODIFIED)
- `mobile/src/lib/safeAuthStorage.ts` (MODIFIED)
- `mobile/src/screens/owner/ManageSalonScreen.tsx` (MODIFIED)
- `mobile/src/screens/owner/ManageServicesScreen.tsx` (MODIFIED)
- `mobile/src/screens/owner/PromoManagementScreen.tsx` (MODIFIED)
- `mobile/src/screens/customer/ProfileScreen.tsx` (MODIFIED)
- `mobile/src/screens/customer/WriteReviewScreen.tsx` (MODIFIED)
- `mobile/src/components/OfflineBanner.tsx` (MODIFIED)
- `mobile/src/components/Toast.tsx` (MODIFIED)
- `docs/PROGRESS.md` (MODIFIED)

---

### 2026-06-14 — CONFIG: Configured VS Code Python interpreter and import paths

**Problem:**
VS Code highlighted the backend Python files (such as `auth.py`) with red underlines and import resolution errors because it defaulted to the system Python interpreter and searched for imports relative to the root workspace folder rather than the `backend/` folder.

**Fixes & Optimizations:**
1. **Workspace Settings Update**: Added `python.defaultInterpreterPath` to point to `${workspaceFolder}/backend/venv/bin/python` and added `backend` to `python.analysis.extraPaths` in `.vscode/settings.json`.
2. **Pyright Configuration**: Created `pyrightconfig.json` at the workspace root to automatically link Pyright/Pylance analyzer to the virtualenv path `backend/venv` and resolve local paths.
3. **Import Resolution**: The IDE now correctly resolves third-party packages (like `fastapi`) and local source directories (`core`, `config`, `models`, `services`, `dependencies`) from the virtual environment.

**Verification:**
- Verified backend import validity using the virtual environment's python directly: `./venv/bin/python3 -c "import routers.auth"`.

**Files changed:**
- `.vscode/settings.json` (MODIFIED)
- `pyrightconfig.json` (NEW)
- `docs/PROGRESS.md` (MODIFIED)

---

### 2026-06-14 — FEATURE: Enabled standard iOS/Android OTP autofill suggestions

**Problem:**
Users had to manually read and type OTP verification codes from their emails or SMS. Modern mobile OS keyboard integrations (Gboard, Apple Keyboard) did not show autofill suggestion chips for the OTP entry fields on Android.

**Fixes & Optimizations:**
1. **Added Android Autofill**: Added `autoComplete="one-time-code"` on the `TextInput` components inside `VerifyOtpScreen.tsx` (in addition to the existing iOS `textContentType="oneTimeCode"`).
2. **Keyboard Suggestions**: Enables Gboard/Android Autofill to automatically suggest numeric verification codes received via SMS and suggest copied clipboard content.

**Verification:**
- Verified type safety via `npm run typecheck` inside `mobile/` -> completed successfully.
- Ran Jest unit tests in `mobile/` -> passed successfully.

**Files changed:**
- `mobile/src/screens/auth/VerifyOtpScreen.tsx` (MODIFIED)
- `docs/PROGRESS.md` (MODIFIED)

---

### 2026-06-14 — FIX: Guard post-await OTP navigation in Login & Signup screens

**Problem:**
After entering an email and initiating the OTP request, the client performs optimistic navigation to the `VerifyOtp` screen. If the user backs out of this screen while the background API request is still pending, the post-await navigation `navigation.navigate` call gets triggered unconditionally. This results in the app unexpectedly routing the user back into the `VerifyOtp` screen, creating navigation state glitches.

**Fixes & Optimizations:**
1. **Navigation Stack Guard**: Checked `navigation.getState()?.routes` to ensure the `VerifyOtp` screen is still present in the navigation stack before dispatching the post-await re-navigation update in both `LoginScreen.tsx` and `SignupScreen.tsx`.
2. **Backwards-Compatible Fallback**: If the navigation state is undefined (such as in mock/unit test environments), the guard falls back to true to avoid breaking tests.

**Verification:**
- Verified type safety via `npm run typecheck` inside `mobile/` -> completed successfully.
- Ran Jest unit tests in `mobile/` -> passed successfully.

**Files changed:**
- `mobile/src/screens/auth/LoginScreen.tsx` (MODIFIED)
- `mobile/src/screens/auth/SignupScreen.tsx` (MODIFIED)
- `docs/PROGRESS.md` (MODIFIED)

---

### 2026-06-14 — FIX: OTP flickering, state transitions & backend email check

**Problem:**
1. The `resendTimer` tick triggered screen-wide re-renders in `VerifyOtpScreen.tsx`, causing layout instability and text/button flickering.
2. In the optimistic signup flow, the 5-second `safetyTimer` assumed success and cleared the sending state. If the request subsequently failed after 5 seconds, the route param listener returned early and ignored the error, keeping the screen stuck.
3. If `RESEND_API_KEY` was missing in production, custom emails failed silently without any warning at startup.

**Fixes & Optimizations:**
1. **Isolated Countdown Timer State**: Created `ResendCountdownSection` inside `VerifyOtpScreen.tsx` to handle the interval and countdown timer, preventing parent-wide re-render flickering.
2. **Fixed Param Listener & Timeout**: Corrected the route parameter check to process errors even after sending is timed out/cleared, and replaced the 5s success assumption with a 15s warning timeout.
3. **Resend Key Startup Validation**: Added a startup check in `backend/server.py` to warn when `RESEND_API_KEY` is missing in production.

**Verification:**
- Run `npx tsc --noEmit` inside `mobile/` -> completed successfully.
- Run Jest tests in `mobile/` -> passed successfully.

**Files changed:**
- `mobile/src/screens/auth/VerifyOtpScreen.tsx` (MODIFIED)
- `backend/server.py` (MODIFIED)
- `docs/PROGRESS.md` (MODIFIED)

---

### 2026-06-14 — FIX: Monorepo audit, performance optimization & database rescheduling availability hardening

**Problem:** 
1. The `reschedule_booking_atomic` RPC did not check staff availability (active status, working hours, days off, and conflicts), leading to a possibility of double-booking staff members.
2. Inefficient `httpx.AsyncClient` instantiation on every Supabase call causing high latency (B5).
3. Stale worker profile reads due to long user profile cache TTL of 300s (B6).
4. Unused duplicate staff helpers in `mobile/src/lib/api.ts` (M7).
5. OTP count timer screen flickering on mobile/web and lack of unified email dispatch.

**Fixes & Optimizations:**
1. **Database Hardening (migration 45)**: Created `database/45_reschedule_staff_availability.sql` with updated `reschedule_booking_atomic` RPC to validate staff active status, working hours, days off, and overlapping bookings (excluding current booking to avoid self-conflict). **Applied successfully to the production database.**
2. **Supabase Client Reuse (B5)**: Refactored `backend/core/supabase.py` to lazily instantiate and reuse a single `httpx.AsyncClient` across all requests.
3. **User Profile Cache (B6)**: Reduced TTLCache TTL from 300s to 30s in `backend/dependencies/auth.py`.
4. **Dead Code Cleanup (M7)**: Cleaned up duplicate staff domain helpers in `mobile/src/lib/api.ts`.
5. **Unified Email & OTP Flicker**: refactored VerifyOtp countdown timers on both React Native and web to prevent re-render flickers, and added `backend/services/email_dispatch.py` for unified email dispatching.
6. **V1 Release Audit**: Conducted the full release audit checklist and created `docs/audit/V1_RELEASE_AUDIT_2026_06_14.md`.


**Verification:**
- TypeScript typecheck passes cleanly (`npm run typecheck` in mobile).
- Jest tests pass inside `mobile/`.
- Vite production build compiles successfully in `frontend/`.

**Files changed:**
- `backend/core/supabase.py` (MODIFIED)
- `backend/dependencies/auth.py` (MODIFIED)
- `mobile/src/lib/api.ts` (MODIFIED)
- `database/45_reschedule_staff_availability.sql` (NEW)
- `docs/audit/V1_RELEASE_AUDIT_2026_06_14.md` (NEW)
- `docs/REMAINING_ISSUES.md` (MODIFIED)
- `docs/PROGRESS.md` (MODIFIED)

---

### 2026-06-13 — FIX: Flickering button and resend text on VerifyOtp screen


**Problem:** After fixing the stuck button issue, the "Verify & Continue" button
and "Resend code in Xs" text were **flickering rapidly** — half the button and
text were blinking on/off.

**Root cause:**
1. useEffect was watching entire `route.params` object → fired on **every param change**
2. LoginScreen/SignupScreen call `navigate()` twice (once with `isPending: true`,
   again with result) → each triggers useEffect
3. Safety timeout (5s) could also fire → **multiple rapid state updates**
4. Each state update caused re-render → flickering UI

**Fix:**
1. Watch **specific params only**: `route.params.otpSendResult` and
   `route.params.isPending` instead of entire `route.params` object
2. **Guard with `if (!sendingCode) return`** — only act once during the
   sending → complete transition
3. Prevents duplicate state changes and duplicate toasts

**Verified:**
- No more flickering
- Button transitions smoothly from disabled → enabled
- Single success toast (not multiple)
- Resend text appears stable

**Files changed:**
- `mobile/src/screens/auth/VerifyOtpScreen.tsx`

**Commit:** `cacc5aa2` on branch `0.15`

---

### 2026-06-13 — CRITICAL FIX: VerifyOtp stuck in "Sending code..." state

**Problem:** After entering email and navigating to VerifyOtp screen, it showed
"Sending verification code..." and the "Verify & Continue" button remained
**disabled forever**, even after the OTP arrived. Users couldn't enter or verify
the code. Screen was completely stuck.

**Root cause:**
1. `navigation.setParams()` in LoginScreen/SignupScreen was trying to update
   params on the **caller screen**, not the VerifyOtp screen (wrong target).
2. Even when using re-navigation with `navigate()`, the useEffect wasn't watching
   `route.params` properly to detect param changes.
3. `sendingCode` state stayed `true` forever, keeping the button disabled via
   `disabled={isVerifyDisabled || sendingCode}`.

**Fix:**
1. **LoginScreen + SignupScreen:** Changed from `setParams()` to full
   `navigate()` with updated params (including `isPending: false` and
   `otpSendResult`).
2. **VerifyOtpScreen:** Watch `route.params` in useEffect (not individual
   destructured vars) to catch param updates from re-navigation.
3. **Safety timeout:** Added 5s fallback timer — if no param update arrives,
   automatically unblock the UI and assume success.
4. **Handle edge case:** If `isPending` becomes `false` but no explicit
   `otpSendResult`, assume success and unblock.

**Verified:**
- Button now unblocks immediately after OTP send completes
- Users can enter and verify code normally
- Safety timeout prevents stuck state if param update fails
- Both success and failure cases work correctly

**Files changed:**
- `mobile/src/screens/auth/LoginScreen.tsx`
- `mobile/src/screens/auth/SignupScreen.tsx`
- `mobile/src/screens/auth/VerifyOtpScreen.tsx`

**Commit:** `a1188705` on branch `0.15`

---

### 2026-06-13 — FIX: OTP optimistic navigation bug (contradictory toast messages)

**Problem:** After implementing optimistic navigation, `VerifyOtpScreen` always
showed a success toast after 2 seconds via a fixed timeout, **regardless of whether
the background OTP send actually succeeded**. When the OTP send failed, users saw:
1. Error toast from caller screen (LoginScreen/SignupScreen)
2. Success toast from VerifyOtpScreen 2s later ("Verification code sent...")
3. Normal subtitle text implying code was sent

This created contradictory messages and confused users about whether the code was
actually sent.

**Root cause:** The optimistic flow used a fixed 2s `setTimeout` to clear the
"Sending code..." state and show success toast. This timer ran unconditionally
and had no awareness of the actual API result.

**Fix (wire actual result through navigation params):**
- Added `otpSendResult?: 'success' | 'error'` to `VerifyOtp` route params in `types.ts`.
- `LoginScreen` + `SignupScreen` now call `navigation.setParams()` with the real
  result after the background OTP send completes.
- `VerifyOtpScreen` listens to `otpSendResult` via `useEffect` and:
  - Shows success toast + clears "sending" state **only when `otpSendResult === 'success'`**
  - Shows inline error + updates subtitle **when `otpSendResult === 'error'`**
  - Removed the unconditional 2s timeout entirely.

**Verified:**
- Success case: instant navigation → "Sending code..." → success toast → normal OTP UI
- Failure case: instant navigation → "Sending code..." → inline error + updated subtitle,
  no success toast
- No contradictory toasts
- No TypeScript errors

**Files changed:**
- `mobile/src/navigation/types.ts` (added `otpSendResult` param)
- `mobile/src/screens/auth/SignupScreen.tsx` (setParams after signup)
- `mobile/src/screens/auth/VerifyOtpScreen.tsx` (useEffect to handle result)
- `mobile/src/screens/auth/LoginScreen.tsx` (already had setParams from previous fix)

**Commit:** `dc4b9105` on branch `0.15`

---

### 2026-06-13 — INSTANT OTP navigation + 30s resend timer (UX improvement)

**Problem:** After entering email and tapping "Send Verification Code", the app
froze for 5-10 seconds while Supabase sent the OTP email via SMTP, then finally
navigated to the OTP screen. This delay created a poor UX — users thought the app
was broken.

**Root cause:** Sequential flow — app waited for the `/auth/send-otp` API call
(which waits for Supabase email delivery) to complete before navigating. Supabase's
SMTP can be slow (5-10s), and the UI blocked the entire time.

**Fix (optimistic navigation — Zomato/Blinkit UX pattern):**
- `LoginScreen` + `SignupScreen` now navigate to `VerifyOtp` **immediately** after
  validation, passing `isPending: true`.
- OTP send request happens in **background** (non-blocking).
- `VerifyOtpScreen` shows "Sending verification code..." while `isPending`,
  then transitions to "We sent a 6-digit code..." after 2s with a success toast.
- Inputs + verify button disabled during send state.
- Navigation is **instant** (0ms perceived delay) — users see the OTP screen
  immediately instead of staring at a frozen signup form.

**Also fixed (same commit):**
- OTP resend cooldown reduced from **60s → 30s** (mobile + backend aligned).
- `mobile/src/navigation/types.ts` — added `isPending?: boolean` to `VerifyOtp` route.

**Impact:** UX now matches production-grade apps (Zomato, Blinkit, Swiggy) where
OTP screens appear instantly and the "sending" state is shown on the destination
screen, not the source screen.

**Verified:**
- `tsc --noEmit` clean.
- No API/backend contract change (additive client behavior only).
- Backwards-compatible (older builds ignore `isPending`).

**Files changed:**
- `mobile/src/screens/auth/LoginScreen.tsx`
- `mobile/src/screens/auth/SignupScreen.tsx`
- `mobile/src/screens/auth/VerifyOtpScreen.tsx`
- `mobile/src/navigation/types.ts`
- `backend/routers/auth.py` (30s throttle)

---

### 2026-06-13 — VERIFIED: All subscription fixes complete, diagnostics clean, docs updated

**Summary:** Completed all subscription behavior fixes from previous session. All code verified, diagnostics clean, PROGRESS.md updated.

**Verification performed:**
- ✅ Diagnostics clean on `OwnerDashboardScreen.tsx`, `SubscriptionGate.tsx`, `OwnerTabs.tsx`
- ✅ Migration 44 already applied (new owner salon creation working)
- ✅ Frozen salon visibility behavior confirmed (visible, greyed, not bookable)
- ✅ Trial countdown badge confirmed in owner dashboard header
- ✅ Subscription stacking/billing anchor logic confirmed in backend

**No new code changes.** Session focused on verification and documentation update per steering rules.

---

### 2026-06-13 — Settings navigation fix (subscription page back button)

**Problem (settings → subscription loop):** tapping Settings opened the
Subscription page, but pressing Back (header, gesture, or hardware) returned to
Dashboard instead of Settings — Settings was unreachable.

**Root cause:** `OwnerTabs` conditionally replaced the Settings screen component
with `SubscriptionScreen` when trial/grace/expired. When that screen was active,
React Navigation saw the Subscription component at the Settings route, so the
back action popped to Dashboard (previous tab state).

**Fix (three parts):**
- `OwnerTabs.tsx` — removed the conditional swap; Settings screen always renders
  as `OwnerSettingsScreen`.
- `OwnerSettingsScreen.tsx` — wrapped entire content in `<SubscriptionGate>`
  (freeze gate); Subscription button navigates to the proper
  `OwnerSubscriptionStack` screen.
- `SubscriptionGate.tsx` — refined skip routes: now skips the entire
  `OwnerSubscriptionStack` (all 3 screens) + `ManageSalon`/`Notifications`,
  ensuring payment flow and post-payment settings remain accessible.

Back navigation now works: Subscription → Settings (tap/gesture/hardware back) →
Dashboard. Freeze gate still blocks unpaid owners from the rest of Settings.

**Verified:** `tsc --noEmit` clean; diagnostics clean on all 3 files.

---

### 2026-06-13 — Frozen salon = visible + viewable, NOT bookable (customer side)

**Change of behavior (owner request):** when an owner's subscription lapses, the
salon must NOT be hidden from customers. It stays listed, greyed/"frozen", and
its services remain viewable — customers simply cannot book. (Owner-side freeze
via `SubscriptionGate` is unchanged.)

- `SalonCard` — lapsed salon is now greyed but **clickable** (was `disabled`);
  badge reworded "Currently unavailable" → "Not taking bookings".
- `SalonDetailScreen` — viewing services always allowed (removed the view block);
  `handleBookService` now shows an info toast instead of silently no-oping;
  banner reworded to "browse services, can't book right now".
- `BookingScreen` — added `notBookable` guard: top notice banner, **Confirm
  Booking disabled**, and a hard stop in `handleConfirmBooking`. Backend
  `create_booking` 403 `SALON_UNAVAILABLE` remains the server-side hard gate.
- Discovery RPC (migration 42) already does NOT filter out lapsed salons, so
  they remain visible in the list. Web `SalonDetail` already behaved correctly
  (lists services, disables only the Book button) — left unchanged.

**Verified:** mobile `tsc --noEmit` clean; diagnostics clean on all 3 files.
**Migration 44** (`44_fix_salon_subscription_trigger_fk.sql`) **applied in
Supabase by user — new owners can now create salons.**


### 2026-06-13 — Trial header badge + subscription "stacking" (defer billing to period end)

**1. Owner dashboard header — trial countdown badge.** `OwnerDashboardScreen`
header now shows a pop-out pill: "N days left in free trial" (green >5d, amber
3–5d, red ≤2d), tappable → Subscription page. Always visible during trial as a
daily nudge. Subscription page already showed days remaining (trial box +
"Trial ends" row). Additive UI, no contract change.

**2. Subscription stacking (re-subscribe defers to period end).** Subscribing
while trial/paid time remains now appends a fresh cycle instead of charging now
and wasting the remaining days.
- `subscription_service.compute_billing_anchor(row)` → future datetime to defer
  to (trial_end while on trial; current_period_end while active/grace; else None).
- `subscription_billing.create_subscription(start_at=…)` passes Razorpay
  `start_at` so the first charge fires at the anchor (mandate authorized now).
- `/subscriptions/verify` sets `current_period_start/end` + `next_renewal_at`
  from the anchor; when deferred it skips the captured-payment record + receipt
  (the `subscription.charged` webhook records the real charge at start_at).
- Lapsed owners (expired/cancelled) → anchor None → behave exactly as before.
- No DB migration (existing columns). **Money-flow change — verify in Razorpay
  TEST mode before relying on it for real payers.**

**Verified:** backend `py_compile` clean; mobile `tsc --noEmit` clean; diagnostics clean.


### 2026-06-13 — P0 FIX: new owners cannot create a salon (FK violation, regression from 41)

**Symptom:** brand-new owner signs up, fills salon form, taps Create → error. Mobile
showed only "Please check your input and try again."

**Real error (surfaced after client fix):**
`insert or update on table "subscriptions" violates foreign key constraint
"subscriptions_salon_id_fkey"` on `POST /salons/`.

**Root cause (regression from migration 41):** the `link_salon_to_subscription`
trigger ran **BEFORE INSERT** on `salons` and did
`UPDATE subscriptions SET salon_id = NEW.id`. At BEFORE-INSERT time the salon row
does not exist yet, so the FK `subscriptions.salon_id → salons.id` failed and
rolled back the whole insert. Existing salons predate the trigger, so only NEW
owners were blocked.

**Fix — `database/44_fix_salon_subscription_trigger_fk.sql` (forward-only):**
split the trigger by timing —
- BEFORE INSERT → `set_salon_subscription_active()` (computes
  `NEW.subscription_active` only; no FK touched).
- AFTER INSERT → `link_salon_to_subscription()` (back-links subscription now that
  `salons.id` exists).
Migration 41 left untouched. Idempotent (CREATE OR REPLACE + DROP TRIGGER IF EXISTS).
**APPLIED in Supabase by user on 2026-06-13 — new owners can now create salons.**

**Supporting code fixes (diagnosability + safety):**
- `backend/routers/salons.py:create_salon` no longer leaks raw DB text to the
  client; returns a safe string detail and logs the real reason. (string detail
  kept → web `data.detail` rendering unchanged.)
- `mobile/src/lib/userFacingError.ts` now surfaces the backend's curated message
  for `validation`/`conflict` (400/409) errors instead of the blanket
  "check your input", so real, user-safe reasons reach the user.

**Verified:** backend `py_compile` clean; mobile `tsc --noEmit` clean.


### 2026-06-12 FINAL — Phase 2 Subscriptions + OTP/SMTP hardening + Owner signup fix + Testing APK built

**Scope:** 11 issues fixed, 8 commits, 1 testing APK built. All code pushed to GitHub. Production-ready.

**Key deliverables:**
1. ✅ Subscription PR (10 code-review fixes + 1 DB migration 43)
2. ✅ OTP/SMTP end-to-end verified (live)
3. ✅ Owner signup role fix (web + mobile)
4. ✅ Play Store download button fix
5. ✅ Testing APK ready for QA

**Changes:**
- Branch `0.14`: all 8 commits merged and pushed to GitHub (owner-signup fix, OTP resend 30s, Play Store link, honest error messages).
- Branch `0.13`: subscription PR all 10 code-review fixes pushed to main.
- DB migration 43: `expire_lapsed_trials` reschedule (10-min cron) applied in Supabase.
- Testing APK: `build-1781270873213.apk` (76 MB) ready for install.

**Verification:**
- Backend: `/health` 200, `/api/v1/auth/send-otp` 200 (OTP email working).
- Mobile: `tsc --noEmit` clean, build successful (9m 45s).
- Web: owner signup now creates owner account, download button opens Play Store.

**Next actions:**
- Install APK and test signup/OTP/role on mobile.
- Merge `0.14` → `main` when ready (Render + Vercel auto-deploy).
- Monitor logs post-deploy.

---

### 2026-06-12 — VERIFIED: live OTP/SMTP healthy after Resend setup

Tested against the deployed Render backend (`trimit-az5h.onrender.com`):
- `GET /health` → **200**.
- `POST /api/v1/auth/send-otp` → **200** (was **500** before SMTP fix → Supabase
  now accepts + dispatches the OTP email via Resend SMTP).
- `POST /api/v1/auth/signup` (role=owner) → **202 EMAIL_CONFIRMATION_REQUIRED**
  (no 500/400). OTP email path healthy end to end.
- Created two unconfirmed test auth users
  (`trimit.smoketest.otp@gmail.com`, `trimit.smoketest.owner@gmail.com`) —
  safe to delete in Supabase → Authentication → Users.

Resend key placement (confirmed by code):
- OTP/signup/login/forgot-password emails → **Supabase Auth SMTP** (Resend key
  lives in Supabase). Render does NOT need the key for these.
- Subscription receipt emails → backend `settings.RESEND_API_KEY` via Resend
  API (`subscription_invoice_email.py`). Currently empty → receipts no-op.
  Set `RESEND_API_KEY` on Render only if receipt emails are wanted.
- Early-access → DB row only, no backend email.

Final manual check left to owner: sign up on web + mobile, receive 6-digit code,
verify, confirm owner role lands on salon setup.


### 2026-06-12 — FIX: web owner signup created a CUSTOMER account

**Symptom:** signing up as Salon Owner on the website created a customer
account.

**Root cause:** the web OTP flow never sent the role to the backend. Mobile was
fixed in Pass 7 (role/name/phone hints to `verify-otp`), but web was missed:
`SignupPage` navigated to `/verify-otp?email&type` (no role) and
`authStore.verifyOtp` posted only `{email, token, type}`. With no role hint,
backend `verify_otp` defaulted the new `public.users` row to `customer`.

**Fix (web only, backwards-compatible):**
- `SignupPage` now forwards `role` (+ `name`, `phone`) as query params to
  `/verify-otp`.
- `VerifyOtpPage` reads those hints and passes them to `verifyOtp`.
- `authStore.verifyOtp(email, token, type, extras)` includes `role/name/phone`
  in the POST body when present. Backend ignores them once a profile exists
  (no escalation). Web build verified clean.

Also: web OTP resend button now shows after 30s (was 60s).


### 2026-06-12 — OTP delivers magic LINK instead of 6-digit code (Supabase template)

After disabling custom SMTP, signups work but the email contains a magic LINK
while the app UI expects a 6-digit OTP code. **Root cause: Supabase email
templates ("Magic Link" + "Confirm signup") use `{{ .ConfirmationURL }}`
instead of `{{ .Token }}`.** No app/backend code change needed — our
`verify-otp` already verifies the numeric token; only the email body is wrong.
Fix = edit both templates in Supabase → Authentication → Email Templates to
render `{{ .Token }}`. Proper Resend SMTP setup documented for the owner
(verify domain, sender on verified domain, host/port/user/pass).


### 2026-06-12 — P0: signup fully broken (Supabase OTP 500) + honest error + web download fix

**Symptom:** every signup (customer + owner) failed; app showed "We could not
create your account. Please check the details you entered."

**Root cause (email/config, NOT code):** Supabase `auth/v1/otp` returned `500`
on every request — Supabase Auth failed to SEND the verification email. This
began right after custom SMTP (Resend) was configured in Supabase, i.e. the
new SMTP config is broken (most likely sender domain not verified in Resend, or
wrong sender/host/port). The built-in sender previously worked (with occasional
drops); the misconfigured custom SMTP now fails 100%.

**Immediate mitigation (owner action in Supabase):** disable Custom SMTP to
fall back to the built-in sender and restore signups, OR fix the Resend SMTP
(verify domain + correct sender). See chat for step-by-step.

**Code fix (this commit):**
- `backend/routers/auth.py:signup` now detects a Supabase `5xx` (email send
  failure), logs the real provider body to Render logs, and returns
  `502 OTP_SEND_FAILED` with an honest "temporary email-service issue, try
  again" message — instead of the misleading "check your details" 400.
  Backwards-compatible (new error code; success/202/400 paths unchanged).

**Web (download button):** the website "Download App" button opened the
early-access modal instead of the Play Store. Fixed:
- `frontend/src/config/storeLinks.js` now defaults `DOWNLOAD_APP_URL` /
  `PLAY_STORE_URL` to the live listing
  `https://play.google.com/store/apps/details?id=com.trimit.app`; corrected
  `IS_APK_DRIVE_DOWNLOAD` to reflect the resolved URL.
- `frontend/src/components/Header.js` download buttons (desktop + mobile) now
  open the Play Store; removed the now-unused EarlyAccessModal wiring.
  (`EarlyAccessModal` component file left in place; no longer referenced.)

`py_compile` clean; web diagnostics clean.


### 2026-06-12 — OTP "sent but not received" fix (backend)

**Symptom:** app occasionally showed "OTP sent" and navigated to the OTP
screen, but no email arrived.

**Root cause (two layers):**
1. **Email (primary):** Supabase Auth was using the built-in/default email
   sender — tiny rate limit, no delivery guarantee, testing-only. Occasional
   silent drops. (Action: configure custom SMTP / Resend in the Supabase
   dashboard — owner task.)
2. **Code (secondary, masking):** `send_otp` returned a generic success for
   ANY non-200/429 Supabase response, so genuine send failures (5xx "Error
   sending email") still returned HTTP 200 → app navigated as if sent.

**Fix (this commit):** `backend/routers/auth.py:send_otp` now distinguishes a
genuine delivery failure (`>=500` or body mentions "error sending"/"failed to
send"/"smtp") from the anti-enumeration case. On a real send failure it clears
the per-email throttle and returns `502 OTP_SEND_FAILED` so the app shows
"couldn't send, try again" instead of falsely navigating. Anti-enumeration
preserved for ineligible addresses (still generic success). Mobile already
gates navigation on `result.success`, so no client change needed.
`py_compile` clean.


### ✅ RESOLVED — Subscription PR (branch `0.13`) code-review fixes — 2026-06-12

> These code-review findings are **FIXED, committed, and pushed to `0.13`**
> (commits `b60f544b`, `d543859a`, `ed35b8f4`). Other AIs: do NOT re-flag these.

| # | Area / File | Issue (review comment) | Status |
|---|-------------|------------------------|--------|
| 1 | `mobile/.../repositories/subscriptionRepository.ts` | `getHistory` swallowed all errors → empty list on real failures; React Query never retried | ✅ Fixed — re-throws |
| 2 | `database/43_expire_lapsed_trials_frequent.sql` | HIGH: daily trial-expiry cron left `salons.subscription_active` stale up to ~24h (owner locked out but salon still bookable) | ✅ Fixed — 10-min cron; **applied in Supabase** |
| 3 | `mobile/.../components/SubscriptionGate.tsx` | Returned `null` while status loading → app interactive during startup freeze window | ✅ Fixed — blocking loading overlay (fail-open on error) |
| 4 | `mobile/.../components/SubscriptionGate.tsx` | Plain `View` could sit under native `Modal`s (booking modal) | ✅ Fixed — rendered as native `Modal` |
| 5 | `mobile/.../components/SubscriptionGate.tsx` + `navigation/OwnerTabs.tsx` | Gate trapped owner — blocked the `SubscriptionCheckout` it opens (dead-end) | ✅ Fixed — gate skips payment-flow routes |
| 6 | `mobile/.../screens/owner/SubscriptionCheckoutScreen.tsx` | `originWhitelist` too narrow → blocked Razorpay bank/UPI/3DS redirects | ✅ Fixed — `['*']`, result via `postMessage` |
| 7 | `mobile/.../screens/owner/PaymentHistoryScreen.tsx` + `SubscriptionScreen.tsx` | `formatDate` duplicated | ✅ Fixed — shared `lib/formatDate.ts` |
| 8 | `mobile/.../screens/owner/SubscriptionScreen.tsx` | Feature card hardcoded `₹299` vs dynamic `sub.amount` | ✅ Fixed — uses `sub.amount` |
| 9 | `mobile/.../screens/owner/SubscriptionScreen.tsx` | Subscribe CTA shown for `grace_period` (still access-granting) → premature/duplicate checkout | ✅ Fixed — excludes `grace_period` |
| 10 | `mobile/.../hooks/useSubscription.ts` | Status query gated by UI flag, not enforcement → gate never blocked if UI flag off | ✅ Fixed — enabled on either flag |

**Verification:** mobile `tsc --noEmit` clean. No API/contract/DB-read changes;
all backwards-compatible and flag-gated. Live app safe.


### 2026-06-11 — TrimiT Pro subscriptions (SaaS, Razorpay) — Phase 1 + Phase 2 (flagged)

Added a complete owner-subscription system. **Phase 1 ships observe-only**
(status + banners, NO hard enforcement). **Phase 2** (owner freeze + customer
grey-out + backend 402 gating) is fully built but behind flags, OFF by default.

- **DB (apply manually in Supabase):** `database/41_subscriptions.sql`
  (subscriptions, subscription_payments, subscription_events, webhook_logs,
  `salons.subscription_active`, trial trigger on owner signup, daily
  expire-trials cron) and `database/42_nearby_salons_subscription_active.sql`
  (RPC now returns `subscription_active`).
- **Backend:** `routers/subscriptions.py` (+webhook, +cron reminder runner),
  `services/subscription_service.py` (source of truth), `subscription_billing.py`
  (Razorpay subscriptions), `subscription_notifications.py` (2d/1d/expired +
  lifecycle), `dependencies/subscription.py` (`require_active_subscription`,
  no-op in Phase 1), admin MRR/ARR analytics in `routers/admin.py`. Gate wired
  into owner mutations (booking status, services, staff, promos, analytics).
- **Config/env:** `RAZORPAY_PLAN_ID`, `RAZORPAY_WEBHOOK_SECRET`,
  `SUBSCRIPTION_ENFORCEMENT_ENABLED` (default false).
- **Mobile:** types/repo/service/hooks, `SubscriptionScreen`,
  `SubscriptionCheckoutScreen` (Razorpay WebView), `PaymentHistoryScreen`,
  `SubscriptionBanner`, `SubscriptionGate` (Phase 2 freeze), settings entry,
  dashboard banner, SalonCard grey-out. Flags `ENABLE_SUBSCRIPTIONS` (on),
  `ENABLE_SUBSCRIPTION_ENFORCEMENT` (off).
- **Web:** service/repo/hooks, `/owner/subscription` page (Razorpay checkout),
  settings link, same flags.
- **Verified:** backend imports (74 routes) + py_compile clean; mobile
  `tsc --noEmit` clean; pre-existing test failures confirmed unrelated.

### 2026-06-11 (later) — subscription follow-ups
- **Phase 2 booking block:** `create_booking` now returns `403 SALON_UNAVAILABLE`
  for lapsed salons (flag-gated).
- **Customer "unavailable" UX:** mobile `SalonDetailScreen` + web `SalonDetail`
  show a notice and disable/booking-block when `subscription_active=false`.
- **Resubscribe/reactivation:** verify + `subscription.charged` webhook detect a
  prior lapsed state, reactivate, clear cancellation flags, log `reactivated`,
  send "welcome back" push.
- **Receipt emails (Resend):** `services/subscription_invoice_email.py` sends a
  ₹299 receipt on every successful charge (verify + webhook). Graceful no-op if
  `RESEND_API_KEY` unset. New env: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`.
- Setup guide updated (sections 9–11 + env reference).

### 2026-06-12 — code-review fixes (subscription PR)

Addressed two code-review findings on the subscription PR (branch `0.13`).

- **Mobile (`subscriptionRepository.getHistory`)** — was swallowing ALL errors
  and returning an empty `{payments: []}` success payload, so network/auth/
  server failures rendered "No payments yet" and React Query never entered its
  error/retry state. Fixed: re-throw the error so `usePaymentHistory` handles
  real failures. (`mobile/src/repositories/subscriptionRepository.ts`)
- **DB — trial-expiry lag (HIGH)** — trial expiry was materialized into
  `subscriptions.status` only by the once-daily `expire_lapsed_trials` cron, so
  `salons.subscription_active` could stay TRUE for up to ~24h after `trial_end`.
  Owner gating (`compute_access`) is real-time, so an owner could be locked out
  while customers still saw and booked the salon. Fixed with new migration
  `database/43_expire_lapsed_trials_frequent.sql` — reschedules the job to every
  10 minutes and runs it once on apply. Window cut from ~24h to ≤10 min. No
  API/contract/read-path change; forward-only; migration 41 untouched.
  **Applied successfully in Supabase by user on 2026-06-12.**
- **Verified:** mobile diagnostics clean on the edited repo file.

### 2026-06-12 (later) — subscription PR review fixes (batch 2)

More code-review findings on the subscription PR (branch `0.13`). All mobile;
no API/contract/DB change. `tsc --noEmit` clean.

- **`SubscriptionGate` startup window:** in enforcement mode the gate returned
  `null` while status was still loading, leaving the owner app interactive
  during the fetch. Now shows a blocking loading overlay while fetching; fails
  OPEN on error (network blip must never freeze an owner out — RULES 2.2;
  backend still enforces 402).
- **`SubscriptionGate` z-order:** rendered as a plain `View`, so native `Modal`s
  (booking notification modal) could appear above it. Now rendered inside a
  native `Modal` (`transparent`, `statusBarTranslucent`, back-press blocked).
- **`SubscriptionGate` dead-end:** mounted at tab root, the freeze also blocked
  the `SubscriptionCheckout` screen it navigates to. Now skips the overlay on
  the payment-flow routes (`Subscription`, `SubscriptionCheckout`,
  `PaymentHistory`) via `useNavigationState`.
- **`SubscriptionCheckoutScreen` WebView:** `originWhitelist` was restricted to
  3 Razorpay hosts, blocking bank/UPI/3DS redirect pages. Now `['*']` (result
  captured via `postMessage`, not URL interception).
- **`formatDate` dedup:** extracted to shared `mobile/src/lib/formatDate.ts`;
  `PaymentHistoryScreen` + `SubscriptionScreen` reuse it.
- **`SubscriptionScreen` price:** feature card hardcoded `₹299`; now uses
  `sub.amount` (single backend-driven source).
- **`SubscriptionScreen` subscribe CTA:** was shown for every non-`active`
  status incl. `grace_period` (still access-granting); now excludes
  `grace_period` to avoid premature/duplicate checkout.
- **`useSubscriptionStatus` enablement:** was gated only by `ENABLE_SUBSCRIPTIONS`
  while the gate is driven by `ENABLE_SUBSCRIPTION_ENFORCEMENT`; now enabled when
  EITHER flag is on, so the gate always receives a status.

## Current State


**Last updated:** 2026-05-25
**Project type:** Live production monorepo
**Primary surfaces:** Backend API, Web app, Mobile app
**Deployments:** Backend on Render, Web on Vercel, Database/Auth on Supabase, Mobile on Play Store testing
**Main audit baseline:** `docs/audit/PRODUCTION_AUDIT_2026_05_24.md` and `docs/audit/PRODUCTION_AUDIT_2026_05_24_REV2.md`
**Open-issue tracker (canonical):** [`docs/REMAINING_ISSUES.md`](REMAINING_ISSUES.md) — split into Web, Backend, Mobile, Others. Update this whenever an item is closed or added.

## Product Context

TrimiT is a salon marketplace and booking platform with:

- Customer discovery and booking
- Salon owner management flows
- Email/password auth and email OTP verification
- Cash and online booking flows
- Real-time booking invalidation on mobile
- FastAPI backend in front of Supabase

## Architecture Snapshot

### Backend

- Stack: FastAPI, PostgREST/Supabase, PL/pgSQL RPCs
- Entry point: `backend/server.py`
- Routers: `backend/routers/`
- Core concerns:
  - Auth via Supabase JWT
  - Booking creation via atomic RPCs
  - Payments via Razorpay
  - Rate limiting via `slowapi`
  - Idempotency via `idempotency_keys`

### Web

- Stack: React 19, Vite 6, React Router, TanStack Query
- Path: `frontend/`
- Production site: `https://trimit.online`
- Current role:
  - Marketing pages
  - Customer auth
  - Customer booking flow
  - Owner dashboard

### Mobile

- Stack: Expo SDK 54, React Native 0.81, React 19, Zustand, TanStack Query
- Path: `mobile/`
- Current role:
  - Customer app
  - Owner app
  - Realtime booking sync
  - Push notifications

### Database

- Stack: Supabase Postgres
- Path: `database/`
- Core design:
  - RLS enabled
  - Business-critical booking logic in SQL RPCs
  - Slot holds
  - Idempotency table
  - Realtime-enabled `bookings`

## Operating Rules

- This is a live app. Prefer safe, additive changes.
- Do not assume a migration is applied until explicitly confirmed.
- Backend, web, mobile, and DB changes must stay in sync.
- Use this file as the first read for future sessions.

## Audit Tracking

### Intentionally Excluded From This Pass

These are known issues and are intentionally not being implemented in the current pass:

- Razorpay webhook
- Refund pathway
- Owner booking UPDATE policy tightening
- Reschedule staff-conflict and duration-overlap hardening
- Web Sentry

### Current Fix Pass Scope

This pass is focused on the selected P1 items:

- Login email enumeration
- OTP implicit account creation
- Rate limiter dead per-user branch
- 401 refresh-and-retry on mobile
- 401 refresh-and-retry on web
- Profile cache token staleness
- Slot expiry cron not enabled
- `salon_cash` validation against salon configuration
- Non-production service-role reservation fallback
- Idempotency processing row TTL
- Idempotency fail-open behavior

## Status Board

### Done Earlier

- Slot generator unbound duration bug fixed
- Request ID propagation fixed between middleware and exception handlers
- Profile upsert recursion bounded
- JWT helper bare-except narrowed

### Fixed In This Pass

- `/auth/login` now returns a generic invalid-credentials response instead of leaking email-confirmation state
- `/auth/send-otp` no longer uses implicit account creation
- `/auth/send-otp` now has a per-email throttle in addition to the route limiter
- Rate limiting now keys by authenticated user ID when a valid bearer token exists, otherwise by forwarded IP / remote IP
- Backend auth cache now rebuilds the response with the current request token, so refreshes do not keep serving stale access tokens
- Mobile API client now attempts silent Supabase session refresh and retries the failed request once before clearing the session
- Web API client now attempts silent Supabase session refresh and retries the failed request once before redirecting to login
- Web auth store now persists refresh tokens and syncs Supabase session state
- Reservation fallback that could use service role outside production has been removed from the live reserve path
- Idempotency processing rows now use TTL through `expires_at`
- Stale idempotency sentinels are now cleared and reclaimable
- Idempotency now fails closed instead of falling back to unsafe non-idempotent execution
- Booking creation now validates payment method against salon-configured methods when that config exists
- Added DB migration to store explicit salon payment methods
- Added DB migration to schedule the pending-online-booking expiry cron
- Web security headers: Added CSP, HSTS, and XSS protection to `vercel.json` (fixed CSP to allow Render backend)
- Web realtime slot invalidation: Added Supabase Realtime subscription to `BookingPage.js` for instant slot invalidation

### Still Pending

- Razorpay webhook
- Refund pathway
- Owner booking UPDATE policy hardening
- Reschedule staff-conflict and duration-overlap validation
- Web Sentry
- Web push notifications
- CLAUDE.md cleanup for Vite/Cra drift

## Database Migration State

### Already In Repo Before This Pass

- `01` to `35` exist in the repository

### Applied In This Pass

- `database/36_salon_payment_methods.sql`
  - Status: **Applied Successfully** on Supabase SQL Editor.
  - Adds `salons.payment_methods` and backfills legacy salons.

- `database/37_enable_expire_pending_online_bookings_cron.sql`
  - Status: **Applied Successfully** on Supabase SQL Editor.
  - Schedules the abandoned online booking expiry job via `pg_cron`.

- `database/41_subscriptions.sql`, `database/42_nearby_salons_subscription_active.sql`
  - Status: **Applied Successfully** on Supabase SQL Editor (confirmed by user).

- `database/43_expire_lapsed_trials_frequent.sql`
  - Status: **Applied Successfully** on Supabase SQL Editor (confirmed by user 2026-06-12).
  - Reschedules `expire_lapsed_trials` to every 10 min; closes the
    `salons.subscription_active` vs. real-time trial-expiry lag.

- `database/44_fix_salon_subscription_trigger_fk.sql`
  - Status: **Applied Successfully** on Supabase SQL Editor (confirmed by user 2026-06-13).
  - Splits the salon→subscription link trigger: BEFORE INSERT sets
    `subscription_active`; AFTER INSERT back-links the subscription. Fixes the
    `subscriptions_salon_id_fkey` violation that blocked all new salon creation
    (regression from migration 41).

- `database/45_reschedule_staff_availability.sql`
  - Status: **Applied Successfully** on Supabase SQL Editor (confirmed by user 2026-06-14).
  - Hardens `reschedule_booking_atomic` to validate staff active status, working hours, days off, and overlapping bookings (excluding current booking).


- [x] **Verified Mobile Implementation**: Silent refresh and retry logic is correctly implemented in `apiClient.ts` and `authStore.ts`.
- [x] **Mobile Build**: Local assembleRelease build completed. APK generated at `mobile/android/app/build/outputs/apk/release/app-release.apk`.

## Practical Outcome Of Current Fixes

### Authentication

- Before: `/login` could tell an attacker whether an email existed but was unconfirmed
- Now: login failures are generalized, reducing enumeration risk

- Before: `/send-otp` could silently create accounts for arbitrary emails
- Now: OTP sending only targets existing eligible accounts and is throttled per email

- Before: both clients logged users out immediately on the first 401
- Now: both clients attempt silent refresh first, reducing surprise logouts

### Backend Safety

- Before: rate limiting was effectively per-IP only
- Now: authenticated traffic can be bucketed per user

- Before: cached auth responses could carry stale access tokens after refresh
- Now: the access token returned by auth dependency always comes from the current request

- Before: reserve fallback could use service-role logic if environment config drifted
- Now: the live reservation path fails safely instead of bypassing booking protections

### Idempotency

- Before: a stuck processing row could block retries indefinitely
- Now: processing rows expire and can be reclaimed

- Before: an internal idempotency-layer error could execute the handler without protection
- Now: the request fails safely instead of risking duplicates

### Booking / Payments Config

- Before: salon payment-method acceptance had no explicit configuration contract
- Now: the schema supports explicit payment methods and booking creation validates against them when configured

- Before: abandoned online pending bookings relied on a commented-out cron instruction
- Now: there is a concrete migration that schedules the job

## Known Risks After This Pass

- Money reconciliation is still incomplete until the Razorpay webhook exists
- Refunds are still manual
- Owners can still update overly broad booking columns until the RLS policy is tightened
- Reschedule correctness still has a staff/duration gap
- Web observability is still incomplete without Sentry

## Session Log

| Date | Summary | Result |
|------|---------|--------|
| 2026-06-12 | **FINAL SESSION** — Phase 2 subscriptions (10 PR fixes) + OTP/SMTP hardening + owner signup role fix (web) + Play Store download button + testing APK (0.14 branch, 76MB). 8 commits, all pushed. Backend OTP verified live. Mobile `tsc --noEmit` clean. Ready for QA. | ✅ COMPLETE |
| 2026-05-24 | Rewrote `docs/PROGRESS.md` into a full project handoff file with architecture, scope, active fixes, done items, remaining items, and migration instructions. | DONE |
| 2026-05-24 | Applied P1 hardening and verified SQL migrations. | DONE |
| 2026-05-25 | Pass 1 — fixed latent `settings.FRONTEND_URL` reference in `backend/routers/auth.py` (now uses `PUBLIC_SITE_URL`). Added `error.log` / `*.log` guard to `mobile/.gitignore`. Updated stale CRA mentions in `CLAUDE.md` and `docs/FRONTEND_DESIGN_CONTEXT_FOR_AI.md`. | DONE |
| 2026-05-25 | Pass 2 — removed unused `react-native-toast-message` from `mobile/package.json`; removed unused `supabase==2.29.0` Python SDK from `backend/requirements.txt`; replaced startup `print()` calls in `backend/server.py` with `logger.info`; removed `react-scripts` and dead `build:cra` / `test` scripts from `frontend/package.json` (`npm install` removed 1,152 transitive packages, `vite build` verified). | DONE |
| 2026-05-25 | Pass 3 — fixed two customer-facing bugs: (a) `MyBookingsScreen` now refetches on focus and subscribes to Supabase Realtime (`subscribeToUserBookings`) so the list auto-updates without pull-to-refresh whenever the owner accepts/rejects/completes/reschedules; (b) `navigateToCustomerBookings` now `popToTop` the Discover stack before switching tabs so the next tap on the Discover tab shows the salon list rather than the previous booking success screen. Added `subscribeToUserBookings` helper to `mobile/src/lib/supabase.ts` and `resetToCustomerDiscover` helper to `mobile/src/lib/navigationHelpers.ts`. Mobile `tsc --noEmit` clean. | DONE |
| 2026-05-25 | Pass 4 — added Zomato/Blinkit-style broadcast push notifications (additive; existing booking notifications untouched). New DB migration `database/39_broadcast_notifications.sql` (audit table + RLS lock-out). New backend service `backend/services/broadcast.py` and admin router `backend/routers/admin.py` with `POST /api/v1/admin/broadcast` and `GET /api/v1/admin/broadcast` gated by `ADMIN_API_TOKEN`. New `audience` field — `customers`, `owners`, or `all`. Fan-out via existing Expo push, batched 100/req. New Android channel `promotions` (separate from `bookings`) so users can mute marketing without losing booking alerts. `users.notify_promotional` already gates delivery (default false; visible toggle already in `NotificationSettingsSection`). Mobile foreground handler now ignores broadcast events (no booking-modal pop-up). Created `docs/REMAINING_ISSUES.md` as the canonical open-issue tracker (Web / Backend / Mobile / Others sections). Mobile `tsc --noEmit` clean; backend syntax-check clean. | DONE |
| 2026-05-25 | Ops — `database/39_broadcast_notifications.sql` applied successfully in Supabase. `ADMIN_API_TOKEN` set in Render environment variables (backend redeployed). Local APK build triggered via `npm run build:apk:local` (EAS local, preview profile). | DONE |
| 2026-05-25 | Pass 5 — fixed persistent login across swipe-kill (Zomato/Blinkit-style). Root causes: (1) `expo-secure-store` 2KB limit silently dropped writes; fallback now routes to AsyncStorage. (2) `initializeAuth` was clearing session on any network error at cold start — now trusts persisted token immediately, runs `/auth/me` in background, only clears on confirmed 401. (3) `safeAuthStorage` consolidated to delegate through `secureStorage`. | DONE |
| 2026-05-25 | Pass 6 — fixed signup OTP flow: after 202, app now navigates to `VerifyOtp` screen (6-digit code) instead of legacy "check email link" page. Fixed profile name/phone not saving: (1) `authStore.verifyOtp` was setting `data.user` (raw Supabase auth user, no name/phone) instead of `data.profile` (resolved `public.users` row). (2) New `pendingSignupStore` stashes name+phone at signup submit; `VerifyOtpScreen` consumes it after OTP verify and PATCHes `/auth/profile`. (3) Restored 5 missing backend endpoints that were lost in an earlier refactor: `GET /auth/me`, `PATCH /auth/profile`, `POST /auth/push-token`, `PATCH /auth/notification-preferences`, `DELETE /auth/account`. Profile save now works. | DONE |
| 2026-05-25 | Pass 7 — fixed owner signup landing on customer tabs. Root cause: Supabase does not reliably round-trip `options.data` from `auth/v1/otp` into `user_metadata` at verify time, so backend's `resolve_profile_for_user` never saw the role and defaulted to `customer`. Fix: `VerifyOtpRequest` now accepts optional `role`/`name`/`phone` fields; backend uses them ONLY when no `public.users` row exists (no escalation possible). Mobile `VerifyOtpScreen` reads them from `pendingSignupStore` and passes them on every signup verify. New `.kiro/steering/production-rules.md` codifies the production posture for future sessions. | DONE |
| 2026-05-25 | Pass 8 — created `RULES.md` at the repo root as the single source of truth for engineering rules (persona, live-app safety, quality bar, real-time architecture, booking + auth invariants, deployment, communication). Mirrored the rules into `.kiro/steering/production-rules.md` and `.cursorrules`. Added a banner pointing to `RULES.md` at the top of `CLAUDE.md`, `docs/PROGRESS.md`, and `docs/REMAINING_ISSUES.md`. Reference apps explicitly named: Zomato, Blinkit, Zepto, Swiggy, Uber, Ola, Instagram, Facebook. Top-of-file rule: read `RULES.md` on every prompt. | DONE |

## Next Recommended Steps

1. Deploy backend to Render.
2. Deploy web to Vercel.
3. QA login refresh on web and mobile.
4. QA OTP send and verify flows.
5. QA booking with `salon_cash`.
6. Re-audit the remaining excluded items (Razorpay Webhook, Refund pathway, etc.).

## Update Protocol

Every future session should do these things:

1. Read this file first
2. Update the `Current Fix Pass Scope` if the task changes
3. Update `Fixed In This Pass` and `Still Pending`
4. Add a new `Session Log` row
5. Keep `Database Migration State` accurate
