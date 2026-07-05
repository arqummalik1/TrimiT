# TrimiT — App Flow (Current)

Last updated: 2026-07-04. Matches production code on branch `zero-point-ten`.

## Product

TrimiT is a salon marketplace for India (₹, English UI). One mobile app (Expo) and one web app (Vite) share a FastAPI backend and Supabase Postgres.

## Roles

| Role | Who | App experience |
|------|-----|----------------|
| `customer` | End user booking grooming | Discover → salon → book → pay (cash/UPI) → reviews |
| `owner` | Salon owner | Owner dashboard: bookings, services, staff, subscription, UPI |
| `employee` | Staff invited by owner (migration 55) | Same owner tabs for **their salon only** — manage bookings when owner is away |

## Staff: two concepts

1. **Staff profile** (`public.staff`) — bookable stylist shown to customers during booking (name, photo, working hours).
2. **Staff app login** (`staff.user_id` + role `employee`) — employee logs into the app to accept/reject bookings.

These are linked: owner adds staff → invites to app → employee signs up with same phone → gets owner dashboard access.

## Mobile navigation

```
Onboarding → Auth (OTP) → Complete Profile → CustomerTabs | OwnerTabs
```

- `owner` or `employee` → **OwnerTabs** (dashboard, bookings, services, staff, settings)
- `customer` → **CustomerTabs** (discover, bookings, profile)

## Web navigation

Marketing (`/`), explore, customer booking (`/book/:salonId/:serviceId`), owner routes under `/owner/*`.

## Realtime (Supabase)

| Surface | Subscription |
|---------|----------------|
| Customer my bookings | `subscribeToUserBookings(userId, token)` |
| Customer booking slots | Authenticated channel on `bookings` + `slot_holds` for salon |
| Owner dashboard / manage bookings | `subscribeToSalonBookings(salonId, token)` |
| Mobile owner tabs | `useRealtimeBookings` invalidates React Query caches |

All authenticated realtime channels pass the user's JWT via `createAuthenticatedClient(token)` so RLS applies.

## Payment model (customer bookings)

**UPI manual verification** (not Razorpay checkout):

1. Customer selects UPI → backend stores intent on booking
2. Customer pays salon VPA in UPI app
3. Owner/employee verifies or rejects in app
4. Booking completes only after verification

**Razorpay** is used only for **owner TrimiT Pro subscriptions**, not customer booking checkout.

## Serviceability

Users outside Jammu geofence see “not in your city yet” + waitlist (`service_areas`, migration 54).

## Deploy

- Backend: Render (auto from `main`)
- Web: Vercel (`trimit.online`)
- Mobile: Google Play via EAS
