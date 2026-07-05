# TrimiT - V2 Progress

## Accomplished (2026-07-05)
- **Service categories (C1–C4):** Migration `57_service_categories.sql`; backend `/owner/categories`; mobile + **web** owner categories, grouped services, customer salon menu sections; delete blocked when services exist. Cursor rules: no implicit merge, TDD for mobile/web/backend.

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
- Apply migration **57** in Supabase SQL Editor (`database/57_service_categories.sql`).
- Verify the newly added `bump_version.js` script with the build pipeline.
- Continue monitoring Play Store crash logs (if any) as version 1.0.2 rolls out.
- Ensure all DEFERRED_FIXES are reviewed and safely addressed in a future branch.
