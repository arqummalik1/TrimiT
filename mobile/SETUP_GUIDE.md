# TrimiT Mobile App — Complete Setup Guide

A step-by-step guide to set up, run, and build the TrimiT mobile app.

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 18+ | https://nodejs.org |
| npm | 9+ | Comes with Node.js |
| Expo CLI | Latest | `npm install -g expo-cli` |
| EAS CLI | Latest | `npm install -g eas-cli` (for production builds) |
| Git | Any | https://git-scm.com |
| Xcode | 15+ | Mac App Store (iOS only) |
| Android Studio | Latest | https://developer.android.com/studio (Android only) |

---

## Step 1: Clone & Install

```bash
cd TrimiT/mobile
npm install
```

This installs all dependencies including:
- React Native 0.81 + Expo 54
- React Navigation 7 (bottom tabs + native stack)
- TanStack React Query 5
- Zustand 5 (state management)
- Google Maps (react-native-maps)
- Supabase JS client
- expo-notifications, expo-location, expo-image-picker, expo-font

---

## Step 2: Environment Configuration

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Your backend API URL
EXPO_PUBLIC_API_URL=https://your-backend-url.com

# Supabase credentials (from Supabase Dashboard > Settings > API)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Google Maps API key (optional — needed for map features)
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

> **Note**: The app has fallback values for development, so it will run without a `.env` file using the default backend.

---

## Step 3: Google Maps Setup (Optional)

Maps are used in 3 places: Discover (salon map view), Salon Detail (mini map), and Manage Salon (coordinate picker).

### iOS
1. Get an API key from [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Enable "Maps SDK for iOS"
3. Replace `YOUR_GOOGLE_MAPS_API_KEY` in `app.json` under `expo.ios.config.googleMapsApiKey`

### Android
1. Enable "Maps SDK for Android" in Google Cloud Console
2. Replace `YOUR_GOOGLE_MAPS_API_KEY` in `app.json` under `expo.android.config.googleMaps.apiKey`

> Without a Maps API key, the app still works — map views just won't render.

---

## Step 4: Run the App

### Option A: Expo Go (fastest for development)

```bash
npm start
```

Scan the QR code with:
- **iOS**: Camera app → tap the Expo link
- **Android**: Expo Go app → scan QR code

### Option B: iOS Simulator (Mac only)

```bash
npx expo start --ios
```

Requires Xcode installed with iOS simulator.

### Option C: Android Emulator

```bash
npx expo start --android
```

Requires Android Studio with an AVD (Android Virtual Device) configured.

### Option D: Development Build (for native modules)

Some features (Maps, Notifications) require a development build instead of Expo Go:

```bash
# Install EAS CLI
npm install -g eas-cli

# Log in to Expo
eas login

# Create development build
eas build --profile development --platform ios
# or
eas build --profile development --platform android
```

---

## Step 5: Verify Everything Works

### Test Auth Flow
1. Open the app → Login screen appears
2. Tap "Sign up" → Select role (Customer or Owner)
3. Fill in details → Account created → Redirects to correct dashboard

### Test Customer Flow
1. Sign up as Customer
2. **Discover tab**: See list of salons (toggle to map view with the map icon)
3. Tap a salon → **Salon Detail**: Image carousel, mini-map, services, reviews
4. Tap "Book" on a service → **Booking**: Select date, time slot, confirm
5. **Bookings tab**: View your bookings, cancel if needed
6. **Profile tab**: Edit name/phone, logout

### Test Owner Flow
1. Sign up as Owner
2. **Dashboard tab**: Stats and analytics (empty until you create a salon)
3. Tap "Edit Salon" or go to **Settings** → **Manage Salon**: Create your salon with images and map location
4. **Services tab**: Add/edit/delete services
5. **Bookings tab**: View and manage customer bookings (confirm/reject/complete)
6. **Settings tab**: Toggle multi-booking per slot

---

## Project Structure

```
mobile/
├── App.tsx                    # Entry point — providers, fonts, error boundary
├── app.json                   # Expo configuration
├── .env.example               # Environment variable template
├── assets/                    # App icons, splash screen
└── src/
    ├── theme/
    │   ├── index.ts           # ★ GLOBAL THEME — colors, fonts, spacing
    │   └── ThemeContext.tsx    # Dark/light mode context
    ├── navigation/
    │   ├── types.ts           # Type-safe navigation params
    │   ├── index.tsx          # Root navigator (auth gate)
    │   ├── AuthStack.tsx      # Login → Signup → ForgotPassword
    │   ├── CustomerStack.tsx  # Discover → SalonDetail → Booking
    │   ├── CustomerTabs.tsx   # Customer bottom tabs
    │   ├── OwnerStack.tsx     # Dashboard → ManageSalon
    │   └── OwnerTabs.tsx      # Owner bottom tabs
    ├── screens/
    │   ├── auth/              # Login, Signup, RoleSelect, ForgotPassword
    │   ├── customer/          # Discover, SalonDetail, Booking, MyBookings, Profile, WriteReview
    │   └── owner/             # Dashboard, ManageSalon, ManageServices, ManageBookings, Settings
    ├── components/
    │   ├── Button.tsx         # Primary button component
    │   ├── Input.tsx          # Form input component
    │   ├── SalonCard.tsx      # Salon list card
    │   ├── BookingCard.tsx    # Booking list card
    │   ├── Toast.tsx          # Toast notification banner
    │   ├── ErrorBoundary.tsx  # Crash handler
    │   ├── OfflineBanner.tsx  # Network status banner
    │   ├── ImageCarousel.tsx  # Image slider with dots
    │   └── charts/            # Analytics chart components
    ├── store/
    │   ├── authStore.ts       # Auth state (Zustand + AsyncStorage)
    │   ├── bookingStore.ts    # Booking realtime state
    │   └── toastStore.ts      # Toast notification state
    ├── lib/
    │   ├── api.ts             # Axios instance with interceptors
    │   ├── supabase.ts        # Supabase client + realtime helpers
    │   ├── utils.ts           # Formatters (price, date, time)
    │   └── notifications.ts   # Local notification scheduling
    └── types/
        └── index.ts           # TypeScript interfaces
```

---

## Changing the Theme

All colors, typography, spacing, and styling tokens are in **one file**:

```
src/theme/index.ts
```

### Change brand colors
Edit `lightColors` (and `darkColors` for dark mode):
```typescript
export const lightColors = {
  primary: '#9A3412',     // ← Change this to your brand color
  secondary: '#065F46',   // ← Secondary brand color
  background: '#FAFAF9',  // ← App background
  ...
};
```

### Change fonts
The app uses **Inter** (headings) and **Manrope** (body). To change:
1. Install your Google Font: `npx expo install @expo-google-fonts/your-font`
2. Import in `App.tsx` and add to `CUSTOM_FONTS`
3. Update font family strings in `theme/index.ts` under `fonts`

### Dark mode
Dark mode follows the device system setting automatically. Controlled by `ThemeProvider` in `App.tsx`:
```typescript
<ThemeProvider mode="system">  {/* 'light' | 'dark' | 'system' */}
```

---

## Building for Production

### Prerequisites
```bash
npm install -g eas-cli
eas login
```

### Build Android APK (for testing)
```bash
eas build --platform android --profile preview
```

### Build Android AAB (for Play Store)
```bash
eas build --platform android --profile production
```

### Build iOS (for App Store)
```bash
eas build --platform ios --profile production
```

### Submit to Stores
```bash
eas submit --platform android
eas submit --platform ios
```

---

## Backend Setup

The mobile app connects to the same backend as the web app. The backend must be running for the app to work.

### Backend URL
Set `EXPO_PUBLIC_API_URL` in your `.env` file to point to your FastAPI backend.

### Required Backend Services
- **FastAPI** server running on port 8001
- **Supabase** project with schema applied (see `database/01_schema.sql`)
- **Supabase Storage** bucket named `salon-images` (for image uploads)

### API Endpoints Used by Mobile
| Feature | Endpoints |
|---------|-----------|
| Auth | `POST /api/auth/login`, `/signup`, `/forgot-password`, `GET /me`, `PATCH /profile` |
| Salons | `GET /api/salons`, `GET /api/salons/:id`, `POST /api/salons`, `PATCH /api/salons/:id` |
| Services | `POST /api/salons/:id/services`, `PATCH /api/services/:id`, `DELETE /api/services/:id` |
| Bookings | `GET /api/salons/:id/slots`, `POST /api/bookings`, `GET /api/bookings`, `PATCH /api/bookings/:id/status` |
| Reviews | `POST /api/reviews` |
| Owner | `GET /api/owner/salon`, `GET /api/owner/analytics` |

---

## Troubleshooting

### "Cannot find module @expo/vector-icons"
```bash
npx expo install @expo/vector-icons
```

### Maps not showing
- Ensure Google Maps API key is set in `app.json`
- Maps require a development build (not Expo Go)

### Notifications not working
- Notifications require a development build
- iOS simulator doesn't support push notifications; use a physical device

### "Network Error" on API calls
- Check that the backend URL in `.env` is correct and accessible
- Make sure the backend server is running

### TypeScript errors
```bash
npx tsc --noEmit
```
Should return 0 errors. If not, run `npm install` to ensure all types are installed.

---

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Framework | React Native 0.81 + Expo 54 |
| Language | TypeScript (strict mode) |
| Navigation | React Navigation 7 (native-stack + bottom-tabs) |
| State | Zustand 5 with AsyncStorage persistence |
| Data Fetching | TanStack React Query 5 + Axios |
| Database | Supabase (PostgreSQL + Realtime) |
| Maps | react-native-maps (Google Maps) |
| Notifications | expo-notifications (local scheduling) |
| Fonts | Inter + Manrope (via expo-google-fonts) |
| Theme | Custom system with dark mode support |
