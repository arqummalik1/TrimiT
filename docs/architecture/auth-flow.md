# TrimiT — Auth Flow (Current)

Last updated: 2026-07-04.

## Stack

- **Supabase Auth** — OTP email, JWT access + refresh tokens
- **FastAPI** — `dependencies/auth.py` validates JWT, loads `public.users` profile
- **Clients** — persist token on cold start; only **401** clears session (not network errors)

## Google sign-in (web)

```
Client                         Supabase                    Backend
  | signInWithOAuth(google)  ->  Google consent
  | <- redirect /auth/callback?code=...
  | exchangeCodeForSession
  | GET /auth/me (Bearer JWT)  ->  get_current_user + public.users
  | -> /complete-profile if no profile row, else role-based home
```

- **One email = one account:** enable Supabase Dashboard → Auth → **Link identities**
  (auto-link same verified email across OTP and Google). `public.users` is keyed by
  `auth.users.id`; linked identities share one id and one profile.
- Redirect URLs: `https://trimit.online/auth/callback` (+ localhost for dev). See `frontend/env.example`.

## Sign-up / login (OTP)

```
Client                    Backend                      Supabase
  | POST /auth/send-otp  ->  forward OTP request    ->  auth/v1/otp
  | POST /auth/verify-otp -> verify token           ->  auth/v1/verify
  |                       <- access_token + refresh
  | POST /auth/complete-profile (if no users row)
  |                       -> create public.users row (role enforced server-side)
```

### Complete profile

Mandatory after first OTP when no `public.users` row exists.

| Role | Requirements |
|------|----------------|
| `customer` | name |
| `owner` | name + **UPI ID** (required) |
| `employee` | name + **phone** (must match pending staff invite) |

Role is set **once** at complete-profile. JWT metadata cannot escalate role (P0-2 fix).

## Employee invite flow

1. Owner creates staff with phone in Staff Management
2. Owner: `POST /staff/{id}/invite-app` → `staff.app_access_status = pending`
3. Employee downloads app, OTP login, complete-profile as **Salon Employee** with same phone
4. Backend links `staff.user_id`, sets `app_access_status = active`, creates `users.role = employee`
5. Employee navigates to OwnerTabs for that salon

## Session persistence

### Mobile (`authStore.ts`)

- Token in secure storage; `initializeAuth` trusts persisted token
- Background `GET /auth/me` refresh; 401 → `clearSession({ sessionExpired: true })`
- Supabase Realtime: `syncSupabaseAuthSession` for websocket auth
- **Google sign-in:** native account picker → `signInWithIdToken` → `/auth/me` (same profile gate as OTP)

### Web (`authStore.js`)

- Zustand persist; 401 interceptor clears storage **and** calls `logout()`

## Blocked / deleted users (migration 52)

Admin sets `users.is_blocked` or `users.deleted_at`. `get_current_user` rejects with **403** before any handler runs.

## Token refresh

Both clients retry once on 401 using Supabase `setSession` with refresh token before clearing session.

## Security rules

- Production requires real `JWT_SECRET`
- Non-production JWT decode without signature only when `ENVIRONMENT != production`
- Rate limits on OTP, signup, forgot-password
- Resend-confirmation **never** auto-confirms (P0-1)

## API auth header

```
Authorization: Bearer <supabase_access_jwt>
```

Mutating POSTs also send `Idempotency-Key` (booking create requires it).
