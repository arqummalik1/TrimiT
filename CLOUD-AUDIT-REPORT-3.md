# TrimiT Mobile — Full Codebase Audit (Report 3)

**Date:** 2026-06-16
**Branch:** 0.17 (post `bb65c10b` theme upgrade, `17b6357f` auth fallback fix)
**Scope:** Entire `mobile/` codebase — auth flow, services, repositories, stores,
hooks, components, screens (customer/owner), navigation, lib utilities, native
config (`android/`, `app.config.js`, `eas.json`), and the auth unit-test suite.
**Method:** Direct read of all auth-critical files by the lead, plus 5 parallel
focused sub-audits. **Every Critical/High claim below was re-verified by hand**
against the actual source — several agent claims were downgraded or rejected (see
"Corrections to automated findings" at the end). Line numbers are approximate.

> ⚠️ Constraint honored: **no app code was modified.** This is a report only. The
> app is LIVE in production (Play Store + trimit.online + Render).

---

## 0. Executive summary

- **Auth flow: VERIFIED CORRECT & TESTED.** OTP-email login; new users land on
  CompleteProfile (name + optional phone + role = customer/owner); returning users
  route straight to their role tabs; logout/session-expiry all behave as designed.
  **130/130 auth unit tests pass, stable across repeated runs.** No auth bug found.
- **No committed secrets.** `android/`, `.env`, `*.jks`, `credentials.json` are all
  gitignored and untracked. The Google Maps key in the built manifest is
  **env-injected at build time**, not committed.
- **Top real risks** (ranked): (1) Maps API key shipped inside the APK needs Google
  Cloud key restrictions; (2) `android:allowBackup="true"`; (3) SecureStore→
  AsyncStorage plaintext fallback for the JWT; (4) several owner/customer forms lack
  client-side input validation (money %, coordinates, times); (5) memory/timer leaks
  in a few components and stores.

### Severity tally (verified)
| Severity | Count |
|---|---|
| Critical | 1 |
| High | 8 |
| Medium | 14 |
| Low | 13 |
| Info / positive | 10 |

---

## 1. AUTH FLOW VERIFICATION (the primary ask)

**Confirmed end-to-end against source.** The flow:

1. `LoginScreen` defaults to **OTP mode**. User enters email → optimistic
   navigation to `VerifyOtp` with `isPending:true` → `authStore.sendOtp(email)` runs
   in the background → screen updated via `merge:true` re-navigation with
   `otpSendResult: 'success' | 'error'`. (Legacy password login still available behind
   the "Sign in with Email and Password" toggle.)
2. `VerifyOtpScreen` collects the 6-digit code → `authStore.verifyOtp(email, code, type)`
   → `authRepository.verifyOtp` → `authService` POST `/auth/verify-otp`.
3. Backend returns `profile_complete`:
   - **`false` (new user)** → store sets `isAuthenticated:true, profileComplete:false,
     user:null`. `RootNavigator` (`src/navigation/index.tsx`) renders
     **`CompleteProfileScreen`**. User picks **role (customer/owner)** + name + optional
     phone + must accept terms → `completeProfile` → `profileComplete:true` → routed to
     the correct tabs.
   - **`true` (returning user)** → store sets `user` + `profileComplete:true` →
     `role==='owner' ? OwnerTabs : CustomerTabs`.
4. **Navigation gating** is driven purely by `authStore` state, evaluated in order:
   `!isHydrated`→splash; `!isOnboardingCompleted`→Onboarding; `!isAuthenticated`→Auth;
   `!profileComplete`→CompleteProfile; role→Owner/CustomerTabs.
5. **Logout** (`authStore.logout`): guarded against re-entry, tears down push, clears
   React Query cache, `clearSession()` wipes token/user and detaches the axios header,
   Supabase `signOut`. **Session-expiry** (`apiClient` 401 interceptor): attempts one
   Supabase refresh-token retry; on failure → `clearSession({sessionExpired:true})`.

**Test status:** 11 suites / **130 tests, all green** (re-ran twice, stable):
`authStore`, `authStoreLifecycle`, `authStoreAuth`, `authService`, `authRepository`,
and Login/VerifyOtp/CompleteProfile (base + extended). All 20 mandatory coverage
items (signup customer/owner, login customer/owner, OTP send/verify/invalid/expired/
resend, session restore, logout, completeProfile success/fail, role validation,
nav gating, profileComplete true/false routing, persistence/rehydration) are mapped.

**No app bug found in the auth system.** Minor non-bugs noted: `LoginScreen` has a
dead trailing `if (!result.success){}` block (intentional, commented); `authStore.verifyOtp`
ignores its unused 4th `extras` param (by design — profile creation moved to
`completeProfile`); VerifyOtp resend `useEffect` keys on `'running'|'stopped'` (works).

---

## 2. CRITICAL

### C-1 — Google Maps API key is shipped inside the APK (needs Cloud restrictions)
**File:** `android/app/src/main/AndroidManifest.xml:27` (generated; source is
`app.config.js:57,150,177,193` via `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`).
**Category:** Security.
**Reality check:** This is **NOT a committed-secret leak** — `android/` is gitignored
(0 tracked files) and the key is injected from the build env. But a Maps key in
`com.google.android.geo.API_KEY` is compiled into the release APK in cleartext and is
trivially extractable by decompiling the APK. Without Cloud-side restrictions an
attacker can run up your Maps billing under your key.
**Why Critical:** Direct, unbounded financial exposure on a key that is, by design,
present in every shipped binary.
**Fix:** In Google Cloud Console restrict the key to (a) Android apps with your
package name + release SHA-1 **and** debug SHA-1, and (b) only the Maps SDKs you use.
Rotate the current key after locking it down. Set a billing budget/alert. (Client-side
hiding is impossible for the Android Maps SDK — restriction is the correct control.)

---

## 3. HIGH

### H-1 — `android:allowBackup="true"`
**File:** `android/app/src/main/AndroidManifest.xml:26`.
**Category:** Security / data extraction.
**Detail:** Allows `adb backup` / cloud transfer of the app sandbox. A
`dataExtractionRules`/`fullBackupContent` ruleset is present and excludes SecureStore,
but everything else (AsyncStorage — which may hold the JWT via the H-2 fallback,
plus React Query cache with PII) is still extractable on a debuggable/rooted device.
**Fix:** Set `allowBackup="false"` (configure via `app.config.js` Android block so the
prebuild keeps it), or tighten the extraction rules to also exclude AsyncStorage and
the query cache. Verify the rules actually name the AsyncStorage shared-prefs file.

### H-2 — SecureStore → AsyncStorage plaintext fallback for the JWT
**File:** `src/lib/secureStorage.ts:55-73` (+ `safeAuthStorage.ts`).
**Category:** Vulnerability / sensitive-data-at-rest.
**Detail:** SecureStore is ~2KB/key; the persisted Zustand auth blob (JWT + refresh
token + user) can exceed that, so on overflow the code **falls back to AsyncStorage**
(unencrypted shared-prefs) and the fallback is sticky on reads. The comment frames
this as a deliberate "don't sign users out" trade-off — but it means the access +
refresh tokens can land in cleartext storage, readable via backup (see H-1) or on a
rooted device.
**Fix:** Persist **only the two tokens** (small) in SecureStore and keep the bulky
`user` object in AsyncStorage — tokens then never overflow. Shorten access-token TTL
and rely on refresh rotation to bound the exposure window. At minimum, `logger.warn`
(and ideally signal the backend) when the fallback path is taken.

### H-3 — Owner/customer forms submit unvalidated business data
**Files:** `ManageSalonScreen.tsx` (lat/lng ~79-82, opening/closing times ~144-160),
`ManageServicesScreen.tsx` (discount % ~56-70), `PromoManagementScreen.tsx`
(discount value/type ~58-68), `ProfileScreen.tsx` (name/phone ~45-59),
`WriteReviewScreen.tsx` (missing salon/booking id guard ~54-60).
**Category:** Bug / input validation.
**Detail:** Coordinates aren't range-checked ([-90,90]/[-180,180]); opening/closing
times aren't validated (e.g. close-before-open, `25:00`); discount percent can be
0/`>100`/NaN; promo flat/percent values unbounded; profile name can be empty. These
reach the server and bounce back as generic errors — poor UX and wasted round-trips,
and they rely entirely on the backend as the only validation layer.
**Fix:** Add client-side guards (Zod schemas already used in CompleteProfile — reuse
the pattern) before each mutation; block submit + show a field error on failure.

### H-4 — Realtime booking subscription can leak/duplicate across tab switches
**Files:** `screens/customer/MyBookingsScreen.tsx:~89-106`,
`hooks/useRealtimeBookings.ts:~46,143-165`.
**Category:** Bug / memory + correctness.
**Detail:** The bookings channel is created in a `useEffect` keyed on `[userId,…]`,
not on focus. On tab blur the channel is not torn down; re-entry can stack listeners,
multiplying invalidations per booking event. `useRealtimeBookings` also subscribes
with a closure over the initial callback while refs update separately — risk of stale
callbacks if `enabled` toggles without re-subscribe.
**Fix:** Move the subscription into `useFocusEffect` so it subscribes on focus and
unsubscribes on blur; include the callback ref in deps or wrap in `useCallback`.

### H-5 — PaymentScreen: payment-status re-check on app-resume has no failure path
**File:** `screens/customer/PaymentScreen.tsx:~54-98`.
**Category:** Bug.
**Detail:** When the app foregrounds mid-payment, the status check isn't wrapped so a
thrown status request silently flips `verifying=false` with no user feedback; the
user can't tell if payment succeeded. `createOrderMutation` errors (~118) also have no
in-UI retry.
**Fix:** `try/finally` with a timeout race around the status check; on failure show
"couldn't verify — check your bookings"; add a Retry button for order creation.

### H-6 — Toast & OfflineBanner timers not cleared on rapid state change
**Files:** `components/Toast.tsx:~46-52`, `components/OfflineBanner.tsx:~29-39`.
**Category:** Memory leak / correctness.
**Detail:** Toast sets a 3s auto-dismiss `setTimeout` without clearing a prior pending
timer when `current` changes → overlapping timers double-dismiss. OfflineBanner's
"back online" `setTimeout` has no cleanup → can fire after unmount (setState-after-
unmount warning / stale UI).
**Fix:** Store timer IDs in a ref; clear before re-arming and in the effect cleanup.

### H-7 — Sentry receives user email + may carry tokens in breadcrumbs
**Files:** `lib/logger.ts:90-95` (`setUser({id,email,username})`),
`lib/startupGuards.ts` (Sentry init, no `beforeSend` scrubber).
**Category:** Privacy.
**Detail:** Email PII is attached to every Sentry event; without a `beforeSend`
redactor, request URLs/breadcrumbs could include tokens or query params. Regulatory
exposure (GDPR / India DPDP) and reliance on Sentry retention.
**Fix:** Add `beforeSend` to strip auth headers, token-bearing URLs, and PII; send a
hashed/anonymized user id instead of raw email unless consent is recorded.

### H-8 — Notification deep-link / foreground push handled without validation
**Files:** `lib/notificationNavigation.ts:~27-75`, `lib/notifications.ts:~232,266,292`.
**Category:** Security / robustness.
**Detail:** `bookingId`/`role_hint` from a push payload drive navigation with no
shape validation and no try/catch; a malformed/forged push can crash the foreground
handler or navigate to an arbitrary booking id (server RLS is the real guard, but the
client trusts payload `role_hint` over the authenticated role). `scheduleBookingReminder`
splits date/time without length checks → `NaN` Date.
**Fix:** Validate payload (Zod) before navigating; wrap handlers in try/catch; prefer
the authenticated `user.role` over `role_hint`; bounds-check date/time parsing.

---

## 4. MEDIUM

### M-1 — ~9 screens call `api.*` directly, bypassing the repository layer
**Files (verified, 9):** `customer/WriteReviewScreen`, `customer/ProfileScreen`,
`customer/SalonDetailScreen`, `customer/RescheduleBookingScreen`,
`customer/PaymentScreen`, `customer/DiscoverScreen`, `customer/ServiceDetailScreen`,
`owner/SettingsScreen`, `owner/ManageBookingsScreen`.
**Category:** Code-quality (MVVM violation; already noted in CLAUDE-PROGRESS as "do
not refactor"). Inconsistent error handling/caching; harder to test.
**Fix (later):** Route through `salonRepository`/`bookingRepository`/etc.

### M-2 — `bookingStore` Set/timer handling
**File:** `store/bookingStore.ts:~75,103,8-115`.
**Detail:** `justBookedSlots` Set is rebuilt mid-`set()`; module-level
`justBookedTimers` Map relies on `clearJustBookedTimers()` always running — timers can
linger if unsubscribe is missed. Closure mixes `date` arg with `watchedBookingDate`.
**Fix:** Always `new Set(prev)` inside a functional update; clear an existing timer
before re-arming; standardize on the watched date.

### M-3 — `notificationStore` audio player lifecycle + dedupe race
**File:** `store/notificationStore.ts:~51-52,146`.
**Detail:** `createAudioPlayer` handle stored in zustand, unloaded only via explicit
`cleanupSound()` (leak if never called); dedupe check is not atomic with the `set()`.
**Fix:** Own the player in a hook with effect-cleanup; do the dedupe inside the
`set(state => …)` updater.

### M-4 — `notificationPrefsStore` fires un-awaited async side effects in actions
**File:** `store/notificationPrefsStore.ts:~25,29` (`void ensureAndroidNotificationChannels()`).
**Detail:** State flips before channels exist; failures are swallowed.
**Fix:** Move channel setup to a hook/effect, await before persisting the pref.

### M-5 — Booking price math uses raw float subtraction; promo discount not sent
**File:** `screens/customer/BookingScreen.tsx:~619-632,1591`.
**Detail:** `effectivePrice - promoDiscount` can yield FP noise; only `promo_code`
(not the computed discount) is sent, so server recompute can diverge from the price
shown.
**Fix:** Round to 2 dp for any value sent; send `promo_discount`/`final_amount` or
treat the server's recomputed amount as the single source of truth in the UI.

### M-6 — `useMinLoadingTime` / `useAsyncState` timing & deps fragility
**Files:** `hooks/useMinLoadingTime.ts:~44`, `hooks/useAsyncState.ts:~131` (exhaustive-
deps disabled, requires stable `asyncFn` by contract only).
**Fix:** Guard `startTimeRef` before computing elapsed; document the stable-fn
requirement loudly or memoize internally.

### M-7 — `Button` shake animation not stopped on unmount
**File:** `components/Button.tsx:~46-55`. Hold animation ref; `.stop()` in cleanup.

### M-8 — `SessionExpiredModal` accessibility / dismissal
**File:** `components/SessionExpiredModal.tsx:~28`. Add `onRequestClose` no-op (block
Android back) + `accessibilityHint`.

### M-9 — `Input` / several components recompute styles every render
**Files:** `components/Input.tsx:~47-88`, `components/PermissionPrimer.tsx:~26`.
`useMemo([theme])` is defeated if `theme` isn't a stable reference from
`ThemeContext`. **Fix:** memoize the theme value in `ThemeContext` (one fix covers all).

### M-10 — `OwnerDashboard` recent-bookings list may show stale status
**File:** `screens/owner/OwnerDashboardScreen.tsx:~219-223`. Add the recent-bookings
query key to the post-status-change refetch set.

### M-11 — `uploadService` throws inconsistent error type
**File:** `services/uploadService.ts:~60-65`. Re-throws raw `error` after computing the
normalized `appErr`; callers get mixed shapes. **Fix:** throw the normalized error.

### M-12 — `authRepository.updateProfile` returns submitted data, not server truth
**File:** `repositories/authRepository.ts:~288-291`. Optimistic; can drift from server
if fields are ignored. **Fix:** return normalized profile from the PATCH/`/me`.

### M-13 — Double-fetch after writes (`salonService.updateSalon`, `subscription.verify`)
**Files:** `services/salonService.ts:~21-25` (PATCH then GET),
`services/subscriptionService.ts:~34` (manual idempotency key vs interceptor).
**Fix:** Use the PATCH response if it returns the full object; rely on the interceptor
for idempotency, or document why manual.

### M-14 — `startupGuards` Sentry-init flag not idempotent under concurrency
**File:** `lib/startupGuards.ts:~3` (`let sentryInitialized = false`). Low real risk
(single boot path) but a promise-guard is safer.

---

## 5. LOW

- **L-1 `MainActivity android:exported="true"`** with `trimit://` intent filter
  (`AndroidManifest.xml:36`) — standard for Expo deep links, but validate/HMAC
  `reset-password` tokens server-side before trusting them.
- **L-2 `MODIFY_AUDIO_SETTINGS` / `VIBRATE` permissions** — confirm they're used
  (notification sound/haptics); drop if not (`AndroidManifest.xml:7,17`).
- **L-3 ProGuard `-keep class com.trimit.app.** { *; }`** (`proguard-rules.pro:~52`) —
  broad; fine for RN but reduces obfuscation. Ensure no secrets live in class names.
- **L-4 Razorpay WebView** (`PaymentScreen.tsx:146`, `SubscriptionCheckoutScreen.tsx`)
  — options are injected via `JSON.stringify(opts)` into a `<script>` (JS string
  context), so the agents' "HTML XSS" claim is **overstated**. Residual low risk:
  `JSON.stringify` does not escape `</script>` — a user `name` containing `</script>`
  could break out. **Fix:** also escape `<` as `<` in the serialized blob.
- **L-5 `safeAuthStorage` silently deletes corrupt blobs** without logging
  (`safeAuthStorage.ts:43-50`) — add a `logger.warn` for diagnosability.
- **L-6 `normalizeAuthUser` accepts empty-string id** (`lib/authUser.ts:~28`) — tighten
  to non-empty string.
- **L-7 `errorHandler` `JSON.stringify(error)`** for Sentry (`errorHandler.ts:49`) can
  throw on circular refs — wrap in try/catch.
- **L-8 `ErrorBoundary` storage reset** swallows failures (`ErrorBoundary.tsx:~46-53`)
  — surface an alert if `AsyncStorage.clear()` fails.
- **L-9 `notificationDedupe` Map has no eviction** (`lib/notificationDedupe.ts`) —
  unbounded over very long sessions; cap size / LRU.
- **L-10 Destructive owner actions lack confirm dialogs** (delete service ~210, save
  salon ~144) — add "Are you sure?" for destructive/irreversible mutations.
- **L-11 `Linking.openURL('tel:')` unguarded** (`SalonDetailScreen.tsx:~100`) — add
  `.catch()` with a toast.
- **L-12 Settings toggles not disabled during save** (`owner/SettingsScreen.tsx:~72`)
  — rapid toggles can desync from server; disable while mutation pending.
- **L-13 Hardcoded hex colors vs theme tokens** in a few components (OfflineBanner,
  Toast dark values, Skeleton) — minor theme-consistency debt.

---

## 6. POSITIVE FINDINGS (things done right)

- ✅ **No secrets committed** — `android/`, `.env`, `*.jks`, `credentials.json`,
  `google-services*` are gitignored/untracked (verified via `git ls-files`).
- ✅ Maps key and all config are **env-injected** through `app.config.js`, with a
  startup `getReleaseConfigIssues()` guard that blocks the app if release config is
  missing.
- ✅ Blocked permissions (camera/mic/media) explicitly removed via the Android plugin.
- ✅ Idempotency keys auto-injected for POSTs via the apiClient interceptor
  (`Crypto.randomUUID`).
- ✅ Session bootstrap "trusts persisted token, refreshes in background, clears only on
  confirmed 401" — robust against cold-start network blips (and well unit-tested).
- ✅ Corrupt-persist recovery in `safeAuthStorage` prevents a known APK crash.
- ✅ Offline detection only blocks on `isConnected === false` (avoids false offline on
  Wi-Fi/cellular handoff).
- ✅ Sentry disabled in `__DEV__`; `info`/`debug` logs are dev-only.
- ✅ ProGuard/R8 minification enabled for release.
- ✅ Auth suite: 130 tests, comprehensive, green and stable.

---

## 7. Corrections to the automated sub-audits (don't be misled)

The parallel agents were useful but **over-reported**; these were checked and corrected:
- ❌ "Google Maps key is a committed secret / leaked in git" — **false.** `android/` is
  gitignored; key is build-time env-injected. Re-classified as C-1 (APK-extractable,
  needs Cloud restriction) rather than a repo leak.
- ⤵️ "Razorpay HTML XSS" rated High — **downgraded to L-4.** Options go through
  `JSON.stringify` into a JS context, not raw HTML interpolation. Only residual risk is
  the `</script>` breakout, which is genuinely low.
- ❌ "secureStorage hardcoded placeholder Supabase creds = Critical" — the placeholder
  only applies when env is missing, and `getReleaseConfigIssues()` already blocks
  release builds in that case. Kept as part of H-2 context, not its own Critical.
- ⤵️ Multiple "Critical MVVM violation" ratings — these are **code-quality (M-1)**, not
  Critical, and CLAUDE-PROGRESS explicitly says do not refactor them now.

---

## 8. Recommended remediation order

1. **C-1** Lock down + rotate the Maps API key in Google Cloud (restrictions + billing
   alert). *(Config-only, no app deploy needed.)*
2. **H-1 / H-2** Set `allowBackup=false` and split token vs user persistence so JWTs
   never fall back to plaintext AsyncStorage.
3. **H-7** Add a Sentry `beforeSend` PII/token scrubber; stop sending raw email.
4. **H-3** Add client-side validation to owner/customer forms (reuse Zod pattern).
5. **H-4 / H-6** Fix realtime-subscription focus lifecycle and timer cleanups.
6. **H-5** Harden PaymentScreen resume/verify + add retry.
7. Work the Medium list; Low/Info as cleanup.

*Auth system itself needs no code change — it is correct and fully tested.*
