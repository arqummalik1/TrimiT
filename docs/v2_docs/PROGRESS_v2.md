# TrimiT - V2 Progress

## Accomplished (2026-07-18)
- **Mobile review harden:** Splash `preventAutoHideAsync` at module/`index` entry (no blank-frame race). Location wait AbortSignal + 8s max (no 120s primer delay). Notification toasts honour `cancelled`. `logger.error` registration passes real Error. Google nonce copy no longer tells users to skip nonce checks. Reset-password already posts `password`.
- **Password reset web bug:** Recovery email landed on `/#…&type=recovery` (Site URL) and App only forwarded email-confirm hashes → users saw home, not create-password. Fixed: recovery → `/reset-password` (hash preserved). Web forgot-password now sends `redirect_to=…/reset-password`. Mobile ResetPassword posts `password` (backend also accepts legacy `new_password`); uses `theme.typography`.
- **Out-of-area waitlist CTA:** Confirmed leads land in Supabase `waitlist_leads` (+ confirmation email via Resend). Fixed ServiceAreaGate scroll `paddingBottom` with `TAB_BAR_BASE_HEIGHT` + safe-area so “Notify me at launch” clears the tab bar.
- **App Store Review OTP:** Env-gated fixed OTP for allowlisted emails (`APP_REVIEW_OTP_EMAILS` + `APP_REVIEW_OTP_CODE` on Render). Send skips inbox; verify mints Supabase session via admin `generate_link`. Location-denied Discover already lists salons (RPC `p_lat=0,p_lng=0`).

## Accomplished (2026-07-17)
- **iOS Archive Sentry fix:** Xcode Archive failed on `sentry-cli` auth token. Set `SENTRY_DISABLE_AUTO_UPLOAD=true` in `ios/.xcode.env` (+ `.xcode.env.local`); durable plugin `withSentryDisableAutoUpload` so prebuild keeps it. Crash DSN still works; source-map upload skipped without token.
- **iOS guide Part G expanded:** Beginner TestFlight path — Archive → Upload (not manual IPA) → App Store Connect processing → TestFlight app install; G1–G7 step-by-step.

## Accomplished (2026-07-14)
- **Google Sign-In Play Store fail (SHA-1):** Preview APK OK, Play install fails with generic toast — live app uses **Play App Signing cert**, not upload keystore. Fix is ops: add Play Console → App signing → **App signing key** SHA-1 to Google Cloud Android OAuth client (`com.trimit.app`). Code: treat ApiException `10` / `DEVELOPER_ERROR` explicitly + `logger.error` → Sentry (was warn-only breadcrumb).
- **Google Sign-In (Android):** Working on preview APK; package must be `com.trimit.app` (not `com.trimit.online`) + SHA-1 of upload keystore **and** Play App Signing SHA-1. Same-email OTP/Google merge via Supabase auto identity linking — no custom merge code.
- **Notification Option A (event-scoped sound):** Owner urgent only — `new_booking`, `payment_received`, `payment_awaiting_verification` → loud `bookings_v4` + custom `notification.mp3` + critical/ALARM. Soft (reschedule, customer updates, reminders, subs) → `booking_updates` + default OS sound. Defaults on `send_notification` are soft.
- **Notification Option B (actions):** Categories `owner_booking_actions` (Accept/Reject) and `owner_payment_actions` (Verify/Reject); Expo `categoryId` on urgent pushes; `handleOwnerNotificationAction` calls booking/payment repositories then opens Bookings. Works best on iOS; Android remote action buttons are best-effort (tap notification still works). Channel recreate + prefs sound gate unchanged.
- **Review harden:** Action toasts booking vs payment accurate; failed notification actions not deduped (retryable); Google failures keep `authError`; `signOutGoogle` configures then signs out after process restart; Android channels recreate only on prefs change (no double register); urgent event types live in `shared/push-constants.json` for mobile+backend.
- **Android push root cause:** Tray pushes need **FCM** (`google-services.json` + EAS FCM V1). Repo had neither; in-app owner modal is Realtime-only. Added `verify:android-push`, conditional `googleServicesFile`, and fail-loud setup toasts. Ops must add Firebase files then rebuild.
- **Silent/vibrate honesty:** In-app chime uses `playsInSilentMode` (iOS Ring/Silent). Background push uses Android ALARM + bypassDnd; iOS mute-switch bypass for push still needs Apple **Critical Alerts** provisioning live on device — not a 100% OEM guarantee.

## Accomplished (2026-07-07)
- **OTP resend cooldown unified (web + mobile):** `OTP_RESEND_COOLDOWN_SECONDS = 30` in `config/auth` on both platforms; web VerifyOtp, Login, Signup aligned with mobile + backend `OTP_EMAIL_THROTTLE_SECONDS`.

## Accomplished (2026-07-06)
- **Admin dashboard drill-down (web):** All stat cards clickable — owners, customers, salons, bookings, trials, revenue, visitors open detail modals. Owner/salon rows open full detail (contact, UPI, gender serve type). Backend: `GET /admin/dashboard/salons`, `GET /admin/dashboard/bookings`, richer owner payload.
- **Developer guide:** `docs/v2_docs/DEVELOPER_GUIDE.md` — beginner-friendly doc for salon/parlor, Lane A/B promos, admin dashboard, gaps checklist.

## Accomplished (2026-07-05)
- **Salon create fix + TRIMIT50 promo system:** Hardened `POST /salons` (service-role insert, safe PostgREST parsing). Platform welcome campaign TRIMIT50, checkout offers UI, required customer phone, owner promo fixes, admin campaigns tab. Migrations 59–61. Merged with zero-point-twenty-two on main.
- **Security fixes (CodeAnt audit):** P0-1 resend no longer auto-confirms on email rate limit; signup idempotent path skips early profile writes; JWT role test is behavioral; web OTP redirect sanitized; realtime channel cleanup fixed.
- **Migrations 57 + 58 applied in Supabase SQL Editor:** `service_categories`, salon `gender_serve`, customer `gender` / `discovery_audience`, service `audience`, updated `get_nearby_salons_v1` filter.
- **Gender serve G0–G5 (mobile + web parity):** Salon type (Men's salon / Parlor / Unisex); customer gender at signup (`CompleteProfilePage`); Discover chips; Account discovery preference; unisex menu + service audience chips. Themed `FilterChipRow` + tests (mobile + web).
- **Service categories (C1–C4):** Mobile + web owner categories, grouped services, customer menu sections.

## Accomplished (2026-07-04)
- **Google sign-in (web):** Enabled on Login + Signup with branded button (multicolor G, Google identity styling). OAuth callback hydrates session + `/auth/me`; same email de-dup via Supabase Link identities.
- **Google sign-in (mobile):** Enabled on LoginScreen with native picker + multicolor G button; `signInWithIdToken` + `/auth/me` routing.
- **Staff profile photo (Phase A):** `POST /uploads/staff-image` + StaffFormModal `ImageUploadField` (progress %, thumbnail, save to `staff.image_url`). Staff = stylist in product model; manager vs stylist dropdown deferred.
- **Staff app login:** Migration 55 + employee role + invite flow (`POST /staff/{id}/invite-app`)
- **Audit fixes:** Blocked-user enforcement, salon list fallback filters, staff RPC safe failure, web realtime auth, ManageBookings realtime, 401 authStore sync, reschedule RPC hardening (migration 56)
- **Docs:** Rewrote `docs/architecture/*.md` + `docs/v2_docs/MIGRATION_ORDER_v2.md`
- **Migrations 52–54** consolidated into canonical `/database/` folder

## Prior
- **Unit Test Overhaul:** Successfully replaced `respx` with a custom `MockSupabase` client for robust integration testing, resulting in 100% passing tests (138 total).
- **Security Fix (P0-1):** Fixed the `resend-confirmation` flow so it no longer auto-confirms pending accounts, removing a massive bypass vulnerability.
- **Geocoding Tests:** Updated `test_geocode.py` to use `DummyAsyncClient` to mock Google Maps, avoiding `ContextVar` conflicts between `respx` and internal mocking.
- **Validation Fixes:** Fixed `test_salons.py` failures by adhering to strict schemas for `SalonCreate` (providing valid `latitude` and `longitude`).
- **Versioning Automation:** Added `scripts/bump_version.js` to intelligently update `shared/app-version.json`, pushing `androidVersionCode` up by 1 and updating `version`.

## Next Steps
- Verify the newly added `bump_version.js` script with the build pipeline.
- Continue monitoring Play Store crash logs (if any) as version 1.0.2 rolls out.
- Ensure all DEFERRED_FIXES are reviewed and safely addressed in a future branch.
