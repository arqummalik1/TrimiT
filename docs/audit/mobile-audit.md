# Mobile Audit (Expo / React Native)

**Stack:** Expo SDK 54, RN 0.81, React 19, TypeScript strict  
**Package:** `com.trimit.app` (verify vs `com.audentix.trimit` in older audit notes)

---

## Architecture compliance

| Layer | Status | Notes |
|-------|--------|-------|
| `apiClient` | ✅ | Signing, 401, error normalization |
| Services | ⚠️ | 5 services; not used by all screens |
| Repositories | ⚠️ | 5 repos; owner-heavy usage |
| Hooks (data) | ❌ | No `useBookings`, `useSalon` — logic in screens |
| React Query | ✅ | Widespread; queryFns often inline |
| Zustand stores | ✅ | auth, booking, toast, notification |

**MVVM verdict:** **Non-compliant** on customer screens (14 files import `api` directly).

---

## Auth audit

### Strengths
- `expo-secure-store` via `secureStorage.ts`
- Persist: `trimit-auth-storage`
- `initializeAuth()` → `GET /auth/me`
- Role-based `CustomerTabs` / `OwnerTabs`
- `SessionExpiredModal` on 401
- `syncSupabaseAuthSession` for Realtime RLS
- Logout clears Query cache + Supabase session

### Gaps vs web
| Gap | Impact |
|-----|--------|
| No in-app password reset screen | Reset links open browser only |
| No `NavigationContainer` linking config | Deep links incomplete |
| `forgotPassword` swallows errors in store | Poor UX on failure |
| No `hasSalon` owner gate | Owner sees empty dashboard states |
| `ProfileScreen` calls `api.patch` directly | Architecture drift |
| Double `initializeAuth` (App + rehydrate) | Redundant `/auth/me` |

### Dev pitfall
- `apiClient` default port **8000**; docs use **8001** — set `EXPO_PUBLIC_API_URL`.

---

## Booking audit

### Customer flow
`Discover` → `SalonDetail` → `ServiceDetail` → `Booking` → (`Payment`) → `MyBookings`

### Strengths
- Slot holds + timer (`POST /bookings/reserve`)
- Supabase realtime slot invalidation
- Promo validation, staff picker
- Zod param validation
- Payment AppState recovery
- Local confirmation notification

### Risks
- `BookingScreen.tsx` ~1600 lines — regression hotspot
- Duplicated logic in `RescheduleBookingScreen`
- Persisted Query cache `staleTime: 1h` — stale booking lists
- No booking-specific integration tests

---

## Push notifications audit

| Requirement | Status |
|-------------|--------|
| Expo push registration | ✅ Physical device |
| Token → backend | ✅ `POST /auth/push-token` |
| Booking complete → customer | ✅ Via `booking_push` |
| New booking → owner | ✅ |
| Preferences ON/OFF | ✅ UI + `PATCH /auth/notification-preferences` |
| `notify_reminders` respected | ❌ Local schedule ignores pref |
| Tap → booking detail | ❌ Opens Bookings tab only |
| App branding in payload | ⚠️ Default Expo; custom icon/channel partial |
| Receipt cleanup | ❌ Not implemented |

---

## Play Store readiness

| Item | Status |
|------|--------|
| `eas.json` production profile | ✅ app-bundle |
| `autoIncrement` build number | ✅ |
| Upload keystore | ❌ Debug signing |
| R8 / ProGuard | ❌ Disabled |
| Permission strip | ❌ Extra permissions in manifest |
| App icons in git | ❌ Only `sounds/notification.mp3` tracked — **verify assets locally** |
| Privacy URL | ⚠️ `trimi-t.vercel.app` vs `trimit.app` |
| Sentry DSN in EAS prod | ⚠️ Verify set |
| Data Safety form | ❌ Not in repo |
| Account deletion in-app | ✅ Profile + Settings |

---

## TypeScript

- `strict: true` in `tsconfig.json` ✅
- Scattered `any` in services/screens/tests ⚠️
- Zod on signup + booking params ✅

---

## Testing

- Only `__tests__/authStore.test.ts` — minimal
- No Detox / Maestro E2E

---

## Priority fixes

| Priority | Task | Effort |
|----------|------|--------|
| P0 | Confirm assets + production keystore | 2h |
| P0 | Set `EXPO_PUBLIC_API_SIGNING_SECRET` | 15m |
| P1 | Password reset deep link screen | 4h |
| P1 | Respect `notify_reminders` locally | 1h |
| P1 | Push tap → booking detail | 2h |
| P2 | Extract booking hooks from mega-screen | 2d |
| P2 | Remove production console.logs | 1h |
