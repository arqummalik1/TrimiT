# TrimiT Technical Documentation

Welcome to the TrimiT Technical Documentation. This document provides a comprehensive overview of the architecture, stack, and core logic for the TrimiT platform, including the Backend, Mobile App, and Web Frontend.

---

## 🏗 System Architecture

The TrimiT platform follows a modern, decoupled architecture:
- **Backend**: FastAPI (Python) serving as the centralized logic and API layer.
- **Database**: Supabase (PostgreSQL) for data storage, authentication, and real-time events.
- **Mobile App**: React Native (Expo) with a focus on high-performance customer interactions.
- **Web App**: React (Vite) focused on administrative and customer web experiences.

---

## 🔧 Backend (FastAPI)

### Tech Stack
- **Framework**: FastAPI (Asynchronous Python)
- **Authentication**: JWT via Supabase Auth
- **Database Client**: Supabase-py
- **Deployment**: Render

### Core Logic: Booking System
The booking system utilizes a **Timezone-Aware Slot Generator**.
1. **Fetch**: Retrieves existing bookings for a specific date/salon.
2. **Generate**: Creates 30-minute intervals between salon opening and closing times.
3. **Filter**: Marks slots as unavailable if they are fully booked or in the past (using a 5-minute grace period).
4. **Guard**: A "Final Guard" in the `create_booking` endpoint performs a last-second availability check to prevent race conditions.

### API Endpoints
- `GET /api/salons`: Search and list salons (Supports location-based search).
- `GET /api/salons/{id}/slots`: Get real-time available time slots.
- `POST /api/bookings`: Create a new booking (Supports 'salon_cash' and 'online' payments).
- `GET /api/bookings`: List user bookings.

---

## 📱 Mobile App (React Native)

### Tech Stack
- **Framework**: Expo SDK 53
- **Navigation**: Expo Router (Native Stack)
- **Data Fetching**: TanStack Query (v5)
- **State Management**: Zustand
- **Styling**: Vanilla Stylesheet with Centralized Theme

### Key Features
#### 1. Instant Search (Optimized)
The app uses **Local Memoized Filtering** for the salon search. It fetches nearby salons once and filters the list in real-time as the user types, providing sub-millisecond responsiveness.

#### 2. Real-time Bookings
Uses Supabase Realtime subscriptions to update slot availability instantly if another user books the same slot while the screen is open.

#### 3. Premium UI
- **Design System**: Atomic design tokens for colors, spacing, and typography.
- **Micro-interactions**: Success animations, haptic feedback, and smooth transitions.

---

## 🌐 Web App (React)

### Tech Stack
- **Framework**: Vite + React
- **UI**: Vanilla CSS + Component-based architecture
- **State**: React Query

### Core Responsibility
The Web app mirrors the customer booking flow and provides the administrative interface for Salon Owners to manage their schedules and view incoming bookings in real-time.

---

## 🔐 Database & Security

### Schema (Supabase)
- **users**: Profiles and push tokens.
- **salons**: Metadata, location (lat/long), and operating hours.
- **services**: Salon-specific service offerings and prices.
- **bookings**: Core transactional table with unique constraints to prevent double-booking.

### Security (RLS)
Supabase Row Level Security (RLS) is enabled to ensure:
- Customers can only see their own bookings.
- Owners can only see bookings for their specific salon.
- Sensitive profile data is protected.

---

## 🚀 Deployment Guide

### Backend (Render)
- Ensure `PYTHON_VERSION=3.11.9` is set in environment variables.
- The `requirements.txt` is optimized for production deployment.

### Mobile (Expo)
- Use `EXPO_PUBLIC_API_URL` to point to the live Render backend.
- Build for production using `eas build`.

---

## 🛠 Troubleshooting & Diagnostics
The system includes **Senior Detective Logging**:
- **Backend**: Captures detailed failure states and database constraint violations.
- **Mobile**: Emoji-rich console logs for tracking user journey (Date selection 📅 -> Slot selection ⏰ -> API call 🚀 -> Success 🎉).

---

*Last Updated: April 2026*
