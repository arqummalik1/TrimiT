# TrimiT Mobile App - Complete Setup Guide

## Overview
TrimiT is a salon booking mobile application built with React Native (Expo) + TypeScript, connected to a FastAPI backend with Supabase PostgreSQL database.

---

## Prerequisites

### Required Software
- Node.js 18+ (https://nodejs.org/)
- npm or yarn
- Expo CLI: `npm install -g expo-cli`
- Expo Go app on your mobile device (iOS/Android)
- Git

### Required Accounts
- Supabase account (https://supabase.com)
- Razorpay account for payments (https://razorpay.com) - Optional for testing
- Google Cloud account for Maps API (https://console.cloud.google.com) - Optional for testing

---

## Step 1: Database Setup (CRITICAL - Do This First!)

### 1.1 Create Supabase Tables
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project or create a new one
3. Navigate to **SQL Editor** (left sidebar)
4. Copy the contents of `/app/database/schema.sql`
5. Paste and click **Run**

This creates:
- `users` - User profiles
- `salons` - Salon information  
- `services` - Services offered
- `bookings` - Customer bookings
- `reviews` - Customer reviews

### 1.2 Get Supabase Credentials
1. Go to **Project Settings** → **API**
2. Copy:
   - Project URL: `https://xxxxx.supabase.co`
   - Anon/Public Key: `eyJhbGci...`

---

## Step 2: Backend Setup

### 2.1 Configure Environment Variables
Edit `/app/backend/.env`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=your_secret
GOOGLE_MAPS_API_KEY=your_key
JWT_SECRET=your_secret_key
```

### 2.2 Install Dependencies & Run
```bash
cd /app/backend
pip install -r requirements.txt
```

### 2.3 Start Backend Server
```bash
# On Emergent platform
sudo supervisorctl restart backend

# Locally
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### 2.4 Verify Backend
```bash
curl http://localhost:8001/api/health
# Should return: {"status":"healthy","service":"TrimiT API"}
```

---

## Step 3: Mobile App Setup

### 3.1 Navigate to Mobile Directory
```bash
cd /app/mobile
```

### 3.2 Install Dependencies
```bash
npm install
```

### 3.3 Configure API URL
Edit `/app/mobile/src/lib/api.ts`:
```typescript
const API_BASE_URL = 'https://your-backend-url.com';
// For local testing: 'http://YOUR_COMPUTER_IP:8001'
```

**Important:** Don't use `localhost` for mobile - use your computer's IP address (e.g., `192.168.1.100`)

### 3.4 Configure Supabase (if using directly)
Edit `/app/mobile/src/lib/supabase.ts`:
```typescript
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your_anon_key';
```

---

## Step 4: Running the Mobile App

### Option A: Expo Go (Recommended for Development)
```bash
cd /app/mobile
npx expo start
```

1. Scan the QR code with:
   - iOS: Camera app
   - Android: Expo Go app

2. The app will load on your device

### Option B: Web Browser
```bash
npx expo start --web
```
Opens at http://localhost:8081

### Option C: Android Emulator
```bash
npx expo start --android
```
Requires Android Studio with emulator configured

### Option D: iOS Simulator (Mac only)
```bash
npx expo start --ios
```
Requires Xcode installed

---

## Step 5: Building for Production

### 5.1 Install EAS CLI
```bash
npm install -g eas-cli
eas login
```

### 5.2 Configure Build
```bash
eas build:configure
```

### 5.3 Build APK (Android)
```bash
eas build --platform android --profile preview
```

### 5.4 Build IPA (iOS)
```bash
eas build --platform ios --profile preview
```

---

## Step 6: API Keys Setup (Optional)

### Google Maps API
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable **Maps SDK for Android** and **Maps SDK for iOS**
4. Create API Key
5. Add to `/app/mobile/app.json`:
```json
{
  "expo": {
    "android": {
      "config": {
        "googleMaps": {
          "apiKey": "YOUR_API_KEY"
        }
      }
    },
    "ios": {
      "config": {
        "googleMapsApiKey": "YOUR_API_KEY"
      }
    }
  }
}
```

### Razorpay (Payments)
1. Create account at [Razorpay Dashboard](https://dashboard.razorpay.com)
2. Get Test API Keys from **Settings** → **API Keys**
3. Add to backend `.env`:
```env
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
```

---

## Troubleshooting

### Common Issues

**1. "Network request failed"**
- Check if backend is running
- Verify API_BASE_URL uses computer IP, not localhost
- Check firewall settings

**2. "Unable to resolve module"**
```bash
npm install
npx expo start --clear
```

**3. "Supabase connection failed"**
- Verify Supabase URL and Key
- Check if tables exist (run schema.sql)
- Check Row Level Security policies

**4. Metro bundler issues**
```bash
npx expo start --clear
# or
rm -rf node_modules && npm install
```

**5. Build failing**
```bash
eas build --platform android --clear-cache
```

---

## Project Structure

```
/app/mobile/
├── App.tsx                 # Main app entry
├── app.json               # Expo configuration
├── src/
│   ├── components/        # Reusable UI components
│   ├── screens/           # App screens
│   │   ├── auth/         # Login, Signup, Role selection
│   │   ├── customer/     # Customer screens
│   │   └── owner/        # Salon owner screens
│   ├── navigation/        # React Navigation setup
│   ├── store/            # Zustand state management
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # API client, utilities
│   └── types/            # TypeScript types
└── assets/               # Images, fonts
```

---

## Test Credentials

After running the app, you can create test accounts:

**Customer Account:**
- Email: customer@test.com
- Password: Test123!
- Role: Customer

**Owner Account:**
- Email: owner@test.com  
- Password: Test123!
- Role: Owner

---

## Next Steps After Setup

1. ✅ Run database schema in Supabase
2. ✅ Configure backend environment
3. ✅ Start backend server
4. ✅ Configure mobile API URL
5. ✅ Run mobile app with Expo
6. 🔄 Create test accounts
7. 🔄 Test booking flow
8. 🔄 Configure payment gateway
9. 🔄 Add Google Maps API
10. 🔄 Build production APK/IPA

---

## Support

- Backend Logs: `tail -f /var/log/supervisor/backend.err.log`
- Frontend Logs: Check Expo terminal output
- Supabase Logs: Dashboard → Logs

Last Updated: January 2026
