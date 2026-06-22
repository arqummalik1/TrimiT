# TrimiT Remaining Issues Tracker

This document tracks outstanding bugs, tech debt, and enhancements across the codebase, organized by target version and severity. Issues are populated based on the recent `CLOUD-AUDIT-REPORT-3.md`.

---

## Target Version: v1.1.0

### Critical (P0)
*None currently blocking the app.*
- [ ] **C-1: Google Maps API Key Restrictions** (Google Cloud) - Lock down the Maps API key to the Android package name + release SHA-1 + debug SHA-1, and only enable the required Maps SDKs. Set a billing budget. (Config only, no app code change).

### High (P1)
- [ ] **H-1 / H-2: Secure JWT Storage & Backup Exposure** - Set `allowBackup="false"` in Android manifest to prevent ADB backup extraction. Split SecureStore vs AsyncStorage logic so tokens (small) stay in SecureStore and user profile (bulky) stays in AsyncStorage, preventing token plaintext fallback.
- [ ] **H-3: Missing Client-Side Form Validation** - Add client-side input validation (Zod) to Owner screens (Salon location/times, Services, Promos) and Customer screens (Profile, WriteReview) to prevent submitting unbounded/invalid data to the backend.
- [ ] **H-4: Realtime Booking Subscription Memory Leak** - Move booking subscription logic into `useFocusEffect` to prevent duplicated listeners and stale callbacks on tab blurs.
- [ ] **H-5: PaymentScreen Resume/Verify Resilience** - Wrap payment status checks in `try/catch/finally` with a timeout so a failed network request during app resume doesn't silently trap the user. Add a retry button.
- [ ] **H-6: Timer Leaks in Toast and OfflineBanner** - Store timer IDs in refs and clear them before re-arming or on component unmount to prevent overlapping timeouts and state-after-unmount warnings.
- [ ] **H-7: Sentry PII and Token Scrubbing** - Implement `beforeSend` in Sentry config to strip out auth headers and query params. Anonymize user emails.
- [ ] **H-8: Push Notification Payload Validation** - Validate incoming foreground push payloads (e.g., `bookingId`) with Zod before triggering navigation; catch deep linking crashes.

### Medium (P2)
- [ ] **M-1: MVVM Violations in Screens** - Refactor 9 screens to route their raw `api.get/patch` calls through appropriate repository layers (e.g. `salonRepository`, `bookingRepository`).
- [ ] **M-2: bookingStore Set/timer handling** - Fix mutating Sets mid-state and ensure `justBookedTimers` are safely cleared.
- [ ] **M-3: notificationStore Audio Player Leak** - Manage the Expo Audio player inside a hook with proper cleanup instead of raw zustand state.
- [ ] **M-4: notificationPrefsStore Async Side Effects** - Await Android channel creation properly.
- [ ] **M-5: Booking Price Float Math** - Round booking price subtractions and align the UI computed discount with the server source-of-truth.
- [ ] **M-6: Fragile Timer Hooks** - Add `startTimeRef` guards in `useMinLoadingTime` and `useAsyncState`.
- [ ] **M-7: Button Shake Animation Leak** - Stop the animated shake value on unmount.
- [ ] **M-8: SessionExpiredModal UX** - Add `onRequestClose` no-op to prevent Android hardware back button dismissal.
- [ ] **M-9: Input / Theme Re-renders** - Memoize the global `ThemeContext` value.
- [ ] **M-10: OwnerDashboard Stale Bookings** - Invalidate recent bookings query along with status changes.
- [ ] **M-11: uploadService Inconsistent Error Shape** - Ensure errors are fully mapped through `handleApiError` before throwing.
- [ ] **M-12: authRepository Optimistic Drift** - Update `updateProfile` to return the normalized server response instead of assuming the submitted data was accepted.
- [ ] **M-13: Double-fetch Writes** - Prevent `salonService.updateSalon` and `subscription.verify` from making redundant GET queries.
- [ ] **M-14: startupGuards Sentry Idempotency** - Use a Promise lock to prevent double-initialization.

### Low (P3)
- [ ] **L-1:** Add server-side HMAC validation for deep-linked reset-password intents.
- [ ] **L-2:** Remove unused `MODIFY_AUDIO_SETTINGS` permissions if haptics don't strictly require it.
- [ ] **L-3:** Restrict ProGuard keep rules for `com.trimit.app.**` to only what's necessary.
- [ ] **L-4:** Escape `<` in Razorpay Webview stringified options to close a theoretical XSS escape hatch.
- [ ] **L-5:** Add logging when `safeAuthStorage` silently deletes corrupt blobs.
- [ ] **L-6:** Reject empty-string IDs in `normalizeAuthUser`.
- [ ] **L-7:** Wrap `JSON.stringify` inside Sentry error handlers with `try/catch` for circular refs.
- [ ] **L-8:** Surface an alert if `ErrorBoundary` fails to clear AsyncStorage.
- [ ] **L-9:** Cap the size of the `notificationDedupe` map.
- [ ] **L-10:** Add confirmation dialogs to irreversible owner actions (delete service, etc).
- [ ] **L-11:** Add `.catch()` block to `Linking.openURL('tel:')` on SalonDetailScreen.
- [ ] **L-12:** Disable settings toggles on OwnerSettings while a mutation is inflight.
- [ ] **L-13:** Swap hardcoded colors in OfflineBanner and Toast for theme tokens.

---

## Recently Fixed
- Update `app-version.json`, `package.json`, and `build.gradle` to version `1.1.0`.
- ProfileScreen: Phone number input UX improvements (defaulting to +91).
- Map Marker: Unified red pin layout and disabled header clipping.
- Testing Rules: Added `Rules/03_testing_rules.md` enforcing mandatory unit tests.
