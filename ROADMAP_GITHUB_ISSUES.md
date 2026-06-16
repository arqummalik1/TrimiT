# TrimiT Production Roadmap & GitHub Issues

This document outlines the remaining security, stability, architecture, and deployment issues across the TrimiT codebase (Mobile, Backend, Web, Database). It groups these issues version-wise according to priority, severity, and Play Store pre-submission blockers.

---

## 📅 Version 1.1: Release Blockers & Security Hardening (Immediate)
*Focus: Play Store compliance, critical payment path security, backend crash fixes, and database consistency.*

### 1. Mobile App Blocker Issues (Google Play Store Compliance)
* **[M-B1] debug-keystore-signing**
  * **Severity**: `CRITICAL` (Blocker)
  * **Component**: Mobile Config (`mobile/eas.json`, `mobile/android/app/build.gradle`)
  * **Description**: The app is currently signed with a debug keystore in the production profile. Google Play rejects Android App Bundles (AAB) signed with a debug key.
  * **Remediation**: Run `eas credentials` to set up and securely store a production upload keystore.
* **[M-B2] proguard-minify-disabled**
  * **Severity**: `HIGH` (Blocker)
  * **Component**: Mobile Gradle Config (`mobile/android/gradle.properties`)
  * **Description**: R8/ProGuard minification and resource shrinking are disabled (`enableProguardInReleaseBuilds=false`). This results in a bloated ~80MB AAB with Herms + React Native JavaScript code shipped fully unobfuscated.
  * **Remediation**: Set `enableProguardInReleaseBuilds=true` and `enableShrinkResources=true`. Keep native rules for Razorpay WebView and React Native Reanimated.
* **[M-B3] over-broad-manifest-permissions**
  * **Severity**: `HIGH` (Blocker)
  * **Component**: Mobile Android Manifest (`mobile/android/app/src/main/AndroidManifest.xml`)
  * **Description**: The merged manifest requests over-broad, unused permissions: `SYSTEM_ALERT_WINDOW`, `RECORD_AUDIO`, `USE_FINGERPRINT`, `USE_BIOMETRIC`, and `READ_EXTERNAL_STORAGE`. These trigger mandatory policy reviews and complex data safety declarations in the Play Console.
  * **Remediation**: Configure `expo-build-properties` in `app.config.js` to strip these permissions, restricting requests strictly to `INTERNET`, `ACCESS_FINE_LOCATION`, `CAMERA`, and `POST_NOTIFICATIONS`.
* **[M-B4] invalid-android-permission-string**
  * **Severity**: `MEDIUM` (Blocker)
  * **Component**: Mobile Android Manifest
  * **Description**: Manifest includes an invalid permission string: `<uses-permission android:name="NOTIFICATIONS"/>`. This constant does not exist and will trigger Play Store linter warnings.
  * **Remediation**: Remove the invalid string and rely solely on `android.permission.POST_NOTIFICATIONS`.

### 2. Backend API Crashing & Integrity Issues
* **[B-C1] inert-rate-limiter**
  * **Severity**: `CRITICAL`
  * **Component**: Backend core (`backend/server.py`, `backend/core/limiter.py`)
  * **Description**: Endpoints (including signup and login) carry the `@limiter.limit` decorator, but the rate-limiter middleware is never registered with the FastAPI app instance. The app is completely open to credential stuffing and brute-force attacks.
  * **Remediation**: Register `SlowAPIMiddleware` and the `RateLimitExceeded` exception handler in `server.py`.
* **[B-C2] staff-router-runtime-crash**
  * **Severity**: `CRITICAL`
  * **Component**: Backend Staff router (`backend/routers/staff.py`)
  * **Description**: The staff router imports `supabase` as an `httpx` request wrapper, but attempts to call `.table(...).select(...).execute()`, which belongs to the Python Supabase SDK client. Calling any staff endpoint throws an `AttributeError` at runtime.
  * **Remediation**: Rewrite queries using `supabase.request("GET", ...)` or instantiate the official `supabase.Client` SDK.
* **[B-C3] mocked-razorpay-order-creation**
  * **Severity**: `CRITICAL`
  * **Component**: Backend Payment router (`backend/routers/payments.py`)
  * **Description**: The order creation endpoint mocks Razorpay IDs locally (`order_id = f"order_{uuid4().hex[:16]}"`) instead of calling `razorpay.Client().order.create(...)`. This will fail real payment verification and allows clients to forge valid signature confirmation keys.
  * **Remediation**: Integrate the real `razorpay` library and create orders on the Razorpay server using the exact booking amount.
* **[B-C4] booking-race-condition-double-booking**
  * **Severity**: `CRITICAL`
  * **Component**: Database RPC / Core (`backend/database/booking_rpc.sql`)
  * **Description**: The atomic booking RPC capacity check utilizes `FOR SHARE` instead of `FOR UPDATE`. Parallel concurrent calls can bypass capacity constraints simultaneously, leading to double bookings. Furthermore, there is no active unique index on active slots.
  * **Remediation**: Change `FOR SHARE` lock to `FOR UPDATE` inside `booking_rpc.sql`.

### 3. Database Migration & Integrity Blockers
* **[D-C1] unique-index-missing-on-slots**
  * **Severity**: `CRITICAL`
  * **Component**: Database Schema
  * **Description**: The database lacks a unique index to enforce that the same slot cannot be booked multiple times at the database level.
  * **Remediation**: Run a migration adding:
    `CREATE UNIQUE INDEX CONCURRENTLY uq_bookings_slot ON public.bookings (salon_id, booking_date, time_slot) WHERE status <> 'cancelled';`
* **[D-C2] database-migration-collision**
  * **Severity**: `HIGH`
  * **Component**: Database Migrations (`database/` and `backend/database/`)
  * **Description**: Duplicate numbering exists in migration files (e.g. two `03_`, two `15_`, two `16_`). This creates an ambiguous application order and can result in out-of-sync local/staging/prod database states.
  * **Remediation**: Consolidate migrations into a single folder and rename them using a strict chronological schema (e.g., `YYYYMMDD_HHMM_*.sql`).

---

## 📅 Version 1.2: Code Quality, Performance, & Compliance (Post-Launch)
*Focus: Clean code practices, MVVM compliance, memory footprint reduction, web framework migration, and analytics integration.*

### 1. Mobile Quality & Bundle Optimizations
* **[M-Q1] client-side-secrets-exposure**
  * **Severity**: `HIGH`
  * **Component**: Mobile Security (`mobile/src/services/apiClient.ts`)
  * **Description**: The app client bundles an HMAC signature secret (`X-Trimit-Signature`) for request signing. Bundled strings can be easily dumped from compiled binaries.
  * **Remediation**: Deprecate the HMAC client-signature check entirely, relying on TLS + Supabase JWT authorization.
* **[M-Q2] static-build-versions**
  * **Severity**: `HIGH`
  * **Component**: Mobile Config (`mobile/app.config.js`)
  * **Description**: `versionCode` is hand-edited and static. Play Console rejects subsequent build uploads sharing the same versionCode.
  * **Remediation**: Configure `autoIncrement: true` in `eas.json` or dynamically set `versionCode: parseInt(process.env.BUILD_NUMBER || "1")`.
* **[M-Q3] console-logs-in-production**
  * **Severity**: `MEDIUM`
  * **Component**: Mobile Build
  * **Description**: Over 70 `console.log` calls exist across production modules. These leak diagnostics and degrade UI performance.
  * **Remediation**: Configure Babel plugin `transform-remove-console` to strip console statements from the production build bundle.
* **[M-Q4] mobile-analytics-stub**
  * **Severity**: `MEDIUM`
  * **Component**: Mobile Analytics (`mobile/src/lib/analytics.ts`)
  * **Description**: The analytics dispatcher is a stub. Declaring analytics data collections on the Play Store Data Safety form while shipping a stub can lead to compliance flags.
  * **Remediation**: Wire the telemetry stubs to an active provider (e.g., PostHog or Amplitude) or update the Data Safety declaration.
* **[M-Q5] mvvm-architectural-leak**
  * **Severity**: `MEDIUM`
  * **Component**: Mobile Screens
  * **Description**: Nine screens (including `SalonDetailScreen` and `ProfileScreen`) make direct HTTP requests using `api.*` instead of routing through repository classes, violating strict MVVM separation.
  * **Remediation**: Refactor screens to consume repositories (e.g. `salonRepository`, `bookingRepository`).

### 2. Backend Performance & Resiliency
* **[B-R1] memory-limit-worker-mismatch**
  * **Severity**: `HIGH`
  * **Component**: Backend Deployment (`render.yaml`)
  * **Description**: The server boot command runs `gunicorn -w 4`. Render's free tier (512MB RAM) cannot handle 4 concurrent Python workers, especially with heavy dependencies. This triggers Out-Of-Memory (OOM) worker restarts under load.
  * **Remediation**: Drop worker count to `-w 2` and transition log level to `info`.
* **[B-R2] localhost-cors-in-production**
  * **Severity**: `HIGH`
  * **Component**: Backend Server (`backend/server.py`)
  * **Description**: CORS configuration allows origins from `http://localhost:*` combined with `allow_credentials=True` globally, even in production environments.
  * **Remediation**: Restrict `localhost` CORS patterns strictly to `ENVIRONMENT != "production"`.
* **[B-R3] public-upload-unbounded**
  * **Severity**: `MEDIUM`
  * **Component**: Backend Uploads (`backend/routers/uploads.py`)
  * **Description**: File uploads read the entire payload into RAM without size enforcement or validation.
  * **Remediation**: Enforce a 5MB size limit and validate image integrity using Pillow.

### 3. Web Frontend (Vercel) Refactoring
* **[W-R1] create-react-app-deprecation**
  * **Severity**: `HIGH`
  * **Component**: Web Frontend (`frontend/package.json`)
  * **Description**: Web app is built on Create React App (`react-scripts 5.0.1`), which is end-of-life and lacks modern security/compilation improvements.
  * **Remediation**: Migrate the web app layout to Vite.
* **[W-R2] vercel-wildcard-routing**
  * **Severity**: `MEDIUM`
  * **Component**: Web Config (`frontend/vercel.json`)
  * **Description**: Wildcard routing rewrites all requests to `/index.html`. Legal and compliance pages may return 200 statuses but lack search-engine indexable metadata, which is critical for Play Console verification.
  * **Remediation**: Configure explicit routes and add static sitemaps for legal pages.
