# Application Flow

High-level journeys across TrimiT's three clients sharing one FastAPI backend and Supabase database.

---

## System context

```mermaid
flowchart TB
    subgraph clients [Clients]
        M[Mobile Expo]
        W[Web CRA]
    end
    subgraph backend [Backend Render]
        API[FastAPI /api/v1]
    end
    subgraph data [Supabase]
        Auth[Auth JWT]
        DB[(Postgres + RLS)]
        RT[Realtime]
        ST[Storage]
    end
    M --> API
    W --> API
    M --> RT
    W --> RT
    API --> Auth
    API --> DB
    M --> ST
    W --> ST
    API --> Expo[Expo Push API]
```

---

## User roles

| Role | Primary client | Capabilities |
|------|----------------|--------------|
| Customer | Mobile (primary), Web | Discover, book, pay, review |
| Owner | Mobile + Web | Manage salon, services, bookings, promos, staff |

---

## Customer journey (happy path)

```mermaid
sequenceDiagram
    participant C as Customer App
    participant API as FastAPI
    participant DB as Supabase
    participant E as Expo Push

    C->>API: POST /auth/login
    API->>DB: Validate JWT / profile
    C->>API: GET /salons?lat&lng
    API->>DB: Nearby salons RPC
    C->>API: GET /bookings/slots
    API->>DB: Bookings + holds
    C->>API: POST /bookings/reserve
    API->>DB: reserve_slot_v1
    C->>API: POST /bookings
    API->>DB: create_atomic_booking
    alt Razorpay
        C->>API: POST /payments/create-order
        C->>C: Razorpay WebView
        C->>API: POST /payments/verify
    end
    API->>E: Push to owner
    Note over C,E: Owner accepts → completes
    API->>E: Push to customer
```

---

## Owner journey (happy path)

1. Sign up as **owner** → create salon profile
2. Add services + optional staff
3. Receive push / realtime alert on new booking
4. Accept booking → mark completed
5. Customer receives completion push + can leave review

---

## Cross-client data flow

| Data | Source of truth | Client cache |
|------|-----------------|--------------|
| User profile | `users` table | Zustand persist |
| Salons/services | Postgres | React Query |
| Bookings | Postgres | React Query + Realtime |
| Slots | Computed server-side | React Query (short TTL) |
| Push prefs | `users` columns | Refetch on settings save |

---

## Module map

| Module | Mobile screens | Web pages | API prefix |
|--------|----------------|-----------|------------|
| Auth | `screens/auth/*` | `pages/Login*` | `/auth` |
| Discover | `DiscoverScreen` | `CustomerHome` | `/salons` |
| Booking | `BookingScreen` | `BookingPage` | `/bookings` |
| Payments | `PaymentScreen` | — | `/payments` |
| Owner | `owner/*` | `owner/*` | `/owner`, `/salons` |
| Reviews | `WriteReviewScreen` | — | `/reviews` |
| Promos | `PromoManagementScreen` | — | `/promotions` |

---

## Related docs

- [auth-flow.md](./auth-flow.md)
- [booking-flow.md](./booking-flow.md)
- [backend-flow.md](./backend-flow.md)
