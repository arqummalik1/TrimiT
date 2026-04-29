# TrimiT — Comprehensive Technical Architecture & Context

> [!IMPORTANT]
> This document is the **Ultimate Source of Truth** for the TrimiT ecosystem. It provides deep architectural insights for AI agents (ChatGPT, Claude) to ensure high-fidelity code generation and system understanding.

---

## 1. Backend System (FastAPI + Supabase)

### 1.1 Architecture & Core Logic
The backend is built using **FastAPI**, leveraging asynchronous patterns for high throughput. It acts as a secure proxy and business logic orchestrator between the client applications and **Supabase**.

- **Language**: Python 3.10+
- **Communication**: Uses `httpx.AsyncClient` for non-blocking I/O when communicating with Supabase REST API.
- **Dependency Injection**: Uses FastAPI's `Depends` for authentication guards (`get_current_user`).

### 1.2 Key Modules & Logic
- **Discovery Engine**: Implements the **Haversine Formula** (lines 509-515 in `server.py`) to calculate real-time distances between users and salons.
- **Booking Engine**: A custom slot generator that creates 30-minute availability windows by cross-referencing salon opening hours, service durations, and existing non-cancelled bookings.
- **Payment Verification**: Uses `hmac` with `hashlib.sha256` to verify Razorpay signatures, ensuring payment integrity before updating database records.

### 1.3 Supabase Integration Strategy
- **RLS (Row Level Security)**: Enforced on all tables. The backend uses the `SUPABASE_SERVICE_ROLE_KEY` sparingly for administrative tasks (like profile creation during signup) but primarily respects user-bound tokens.
- **Schema Mapping**:
    - `users`: Managed via Supabase Auth + a custom metadata table for roles.
    - `salons`: Primary entity for business data.
    - `services`: Child entity of salons with price/duration metadata.
    - `bookings`: Central transaction table linking users, salons, and services.

---

## 2. Frontend Web System (React 19 + Tailwind)

### 2.1 Technology Stack
- **Framework**: React 19 (using modern hooks and concurrent features).
- **Styling**: Tailwind CSS for a utility-first, responsive design system.
- **Server State**: **React Query (TanStack Query)** for aggressive caching and optimistic UI updates.
- **Client State**: **Zustand** for lightweight, persistent store management (Auth, Theme).

### 2.2 Application Flow & Rendering
- **Data Fetching**: Orchestrated via a centralized `api.js` client. It includes a **Response Interceptor** that detects `401 Unauthorized` errors, clears local storage, and redirects to `/login`.
- **Pages**:
    - `LandingPage.js`: Server-side optimized marketing view.
    - `LoginPage.js` / `SignupPage.js`: Role-based authentication entry points.
    - `Owner Dashboard`: Heavy use of grid layouts and data visualization for business metrics.
- **Optimization**: Components are designed to be atomic. Heavy lists (like Salon search) use virtualization patterns where applicable.

---

## 3. Mobile System (React Native + Expo)

### 3.1 Framework & Native Features
- **Engine**: React Native with **Expo SDK**.
- **Styling**: Uses a theme-based `theme.ts` with predefined spacing, colors, and typography tokens.
- **Navigation**: Managed via `navigation/` using React Navigation stacks.

### 3.2 Real-time Features
- **Geolocation**: Uses `expo-location` to request foreground permissions and fetch the user's current coordinates.
- **Mapping**: Integrated with `react-native-maps`. The `DiscoverScreen.tsx` (lines 151-176) implements a dual List/Map toggle with custom Markers and Callouts.
- **API Interaction**: 
    - **Android Optimization**: The `api.ts` client (lines 10-13) automatically detects the Android emulator environment and maps `localhost` to `10.0.2.2`.
    - **Global Error Handling**: Integrated with a custom `toastStore` to provide user feedback on network timeouts (`ECONNABORTED`).

### 3.3 Screens & Components
- **Customer Flow**: `Discover` -> `SalonDetail` -> `Booking` (Date/Time Slot Selection) -> `Payment`.
- **Owner Flow**: `Dashboard` (Analytics) -> `ManageServices` -> `ManageBookings`.
- **Booking Logic**: The `BookingScreen.tsx` uses a complex multi-step form to ensure data consistency before calling the `/api/bookings` endpoint.

---

## 4. Global API Blueprint

### 4.1 Request Pattern
All clients follow the same header structure:
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <JWT_TOKEN>"
}
```

### 4.2 Core Endpoints Detail
| Domain | Path | Method | Key Feature |
| :--- | :--- | :--- | :--- |
| **Auth** | `/api/auth/signup` | `POST` | Auto-creates `users` profile entry. |
| **Salons** | `/api/salons` | `GET` | Haversine distance-based filtering. |
| **Slots** | `/api/salons/{id}/slots`| `GET` | Dynamic 30-min window generation. |
| **Bookings**| `/api/bookings` | `POST` | Atomic availability validation. |
| **Payments**| `/api/payments/verify`| `POST` | HMAC-SHA256 signature check. |
| **Analytics**| `/api/owner/analytics`| `GET` | Period-based (`7d`/`30d`) aggregation. |

---

## 5. Architectural Invariants (Must Follow)
1. **MVVM Strictness**: No direct API calls in `.tsx` files. Use `useQuery` or `useMutation` hooks.
2. **Error States**: Every network operation must handle `loading`, `error`, and `success` states.
3. **Typing**: No `any`. All API responses must be typed in `src/types/index.ts`.
4. **Clean Code**: Backend `server.py` is the orchestration layer; keep logic modular.

---
*Created by Antigravity Senior Architect AI*
