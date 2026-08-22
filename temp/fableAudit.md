TrimiT full-project audit
Source: read of backend/, mobile/src/, frontend/src/ plus live Supabase policy and advisor queries against project etpoecagsfhodtfuhblk. Aug 3, 2026, branch 1.7 at 410f2b1d.

4
Critical
20
High
19
Medium
3
Low
16
UI / UX issues
Row-level security is the single biggest problem
The rules call RLS “the last line of defense,” but on three tables it is effectively absent, and anon plus authenticated hold full INSERT/UPDATE/DELETE grants on all of them. Because the Supabase anon key ships inside the APK, every one of these is reachable by any user with a JWT and curl — the FastAPI layer is simply skipped.

I confirmed the read path live (the salons query returned all 6 rows through the app’s own anon key). I did not execute any write against production, so DB-1 and DB-2 are established from policy definitions, table grants, and the absence of guarding triggers rather than by exploiting them.

Suite status: mobile TypeScript clean · mobile Jest 841/842 (1 flaky) · web Vitest 93/93 green · backend pytest 155/163 with 8 stale failures. No secrets are tracked in git and the working tree is clean.

Engineering findings
Severity

Surface

ID	Severity	Surface	Finding	Location & evidence	Why it matters
DB-1

Database

Any logged-in customer can promote themselves to salon owner

pg_policies: users UPDATE — "Users can update own profile"

qual: (auth.uid() = id), with_check: null, no column restriction. anon+authenticated hold full UPDATE grant on public.users. No trigger guards public.users.role.

PATCH /rest/v1/users?id=eq.<self> {"role":"owner"} with the APK's anon key grants owner powers. Same path clears is_blocked, so banned users unban themselves.

DB-2

Database

Customers can mark their own bookings paid and completed

pg_policies: bookings UPDATE — "Users and owners can update bookings"

qual: ((auth.uid() = user_id) OR owner-of-salon), with_check: null. anon+authenticated hold full UPDATE grant on public.bookings.

The backend's UPI gate (bookings.py:131) is bypassable entirely — a customer PATCHes payment_status='paid', status='completed', amount=0 directly against PostgREST. 24 of 31 live bookings are already payment_status='paid'.

DB-3

Database

Salon bank account + IFSC columns are readable by anyone

pg_policies: salons SELECT — "Anyone can view salons", roles {anon,authenticated}, qual: true

Live proof with the app's anon key: GET /rest/v1/salons?select=bank_account_number,bank_ifsc,bank_account_holder_name,upi_id returned all 6 salons. 4 exposed upi_id; bank columns are currently empty.

Latent, not yet realised: no owner has filled bank details, but BankDetailsScreen collects them. The first owner who saves bank details publishes them to the internet.

MB-1

Mobile

Realtime channels die permanently on CHANNEL_ERROR

mobile/src/lib/supabase.ts:165-171 and :206-211

if (status === 'CHANNEL_ERROR') { console.error(...) } — that is the entire handler. No resubscribe, no backoff, no state exposed to the UI.

The 'realtime everywhere, no pull-to-refresh' invariant breaks silently after one network blip. Owners miss incoming bookings until they force-quit the app.

DB-4

Database

Staff phone numbers and emails will be world-readable

pg_policies: staff SELECT — "Anyone can view active staff", roles {public}, qual: (is_active = true)

staff table holds phone, email, user_id, app_access_status. Table is currently empty (0 rows), so the anon read returns nothing today.

Once staff exist, anyone can dump their PII — and can list pending invites, which is the input to the invite-takeover bug (BE-2).

DB-5

Database

Unrestricted INSERT policies on users and promo_usage

pg_policies: users "Allow insert on signup" / promo_usage "System can insert promo usage"

Both have with_check: true. Permissive policies OR together, so the stricter auth.uid() policy on users is neutralised.

Anon can forge profile rows (incl. role) and fabricate promo redemptions.

BE-1

Backend

Employees can read and overwrite the salon's payout bank details

backend/routers/owner.py:227-234, 258-279

_get_owner_salon_id() calls get_managed_salon_ids(user_id, role), which resolves for employees too. GET and PATCH /owner/bank-details have no owner-only guard.

Any linked staff member can redirect the salon's payouts. RLS does block the write (salons UPDATE requires owner_id), so this fails at the DB — but the read succeeds.

BE-2

Backend

Staff invites can be claimed by anyone who knows the phone number

backend/services/salon_access.py:117-138, called from backend/routers/auth.py:611-613

complete-profile takes an unverified data.phone, then scans every pending staff row across all salons with service_role and PATCHes user_id + app_access_status='active' on the first digit match. No invite token, no OTP on that phone, no atomic claim.

Attacker signs up, submits a target's phone, and lands inside that salon as staff with access to bookings and customer PII.

BE-3

Backend

Subscription gate fails open on any error

backend/dependencies/subscription.py:70-72

except Exception as e: logger.error("[Sub] access check failed ... — allowing"); return current_user

A Supabase blip hands every owner and employee full premium access. Deliberate tradeoff, but it means enforcement is only as reliable as the DB.

BE-4

Backend

Booking status has no transition validation

backend/routers/bookings.py:114-147

patch_json = {"status": body.status.value}. The UPI payment gate only fires when body.status == BookingStatus.completed — not for confirmed, and there is no check that the old status can legally reach the new one.

A manager can move cancelled → completed, or confirm an unpaid UPI booking. Corrupts the booking lifecycle and revenue reporting.

BE-5

Backend

Admin PIN exchanges for a static all-powers bearer token

reported from code read, not independently re-run

backend/routers/admin.py:71-76

return {"token": settings.ADMIN_API_TOKEN}

One leaked 6-digit PIN yields a non-rotating token with block, grant, and broadcast rights over every user.

BE-6

Backend

Admin block and delete report success even when the write fails

reported from code read, not independently re-run

backend/routers/admin.py:311-318, 362-367

await supabase.request("PATCH", ...) with no status_code check, then return {"status": "blocked"}

Admin believes an abusive user is blocked while the account stays active.

BE-7

Backend

Nearby-salons fallback selects the entire salons table

reported from code read, not independently re-run

backend/routers/salons.py:95-98, 187-189

await supabase.request("GET", "rest/v1/salons", params={"select": "*"}) when the RPC fails

Unbounded query on the hottest customer endpoint — memory spike and slow responses on Render as salon count grows.

MB-2

Mobile

Owner booking accept/reject failures are completely silent

mobile/src/screens/owner/ManageBookingsScreen.tsx:81-83

onError: (error) => { handleApiError(error); } — handleApiError only returns an AppError, it does not toast. The success path toasts, and the sibling verify/reject handlers in the same file correctly call showToast(handleApiError(error).message, 'error').

Owner taps Confirm, the request fails, nothing happens on screen. Same pattern in OwnerDashboardScreen.tsx:302 and WriteReviewScreen.tsx:50.

MB-3

Mobile

My Bookings subscribes to Realtime without syncing the Supabase JWT

reported from code read, not independently re-run

mobile/src/screens/customer/MyBookingsScreen.tsx:93-104

subscribeToUserBookings(userId, ...) with no preceding syncSupabaseAuthSession — unlike useRealtimeBookings.ts:157-159 which does sync.

RLS rejects the subscription, so customers never see live status changes after an owner acts.

MB-4

Mobile

Slot grid detects changes but refuses to refetch

reported from code read, not independently re-run

mobile/src/store/bookingStore.ts:126-147, mobile/src/screens/customer/BookingScreen.tsx:1380-1388

Realtime sets needsRefresh: true, and the UI renders a banner reading 'Bookings updated. Tap to refresh.'

The user must notice and tap a banner mid-checkout, or pick a slot that was taken seconds ago.

MB-5

Mobile

Reschedule fetches slots statically with no Realtime and no in-flight guard

reported from code read, not independently re-run

mobile/src/screens/customer/RescheduleBookingScreen.tsx:54-86, 165-186

api.get('/bookings/slots') with no subscribeToSlots, and Alert onPress: () => rescheduleMutation.mutate() with no isPending check.

Slot conflicts surface only at PATCH time, and a double-tap can queue two reschedules.

MB-6

Mobile

Salon and owner data logged to production console

reported from code read, not independently re-run

mobile/src/services/salonService.ts:22-32, mobile/src/screens/owner/ManageSalonScreen.tsx:285-286, 379

console.log('🏪 [SalonCreate][service] POST /salons/ →', { name, latitude, firstImage ... }) with no __DEV__ guard

Owner and salon details, plus local file URIs, land in release-build logs.

WB-1

Web

Founder admin dashboard charts render Math.random() as real metrics

reported from code read, not independently re-run

frontend/src/pages/admin/AdminDashboard.js:101-106, 546-548, 853

return { date: ..., revenue: Math.floor(Math.random() * 5000) + 2000 }; rendered under <SectionCard title="Revenue Trend (30 days)">

Business decisions made against fabricated revenue, user-growth, and booking trends.

WB-2

Web

A failed login wipes an existing valid session

reported from code read, not independently re-run

frontend/src/lib/api.js:137-149

if (status === 401) { useAuthStore.getState().logout?.(); clearPersistedAuth(); }

One wrong password or OTP on a logged-in tab logs the user out entirely — the interceptor doesn't distinguish credential failures from protected-route 401s.

WB-3

Web

"View all notifications" links to routes that don't exist

reported from code read, not independently re-run

frontend/src/components/NotificationBell.js:286-288

to={isOwner ? '/owner/notifications' : '/notifications'} — neither path is registered in App.js; OwnerNotifications.js exists but is never wired up.

Dead end for every user who clicks it; they get bounced to the fallback redirect.

WB-4

Web

Password login drops users on the marketing home page

reported from code read, not independently re-run

frontend/src/pages/LoginPage.js:57-60

navigate(redirectAfterLogin || '/'); — the OTP path at VerifyOtpPage.js:155-160 correctly routes by role.

Owners who log in with a password land on the landing page instead of their dashboard.

WB-5

Web

Salon image uploads use the anon Supabase client, not the owner's JWT

reported from code read, not independently re-run

frontend/src/lib/supabase.js:183-194, used by frontend/src/pages/owner/ManageSalon.js:182

supabase.storage.from(bucket).upload(filePath, file) with no bearer from authStore

Either the bucket accepts anonymous writes (abuse) or owner uploads silently fail. Pairs with the salon-images listing warning in DB-7.

TS-1

Tests

8 backend tests are red — all stale, none a product regression

backend/tests

2 assert old forgot-password copy; 3 fail with RESPX 'not mocked' for newly added platform_campaigns and service_categories calls; test_service_categories expects CATEGORY_HAS_SERVICES but the code now returns CONFLICT.

Code shipped without updating tests, so the 'all green before delivery' gate is already broken and can no longer catch a real regression.

DB-6

Database

SECURITY DEFINER view + 23 functions with mutable search_path

Supabase security advisor

ERROR: view public.staff_performance is SECURITY DEFINER. WARN x23: function_search_path_mutable. WARN x38: SECURITY DEFINER functions executable by anon/authenticated.

View runs as its creator, bypassing the caller's RLS; mutable search_path is a known privilege-escalation vector.

DB-7

Database

8 tables have RLS enabled but zero policies; public bucket allows listing

Supabase security advisor

app_settings, campaign_salon_exclusions, notification_events, page_views, payu_webhook_logs, refunds, waitlist_leads, webhook_logs. Bucket salon-images has a broad SELECT policy on storage.objects.

Those tables are reachable only via service role — so every access silently bypasses RLS. The bucket policy lets clients enumerate all uploaded files.

BE-8

Backend

Promo usage stats endpoint skips the ownership assertion

reported from code read, not independently re-run

backend/routers/promotions.py:348-376

Loads promotions and promo_usage by promo_id with the caller's JWT and never calls assert_salon_owner — unlike update_promotion at :284-286.

Cross-salon promo performance and customer user_id lists leak if RLS permits the read.

BE-9

Backend

Idempotency enforced on only 3 of ~50 mutating endpoints

backend/core/idempotency.py consumers

Required on POST /bookings/ and POST /subscriptions/verify; optional on POST /subscriptions/create. Every payment verify/reject, booking reserve, status, reschedule, salon and staff write, review, and upload accepts unlimited retries.

Contradicts the stated invariant. Retries on flaky mobile networks can double-apply payment and booking side effects.

BE-10

Backend

Public, unauthenticated, service-role analytics write

reported from code read, not independently re-run

backend/routers/analytics.py:29-42

POST page_views with service_role=True and no auth dependency

Anyone can inflate the table indefinitely — DB cost and polluted metrics.

BE-11

Backend

Unrated endpoints that cost money or enable guessing

reported from code read, not independently re-run

backend/routers/geocode.py:13-28, uploads.py:124-134, auth.py:722-780

No @limiter on the Google Maps proxy, on 10MB image uploads, or on validate-reset-token / reset-password.

Maps quota burn, storage abuse, and unthrottled reset-token guessing.

BE-12

Backend

Serviceability check fails open

reported from code read, not independently re-run

backend/services/serviceability.py:118-138

Errors return {"serviceable": True}

Out-of-area users pass the geo gate whenever the DB hiccups.

BE-13

Backend

Error bodies are plain strings, not the required {code, message}

backend/routers/bookings.py:52, 80, 96 and most routers

raise HTTPException(status_code=500, detail="Failed to load bookings")

Clients cannot branch on an error code, so mobile and web fall back to generic copy.

BE-14

Backend

Admin overview reads 100k rows per table

reported from code read, not independently re-run

backend/services/admin_dashboard.py:223-225

limit=100000 on users, salons, and bookings

The founder dashboard will time out or OOM as the product grows.

MB-7

Mobile

11 screens call api.* directly, bypassing the repository layer

reported from code read, not independently re-run

DiscoverScreen:203, ManageBookingsScreen:57, RescheduleBookingScreen:48/68/104, SalonDetailScreen:79, ServiceDetailScreen:95, ProfileScreen:67, WriteReviewScreen:39, owner/SettingsScreen:93, ForgotPasswordScreen:50, ResetPasswordScreen:48

const response = await api.get(`/salons/?${params.toString()}`);

Structured errors and idempotency headers can't be enforced in one place; the two core customer flows (Discover, Reschedule) are the worst offenders.

MB-8

Mobile

Pull-to-refresh on all three booking lists contradicts the realtime invariant

MyBookingsScreen.tsx:249, ManageBookingsScreen.tsx:248, OwnerDashboardScreen.tsx:406

<RefreshControl onRefresh={refetch} />

It masks MB-1: users compensate for dead subscriptions by pulling, so the real bug never gets reported. ManageBookingsScreen:86-89 also stops the spinner before the refetch completes.

MB-9

Mobile

Supabase client silently falls back to a placeholder host

mobile/src/lib/supabase.ts:5-6

const SUPABASE_URL = buildConfig.supabaseUrl || 'https://placeholder.supabase.co';

A misconfigured build connects to nothing and every realtime feature fails with no hard error.

MB-10

Mobile

any types in production code despite the no-any rule

reported from code read, not independently re-run

StaffManagementScreen.tsx:35/83/94, store/authStore.ts:57, repositories/staffRepository.ts:25/29, lib/analytics.ts:34

navigation: any; / session?: any / Promise<any>

The staff and auth surfaces lose compile-time safety exactly where the invite bug (BE-2) lives.

WB-6

Web

Production source maps and ungated error logging

reported from code read, not independently re-run

frontend/vite.config.js:49-51, frontend/src/lib/api.js:100-105

sourcemap: true; console.error('❌ [WEB_API][ERR]', { status, url, detail }) not gated on import.meta.env.DEV

Full source recoverable from the deployed bundle, and backend error details printed in users' browsers.

WB-7

Web

Structured errors rendered as [object Object]

reported from code read, not independently re-run

frontend/src/pages/owner/ManageBookings.js:90, MyBookings.js:154, NotificationBell.js:73

error(err.response?.data?.detail || 'Failed to accept booking') — detail is the {code, message} object; getApiErrorMessage exists in lib/utils.js:48-56 but is unused here.

Users see [object Object] in the toast instead of the message.

WB-8

Web

No route-level code splitting

reported from code read, not independently re-run

frontend/src/App.js:17-50

Static imports for every page including AdminDashboard; no React.lazy anywhere under frontend/src.

Recharts, Framer Motion, and the whole admin console ship in the first paint of the marketing site.

WB-9

Web

Booking slot rules and discovery filters are reimplemented per platform

reported from code read, not independently re-run

frontend/src/pages/customer/BookingPage.js:160-175 vs mobile/src/components/booking/SlotGrid.tsx:59-84; frontend/src/lib/genderServe.js:47 vs mobile/src/lib/genderServe.ts:71

Web applies its own 5-minute grace filter; mobile trusts slot.available from the API. Web labels "Men's", mobile labels "Men".

The same salon on the same day can show different slots and different copy on web vs app. Already drifting.

WB-10

Web

Orphaned CustomerHome.js duplicates the discovery screen

reported from code read, not independently re-run

frontend/src/pages/customer/CustomerHome.js:24-28, 56-77

Not imported anywhere in App.js; /explore uses SalonDiscoveryView instead. It holds its own api.get('/salons/?...') and discoverChipToApiFilter.

Dead code that already diverges — wiring it back would resurrect old behavior.

TS-2

Tests

VerifyOtpScreenExtended is flaky under parallel load

mobile/__tests__/screens/VerifyOtpScreenExtended.test.tsx:103

Exceeded timeout of 5000 ms in the full run; all 12 tests pass in 1.4s when the file runs alone.

Intermittent red CI that trains the team to ignore failures.

DB-8

Database

Leaked-password protection disabled in Supabase Auth

Supabase security advisor — auth_leaked_password_protection

HaveIBeenPwned check is off.

Users can register with known-breached passwords.

BE-15

Backend

App-review OTP mints a session via service role

reported from code read, not independently re-run

backend/services/app_review_otp.py:47-72

review_otp_matches → auth/v1/admin/generate_link with service_role=True

If APP_REVIEW_OTP_EMAILS and APP_REVIEW_OTP_CODE are ever set in production, a fixed code bypasses inbox OTP.

MB-11

Mobile

Empty catch blocks hide auth-storage corruption

reported from code read, not independently re-run

mobile/src/lib/safeAuthStorage.ts:118-123, 193-201

} catch {}

Login-persistence failures are undiagnosable in the field.

UI and UX
Measured against the CRED information-architecture benchmark and the ease-of-use product rules. Scope: 36 screens and 60 components under mobile/src, plus the theme tokens.

162
hex literals in 4 staff files
7
screens spinning instead of skeleton
3
different back-button treatments
Severity	Issue	Where	What's wrong
The entire staff UI ignores the theme and uses an off-brand purple

StaffFormModal.tsx (36 hex literals), StaffProfileCard.tsx (38), StaffPicker.tsx (29), WorkingHoursEditor.tsx (24)

backgroundColor: '#8b5cf6' and #1f2937 / #e5e7eb are Tailwind defaults, not TrimiT tokens — dark mode is visibly broken on these screens. Migrate to useTheme().

ErrorState renders dark chrome for light-mode users

mobile/src/components/ErrorState.tsx:130

It imports the deprecated static colors (dark palette) instead of useTheme(). Every error screen looks wrong in light mode.

Owner Settings uses a different information architecture from customer Profile

owner/SettingsScreen.tsx:955-973 vs customer/ProfileScreen.tsx:34

Profile uses the CRED-style createSettingsStyles rows; Settings uses 44x44 colored icon tiles in action cards. Move Settings onto SettingsSection/SettingsRow.

Salon detail has no skeleton and no retry on failure

customer/SalonDetailScreen.tsx:141-155

A full-screen ActivityIndicator, then 'Salon Not Found' with only a Go Back button — a network error is indistinguishable from a deleted salon. Wire ErrorState + refetch.

Promo, staff, and payment-history screens show an empty list when the fetch fails

PromoManagementScreen.tsx, StaffManagementScreen.tsx, PaymentHistoryScreen.tsx — no isError branch

Owners conclude they have no promos or staff. Add ErrorState with retry.

Owner signup demands a UPI ID before the app can be explored

auth/CompleteProfileScreen.tsx:78-86

'UPI ID is required so customers can pay you' blocks the CTA, yet UpiPaymentSettingsScreen:208 already offers a skip. Defer it past quick setup, per the 30-second onboarding rule.

Raw backend values shown to users

PaymentHistoryScreen.tsx:46, StaffManagementScreen.tsx:84

{item.status} prints captured / authorized, and staff errors print error.response.data.detail verbatim. Map to human labels and route through getUserFacingMessage.

Header touch targets below the 44pt minimum

DiscoverScreen.tsx:802 (38x38), ServiceDetailScreen.tsx:345 (38x38), owner/SettingsScreen.tsx:787 (40x40), MyOffersScreen.tsx:38 (icon only)

Three different back-button treatments coexist. Standardize one 44pt HeaderBackButton with an accessibilityLabel.

Rainbow stat tiles and gradient tab pill break CRED minimalism

OwnerDashboardScreen.tsx:360-379, FloatingTabBar.tsx:253-255

Every dashboard stat gets its own success/info/warning color, and the active tab renders a LinearGradient orb. Use neutral icons with one accent, and tint the active tab rather than filling it.

Destructive owner actions have no confirmation

components/BookingCard.tsx:265-267, owner/ManageBookingsScreen.tsx:283

Reject and cancel fire immediately on tap. Add a confirm step for reject/cancel.

Spinners where skeletons already exist elsewhere in the app

ServiceDetail, ManageCategories, MyOffers, PromoManagement, StaffManagement, Reschedule, owner Settings

Discover and ManageServices already use skeletons. Seven screens still full-screen spin.

Success feedback is inconsistent: blocking Alert vs toast

owner/SettingsScreen.tsx:108 vs customer/ProfileScreen.tsx:72

Alert.alert('Success', 'Settings saved successfully') against showToast(...). Pick toast for all non-blocking saves.

Promo creation asks the owner to type a date

owner/PromoManagementScreen.tsx:490-494

label="Expiry Date (YYYY-MM-DD)" in a long form. Use a native date picker with a sensible default.

Duplicate paths and duplicated blocks inside owner Settings

owner/SettingsScreen.tsx:637-641 and :290-332 vs :657-705

'Manage Services' duplicates the Services tab, and the Legal/Payments/Privacy rows are copy-pasted across the no-salon and has-salon branches.

No font-scale guards anywhere in mobile/src

No allowFontScaling or maxFontSizeMultiplier in the codebase; BookingScreen.tsx:1949 uses fontSize: 9-10

The slot grid will break apart at large Dynamic Type. Set multipliers on dense UI or let slot cells wrap.

Empty states that don't teach

MyOffersScreen.tsx:55-57, ManageCategoriesScreen.tsx:203-205

'No offers yet — check back after booking!' has no CTA. Use the shared EmptyState with one line and one action.

Suggested order of work
Before anything else
1. Add WITH CHECK to the users UPDATE policy and revoke column access to role and is_blocked, or move the whole profile write behind the backend.

2. Restrict the bookings UPDATE policy so customers can only set status to cancelled; payment columns should be service-role only.

3. Split the bank and UPI columns out of salons, or replace the qual: true SELECT policy with a view that excludes them.

4. Narrow the staff SELECT policy before the first real staff row is created.

Next
5. Give Realtime a resubscribe-with-backoff path (MB-1) and surface a connection state, then reassess whether pull-to-refresh is still needed.

6. Make every onError toast — handleApiError returning an object that nobody renders is the pattern behind three silent-failure bugs.

7. Replace the admin dashboard’s random data with real queries, or hide those charts until the endpoints exist.

8. Fix the 8 stale backend tests so the suite can catch the next regression, and gate CI on green.

9. Add a booking status transition table server-side (BE-4) and owner-only guards on bank details (BE-1).

Nothing in the repository was modified during this audit, and no write was issued against the production database.