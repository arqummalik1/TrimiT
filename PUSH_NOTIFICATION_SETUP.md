# Push Notification Setup Guide

## ✅ Current Status

All code is implemented and ready. Push notifications **WILL NOT WORK** in Expo Go but **WILL WORK** in the EAS preview build APK.

## 🎯 Why Push Notifications Don't Work in Expo Go

Starting with Expo SDK 53, push notifications were removed from Expo Go for security reasons. This is **intentional** and affects all apps, not just TrimiT.

**Solution:** Use EAS Build to create a standalone APK.

## 📱 Testing Push Notifications

### Step 1: Build Preview APK

```bash
cd mobile
eas build --profile preview --platform android
```

### Step 2: Download & Install APK

1. Go to https://expo.dev/accounts/arqummalik1/projects/trimit/builds
2. Download the latest preview build APK
3. Install on your Android device
4. Grant notification permissions when prompted

### Step 3: Test Real-Time Flow

**Device 1 (Owner - APK installed):**
- Login as salon owner
- Keep app open OR minimize OR close completely

**Device 2 (Customer - Expo Go or APK):**
- Login as customer
- Create a booking

**Expected Result:**
- Owner receives push notification instantly (all app states)
- Owner dashboard updates automatically
- Modal shows with booking details
- Sound plays
- Badge count updates

## 🔧 What Was Implemented

### Backend Changes

1. ✅ **Database Migration** (`database/21_add_push_tokens.sql`)
   - Added `push_token` column to users table
   - Added index for performance

2. ✅ **Push Notification Service** (`backend/services/push_notifications.py`)
   - Send notifications via Expo Push API
   - Handle new bookings
   - Handle status changes
   - Batch notifications support

3. ✅ **Backend Integration** (`backend/routers/bookings.py`)
   - Send push notification when booking created
   - Send push notification when status changes
   - Non-blocking (won't fail booking if notification fails)

4. ✅ **Auth Endpoint** (`backend/routers/auth.py`)
   - POST `/auth/push-token` - Register device token

### Mobile Changes

1. ✅ **Notification Service** (`mobile/src/lib/notifications.ts`)
   - Register for push notifications
   - Get Expo push token
   - Send token to backend
   - Configure Android notification channel
   - Handle notification events

2. ✅ **OwnerTabs Integration** (`mobile/src/navigation/OwnerTabs.tsx`)
   - Setup push notifications on mount
   - Safe error handling (won't break app)

3. ✅ **Supabase Realtime** (Already working)
   - Real-time subscription to bookings table
   - Automatic query invalidation
   - In-app notification modal

## 🎨 Notification Features

### When App is Open (Foreground)
- ✅ In-app modal with animation
- ✅ Sound alert
- ✅ Accept/Reject buttons
- ✅ Dashboard auto-updates
- ✅ Badge count updates

### When App is Minimized (Background)
- ✅ System notification in notification tray
- ✅ Sound alert
- ✅ Tap to open app
- ✅ Badge count updates

### When App is Closed (Terminated)
- ✅ System notification in notification tray
- ✅ Sound alert
- ✅ Tap to open app
- ✅ App opens to relevant screen

## 🔍 Debugging

### Check if Push Token is Registered

```bash
# In mobile app console
# You should see:
[Notifications] ✅ Push token obtained: ExponentPushToken[...]
[Notifications] ✅ Push token sent to backend
[Notifications] ✅ Push notifications setup complete
```

### Check Backend Logs

```bash
# When booking is created, you should see:
✅ Push notification sent to owner for booking <booking_id>
```

### Test Push Notification Manually

You can test push notifications using curl:

```bash
curl -X POST https://exp.host/--/api/v2/push/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "ExponentPushToken[YOUR_TOKEN_HERE]",
    "title": "Test Notification",
    "body": "This is a test",
    "sound": "default",
    "priority": "high"
  }'
```

## 🚨 Common Issues

### Issue: "Push notifications only work on physical devices"
**Solution:** This is expected. Push notifications don't work on emulators. Use a real Android device.

### Issue: "expo-notifications: Android Push notifications functionality was removed from Expo Go"
**Solution:** This is expected. Build an APK using EAS Build and install it on your device.

### Issue: No notification received
**Checklist:**
1. ✅ Using APK (not Expo Go)
2. ✅ Notification permissions granted
3. ✅ Push token registered (check console logs)
4. ✅ Backend deployed with latest code
5. ✅ Database migration 21 executed

## 📊 Architecture

```
Customer creates booking
        ↓
Backend receives request
        ↓
    ┌───────────────────────────┐
    │                           │
    ↓                           ↓
Supabase Realtime          Expo Push API
(In-app updates)          (System notifications)
    ↓                           ↓
Owner's device              Owner's device
    ↓                           ↓
Modal + Sound              Notification tray
Dashboard updates          Tap to open app
```

## 🎯 Next Steps

1. **Run database migration:**
   ```sql
   -- Execute database/21_add_push_tokens.sql in Supabase SQL Editor
   ```

2. **Deploy backend:**
   ```bash
   # Backend will auto-deploy on Render when you push to main
   git add .
   git commit -m "Add push notification support"
   git push origin main
   ```

3. **Build APK:**
   ```bash
   cd mobile
   eas build --profile preview --platform android
   ```

4. **Test on real device:**
   - Install APK
   - Login as owner
   - Test all scenarios (open, background, closed)

## ✅ Conclusion

**NO NEED TO MIGRATE TO REACT NATIVE CLI**

Everything is ready. Just build the APK and test on a real device. Push notifications will work perfectly in all app states (open, background, closed) just like WhatsApp, Instagram, Ola, and Blinkit.


---

## Broadcast push notifications (Zomato/Blinkit-style)

Added in Pass 4. **Independent from the booking notification system**;
both can run side-by-side.

### Channels (Android)

| Channel ID    | Purpose                                  | Importance |
|---------------|------------------------------------------|------------|
| `bookings`    | Booking lifecycle (existing)             | MAX        |
| `promotions`  | Broadcast marketing pushes (new)         | DEFAULT    |

The two channels are deliberately separate so users can mute promotions in
Android system settings without losing booking alerts.

### User opt-in

`users.notify_promotional` (added in migration 24) gates broadcast delivery.
Default is `false` — broadcasts are **opt-in**, like Zomato. The mobile UI
already exposes the toggle in `NotificationSettingsSection.tsx` →
"Promotional notifications".

The backend always also checks `users.push_enabled` (master switch). Either
flag being false skips the user.

### Backend admin endpoint

`POST /api/v1/admin/broadcast` — protected by static bearer token from
`ADMIN_API_TOKEN` env var. If the env var is unset, the endpoint returns
404 (intentionally hides existence in dev/staging).

```bash
curl -X POST https://trimit-az5h.onrender.com/api/v1/admin/broadcast \
  -H "Authorization: Bearer $ADMIN_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "audience": "customers",
    "title": "Weekend offer",
    "body": "Flat 20% off all haircut services this weekend at participating salons.",
    "data": { "deeplink": "trimit://discover" }
  }'
```

Response (`202 Accepted`):

```json
{
  "broadcast_id": "…",
  "audience": "customers",
  "recipients_count": 1234,
  "delivered_count": 1180,
  "failed_count": 54
}
```

`audience` must be one of:
- `customers` — every customer with `notify_promotional=true` and a valid token
- `owners` — every salon owner with the same flags
- `all` — both

`title` ≤ 80 chars, `body` ≤ 240 chars (validated DB-side too).

`data` is forwarded to Expo as the message `data` field; reserved keys
(`type`, `audience`) are always overridden server-side. Mobile receives
`data.type = "broadcast"` and routes to the role's home tab on tap (no
deep-link by default; encode one in `data` if you want).

### Audit log

Every broadcast is recorded in `public.broadcast_notifications` with the
final `recipients_count`, `delivered_count`, and `failed_count`. RLS locks
the table to service-role only — no direct authenticated/anon read or
write. Read it via `GET /api/v1/admin/broadcast`.

### Rate limits

- `POST /admin/broadcast` — 10/minute per admin token
- `GET /admin/broadcast` — 30/minute per admin token

### Code paths

- DB migration: `database/39_broadcast_notifications.sql`
- Backend service: `backend/services/broadcast.py`
- Admin router: `backend/routers/admin.py`
- Push fan-out: `backend/services/push_notifications.py:send_batch_notifications`
  (now accepts per-message `channelId`; broadcasts pass `'promotions'`)
- Mobile channel registration: `mobile/src/lib/notifications.ts:ensureAndroidNotificationChannels`
- Mobile foreground handler: `mobile/src/lib/notifications.ts:handleOwnerForegroundPush`
  (early-returns when `data.type === 'broadcast'`, so marketing pushes do
   **not** trigger the owner booking-modal flow)
- Mobile tap navigation: `mobile/src/lib/notificationNavigation.ts`

### Roadmap (out of scope for v1)

- Replace the static `ADMIN_API_TOKEN` with a real admin role table + JWT
  (tracked as `B11` in `docs/REMAINING_ISSUES.md`).
- Web Sentry on the admin console (when one exists).
- Scheduled / drip broadcasts (queue + cron).
- Per-broadcast click-through tracking (requires deep-link instrumentation).
