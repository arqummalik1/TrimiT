# CLAUDE Progress — Auth System Test Coverage (NEW SESSION)

**Last updated:** 2026-06-15
**Role:** Senior QA Automation Engineer
**Goal:** Comprehensive Jest + React Native Testing Library coverage for the
**entire TrimiT authentication system**, targeting 95%+ coverage of the auth surface.

---

## HARD CONSTRAINTS (carried from CLAUDE-PROGRESS.md — do not violate)

1. **TESTS ONLY — DO NOT touch app code.** App is LIVE (Play Store + trimit.online + Render).
   If a test surfaces a genuine app bug → REPORT it in the "Bugs found, NOT fixed"
   section below. Never fix app code inline.
2. **No assumptions.** Read the real source of every module before asserting. Loop:
   write → run → fix the **test** (never the app) → green.
3. Mock at the module boundary (`apiClient`, `authService`, `authRepository`, `authStore`,
   `supabase`, native). Reuse the proven patterns already in `__tests__/`.

---

## SCOPE (user-specified — focus ONLY on these)

| Target | Source file | Test file |
|---|---|---|
| LoginScreen | `src/screens/auth/LoginScreen.tsx` | `__tests__/screens/LoginScreen.test.tsx` (+ extended) |
| VerifyOtpScreen | `src/screens/auth/VerifyOtpScreen.tsx` | `__tests__/screens/VerifyOtpScreen.test.tsx` (+ extended) |
| CompleteProfileScreen | `src/screens/auth/CompleteProfileScreen.tsx` | `__tests__/screens/CompleteProfileScreen.test.tsx` (+ extended) |
| authStore | `src/store/authStore.ts` | `__tests__/authStore.test.ts`, `authStoreLifecycle.test.ts` (+ extended) |
| authRepository | `src/repositories/authRepository.ts` | `__tests__/authRepository.test.ts` (NEW) |
| authService | `src/services/authService.ts` | `__tests__/authService.test.ts` (NEW, in repo test) |

### Mandatory coverage checklist (20 items)
1. New customer signup flow · 2. New owner signup flow · 3. Existing customer login ·
4. Existing owner login · 5. OTP send success · 6. OTP send failure · 7. OTP verify success ·
8. OTP verify failure · 9. Invalid OTP · 10. Expired OTP · 11. Resend OTP ·
12. Session restoration · 13. Logout flow · 14. CompleteProfile success ·
15. CompleteProfile failure · 16. Role selection validation · 17. Navigation gating ·
18. ProfileComplete false routing · 19. ProfileComplete true routing ·
20. Store persistence and rehydration

---

## ARCHITECTURE NOTES (verified by reading source — critical context)

- **OTP-first auth.** `SignupScreen.tsx` and `RoleSelectScreen.tsx` were DELETED (see git
  status `D`). There is no password-signup screen anymore. The real flows:
  - **"Signup" (new user)** = enter email on LoginScreen (OTP mode is default) → optimistic
    nav to VerifyOtp → `sendOtp` → enter code → `verifyOtp` returns `profileComplete:false`
    → store gates `profileComplete=false` → RootNavigator renders **CompleteProfileScreen**
    where the user picks **role (customer/owner)** + name + terms → `completeProfile`.
  - **Login (returning user)** = same, but `verifyOtp` returns `profileComplete:true` with a
    `profile` → store sets `user`+`profileComplete=true` → RootNavigator routes to
    `OwnerTabs` (role==='owner') or `CustomerTabs`.
  - Legacy password login still exists behind the LoginScreen "Sign in with Email and
    Password" toggle → `authStore.login()` → `authRepository.login()`.
- **Navigation gating** (`src/navigation/index.tsx`): `!isHydrated`→null;
  `!isOnboardingCompleted`→Onboarding; `!isAuthenticated`→Auth; `!profileComplete`→
  CompleteProfile; `role==='owner'`→OwnerTabs; else CustomerTabs. Gating is driven purely
  by authStore state → tested at the store level (items 17–19).
- **verifyOtp store signature** takes `(email, token, type)`; recovery type returns
  `session.access_token` used as reset token. New user → `session.is_new_user=true`.
- **parseAuthFailure / translateMobileAuthError** (authRepository): branch tables mapping
  raw messages → friendly copy (rate-limit, invalid/expired OTP, bad credentials, network).
  Drives items 9 & 10 (invalid vs expired OTP both map to one friendly string).
- **Persistence**: zustand `persist`, key `trimit-auth-storage`, `partialize` persists only
  {user, token, refreshToken, isAuthenticated, isOnboardingCompleted, profileComplete}.
  `onRehydrateStorage` → setHydrated(true) + initializeAuth() (trust token, bg refresh,
  only confirmed 401 clears). Already partly covered by authStoreLifecycle.test.ts.

---

## TEST COMMAND

```
cd mobile && npx jest <files>
# often auto-backgrounds in this env → redirect & grep:
npx jest <files> > /tmp/jest.log 2>&1; grep -E "Tests:|Test Suites:|FAIL" /tmp/jest.log
```

---

## STATUS LOG (live — what's done / doing / next)

### ✅ DONE
- Read all 6 source files + 5 existing test files + nav gating + jest.setup + helpers.
- **Baseline run GREEN: 27 tests / 5 suites pass** (authStore 2, authStoreLifecycle 14,
  LoginScreen 4, VerifyOtpScreen 4, CompleteProfileScreen 4 — approx). Confirmed starting
  point before adding anything.

- **NEW `__tests__/authService.test.ts` GREEN — 14 tests.** HTTP verb/path/payload contract
  for every authService endpoint (login, signup, forgot, resend, updateProfile, push-token,
  notification-prefs, getMe, deleteAccount, sendOtp, verifyOtp, completeProfile + reject).
- **NEW `__tests__/authRepository.test.ts` GREEN — 37 tests.** parseAuthFailure/translate
  tables (invalid+expired OTP→one copy, credentials, rate-limit, network, nested/axios shapes);
  login customer+owner+/me-fallback+EMAIL_NOT_CONFIRMED+no-token; signup 202/ready/200
  customer+owner+fallback+no-session+rate-limit; verifyOtp returning+new+default+invalid;
  completeProfile ok+unnormalizable+throw; resendConfirmation ready/normal/rate-limit;
  updateProfile; deleteAccount ok/axios/network. (items 1–10,14,15)

- **NEW `__tests__/authStoreAuth.test.ts` GREEN — 22 tests.** signup customer/owner/
  confirmation/fail/loading; sendOtp ok/fail; forgotPassword ok/fail/rate-limit;
  resendConfirmation ok/fail; verifyOtp recovery; clearSession+sessionExpired+dismiss+
  logout-guard; gating state new-user/completeProfile-owner/returning-customer;
  persistence partialize+key+completeOnboarding. (items 1,2,5,6,11,12,13,16-20)

### 🔄 IN PROGRESS
- Screen test expansion (Login / VerifyOtp / CompleteProfile behavior + error/loading paths).

### ⏭️ NEXT (planned, in order)
1. ~~authRepository + authService tests~~ ✅ DONE (51).
2. ~~authStore coverage~~ ✅ DONE (22).
3. Extend screen tests — new file `__tests__/authStoreAuth.test.ts`: signup
   (customer/owner/confirmation/fail), sendOtp ok/fail, forgotPassword, resendConfirmation,
   clearSession/sessionExpired/dismiss, persistence partialize, role-gating state. (items 1–6,11–13,17–20)
3. Extend screen tests (append to existing files OR new `*Extended` files):
   - LoginScreen: loading-disabled, inline authError banner, password-login success/fail,
     resend-confirmation row, OTP send-failure path.
   - VerifyOtpScreen: otpSendResult=success/error params, invalid/expired OTP toast,
     resend OTP, incomplete-code guard, new-vs-returning welcome toast, recovery missing token.
   - CompleteProfileScreen: role default customer, switch to owner, terms required,
     completeProfile failure → localError, name min-length.
4. Run full auth suite → loop to green → record bugs (if any) → final tally here.

---

## BUGS FOUND, NOT FIXED (app bugs surfaced by tests — REPORT ONLY)
- (none yet)

---

## TALLY (running)
- Baseline: 27 passing.
- New this session: authService 14 + authRepository 37 = **51 passing**. (more to come)
