# Restoring debug logs safely

Release: 1.1.0. Updated: 2026-09-03.

## What changed

The app's ordinary diagnostic console output is commented out, not deleted.
The navigation, authentication, booking, notification, and API diagnostic code
is still in the project for future troubleshooting.

`logger.info()` and `logger.debug()` calls remain in their original locations.
Their two shared `console.log` output lines in `src/lib/logger.ts` are commented
out, so those calls are silent even in Expo Go. Direct `console.log` calls in
the application source are also commented out. The detailed development-only
API request, response, retry, and error trace blocks are commented out too.

Actual warning/error handling and Sentry reporting have not been disabled.
Production builds already remove ordinary console calls through
`babel-plugin-transform-remove-console` in `babel.config.js`, while retaining
warnings and errors. That build-time protection remains unchanged.

This preserves the **logging code**, not a recording of previous console output.
Disabled logs do not collect new history. Expo/Metro and third-party libraries
may still print their own messages; this change does not silence those tools.

## How to debug navigation again

1. Open `mobile/src/lib/logger.ts` from the repository root.
2. Find the commented `console.log` lines inside `debug()` and `info()`.
   Remove only their leading `//`. Keep the surrounding `__DEV__` checks.
   `__DEV__` means this is a development build, not an App Store release.
3. Review the diagnostic fields for the flow you will exercise. Only output
   screen names, intent kinds, booleans, counts, and non-sensitive error codes.
   Do not output route parameters, emails, OTPs, tokens, or customer records.
4. Run `npm start` from the `mobile` folder and reload the app. The retained
   logger call sites can now print to the development console. This enables
   all shared info/debug sites, not only navigation, so use a test account and
   check the fields before exercising other flows.
5. Reproduce the issue. The route tracer in
   `src/navigation/navigationTrace.ts` records screen-name paths, not params.
   The return-flow explanation is in
   [Post-authentication intent restoration](../../docs/architecture/post-auth-intent-restoration.md).
6. Comment those two output lines again before preparing a release. Do not
   delete the logging code or disable error reporting.

## Other preserved diagnostic blocks

Paths below are relative to `mobile/`. Re-enable only the part needed locally.
For a multiline block, every line between the opening call and closing `);`
must be uncommented together. Keep existing `__DEV__` checks; add one when an
older direct call does not have one.

| Area | File / marker |
| --- | --- |
| API request, response, retry, failure trace | `src/services/apiClient.ts`: `[API][REQ]`, `[API][RES]`, `[API][RETRY]`, `[API][ERR]` |
| Realtime session and booking subscriptions | `src/lib/supabase.ts`: `[Supabase]`, `[Supabase Auth]` |
| Owner booking notifications | `src/navigation/OwnerTabs.tsx` and `src/store/notificationStore.ts`: `devLog` |
| Salon creation and image uploads | `src/screens/owner/ManageSalonScreen.tsx` and `src/services/salonService.ts`: `[SalonCreate]` |
| Analytics placeholders | `src/lib/analytics.ts` |
| Staff picker and web map placeholders | `src/components/StaffPicker.tsx` and `src/components/MapView.web.tsx` |

Some historical blocks contain full realtime records, URLs, coordinates, or
identifiers. They are preserved as comments, **not approved for verbatim use
with production data**. Before re-enabling, restrict fields to non-sensitive
metadata and use test data. Never paste sensitive console output into a chat,
ticket, screenshot, or commit. Do not enable verbose diagnostics in a release.

## Welcome promotion is paused separately

`ENABLE_WELCOME_VOUCHER` in `src/lib/featureFlags.ts` is explicitly `false`.
It disables both the Discover welcome-offer lookup and the native welcome
modal. Fresh and returning customers will not see the automatic TRIMIT50 popup.

While hidden, the app does not read or write the
`welcome_voucher_shown_<userId>` marker from that effect. It does not clear
existing markers, redeem/remove grants, change coupon eligibility, or change
checkout discount behavior. No backend or database changes are required.

To restore the popup in a future release, set that flag to `true`, update its
release tests, and test new/returning accounts, already-shown markers, expired
offers, dismissal, and checkout on both platforms. Customers with an existing
shown marker still follow the original once-per-device/account behavior.
The separate Profile Offers entry has its own flag; enabling it does not
enable this popup.

## Before release

From `mobile/`, run:

```sh
npm run typecheck
npm test -- --runInBand --silent
```

`typecheck` checks TypeScript without building the app. `--runInBand` runs test
suites sequentially. `--silent` suppresses test console noise; it does not
change logging in the actual app.

Also verify on a real device that fresh sign-in and returning sign-in do not
show TRIMIT50, and that guest booking still resumes after authentication.
These automated tests do not replace an iPhone/Android release-build smoke test.

Verification on 2026-09-03: TypeScript passed; all 117 mobile test suites passed
(964 tests); the application-source scan found no active `console.log`,
`console.debug`, or `console.info` calls; `git diff --check` passed. Real-device
verification of this logging/popup update is still pending.
