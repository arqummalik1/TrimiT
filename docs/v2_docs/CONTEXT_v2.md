# TrimiT - V2 App Release Context

This file contains the high-level context of the V2 release of TrimiT.

## Current State
- The app is live on the Google Play Store (Version Code: 38, App Version 1.0.2).
- The backend API is hosted and connected.
- All database migrations have been successfully executed.
- We have established a solid unit test suite for the backend using `pytest`, `pytest-asyncio`, and `httpx`.
- We use a custom Supabase mock (`MockSupabase`) in `conftest.py` to intercept backend requests for tests.

## Key Changes in V2
- **Unified Test Environment:** Converted from using `respx` to a simplified `MockSupabase` for mocking Supabase database, auth, and external API calls.
- **Robust Authentication & OTP:** The backend now safely handles OTP resends without auto-confirming users, thereby closing security loopholes.
- **Location & Geocoding:** Salon models require valid latitude and longitude fields. Geocoding endpoints successfully mock external Google Maps API requests.
- **Strict Validations:** `pydantic` schemas for creations and updates are strictly enforced (e.g., proper coordinates for Salons, accurate times for Staff).

## Critical Guidelines
- **Zero Breakage Policy:** Because the app is live in the Play Store, any changes made to the schema or production backend must be perfectly backward compatible.
- **No Assumptions:** Never assume APIs, libraries, or dependencies. Always read configuration and seek clarification if uncertain.
- **Maintain Test Integrity:** Ensure `pytest` passes with 0 failures before any deployment.

## Automation & Scripts
- Deployment scripts and environment loaders exist in `scripts/`.
- App versioning is centralized in `shared/app-version.json`.
