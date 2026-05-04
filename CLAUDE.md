# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Layout

This is a monorepo for **TrimiT**, a salon marketplace platform. Three deployable apps share one backend and one Postgres (Supabase) database:

- `backend/` — FastAPI (Python 3.10+). Single-file orchestrator at `backend/server.py` (~54k lines of routing + business logic). Sub-services live in `backend/services/` (currently `notifications.py`).
- `mobile/` — Expo SDK 54 / React Native 0.81 / React 19. Customer + owner flows in one app.
- `frontend/` — Create React App (react-scripts 5) + Tailwind. Web dashboard / portal.
- `database/` — Numbered SQL migrations (`01_schema.sql` … `09_production_updates.sql`) applied manually in Supabase SQL editor. Run them in order on a fresh project.
- `shared/legal/` — Shared legal docs (referenced by both web and mobile).

## Common Commands

### Backend
```bash
cd backend
source venv/bin/activate          # venv not committed; create with: python3 -m venv venv && pip install -r requirements.txt
uvicorn server:app --port 8001 --reload
```
Production deploys to Render (gunicorn, `PYTHON_VERSION=3.11.9`).

### Mobile (Expo)
```bash
cd mobile
npm start                         # Expo dev server
npm run android                   # expo run:android
npm run ios                       # expo run:ios
```
Production builds via `eas build` (config in `mobile/eas.json`). `EXPO_PUBLIC_API_URL` overrides backend URL; otherwise `mobile/src/lib/api.ts` auto-detects host IP in dev and falls back to `https://trimit-az5h.onrender.com` in production.

### Web
```bash
cd frontend
npm start                         # CRA dev server (port 3000)
npm run build
npm test                          # react-scripts test (Jest)
```

### Backend tests
A standalone integration script lives at the repo root: `python backend_test.py` (hits running API; no pytest harness configured).

## Architecture Notes That Span Files

### Strict MVVM + Repository + Service layering
This is enforced across both clients. **Do not call `axios` / `fetch` directly from `.tsx` / `.js` view files.** All network calls go through the centralized client (`mobile/src/lib/api.ts`, `frontend/src/lib/api.js`) and are consumed via TanStack Query (`useQuery` / `useMutation`) hooks. Auth/theme state lives in Zustand stores under `*/src/store/`.

### Centralized API client behavior
Both clients share these conventions, and `server.py` assumes them:
- `Authorization: Bearer <Supabase JWT>` is injected by a request interceptor.
- A response interceptor catches `401`, clears local storage, and redirects to login.
- Mobile additionally normalizes errors through `mobile/src/lib/errorHandler.ts` and surfaces network/timeout failures via `toastStore`. When adding new error paths, route them through `handleApiError` rather than throwing raw axios errors.
- Mobile dev URL resolution prefers `EXPO_PUBLIC_API_URL` → Expo `hostUri` IP → production fallback. Android emulator gets `10.0.2.2` mapping automatically — don't hardcode `localhost`.

### Booking engine (server.py)
The slot generator and booking creation are the most subtle code in the repo:
1. `GET /api/salons/{id}/slots` produces 30-minute windows from salon hours, subtracts non-cancelled bookings, and applies a 5-minute past-time grace period (timezone-aware).
2. `POST /api/bookings` re-checks availability inside the handler ("Final Guard") to close the race window between slot fetch and creation. Database also has a unique constraint on `(salon_id, slot_time)` honoring `max_bookings_per_slot` (added in migration `08`).
3. Discovery uses Haversine distance computed server-side (~lines 509–515 of `server.py`). When changing salon search, preserve the lat/lng inputs and the same formula — the mobile UI sorts purely on the returned `distance_km`.
4. Realtime updates: the bookings table has Supabase Realtime enabled (migrations `05` / `06`). Mobile `BookingScreen` subscribes to invalidate slot queries when another user books concurrently.

### Payments
Razorpay only. Signature verification uses `hmac` + `hashlib.sha256` against `RAZORPAY_KEY_SECRET` in `POST /api/payments/verify`. The `salon_cash` payment method bypasses Razorpay but still creates a booking row — keep both branches in mind when touching booking creation.

### Supabase / RLS
- Backend uses `SUPABASE_SERVICE_ROLE_KEY` **only** for admin operations that must bypass RLS (e.g., creating a `users` profile row right after Supabase Auth signup). Everything else uses the user-bound JWT so RLS applies.
- RLS policies are in `database/01_schema.sql` and audited by `07_check_rls_policies.sql`. If you add a table, add policies in the same migration.
- New SQL goes in a new numbered file (`10_*.sql`, etc.). Don't rewrite history of earlier migrations — they may already be applied to prod.

## Architectural Invariants (from CONTEXT.md, enforce when reviewing/writing)
1. No direct API calls in view files — always via React Query hooks.
2. Every network operation handles `loading`, `error`, and `success`.
3. No `any` in TypeScript; mobile API response shapes live in `mobile/src/types/`.
4. `server.py` is orchestration — push reusable logic into `backend/services/`.

## Environment Files
Each app has its own `.env` (not in git). Required keys:
- `backend/.env`: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, optional `ALLOWED_ORIGINS` (comma-separated CORS allowlist).
- `mobile/.env`: `EXPO_PUBLIC_API_URL`, Supabase public keys.
- `frontend/.env`: CRA-style `REACT_APP_*` vars for API + Supabase.

## Where to look first
- Adding a customer or owner screen → mirror an existing one under `mobile/src/screens/{customer,owner}/` and wire it into `mobile/src/navigation/`.
- Changing booking/slot/payment behavior → start in `backend/server.py`, then update the consuming hooks in `mobile/src/hooks/` and `frontend/src/hooks/`.
- Diagnosing user-journey bugs on mobile → emoji-tagged console logs (📅 date, ⏰ slot, 🚀 API, 🎉 success) trace the flow.
