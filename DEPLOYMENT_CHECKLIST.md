# Real-Time Notifications - Deployment Checklist

## 🎯 Goal
Enable WhatsApp/Instagram-like push notifications that work when app is open, minimized, or fully closed.

---

## ✅ Pre-Deployment Checklist

### Backend Changes
- [x] Push notification service created (`backend/services/push_notifications.py`)
- [x] Booking router updated to send push notifications
- [x] Auth router has push token endpoint
- [x] User model updated with push_token field

### Mobile Changes
- [x] Notification service created (`mobile/src/lib/notifications.ts`)
- [x] OwnerTabs setup push notifications
- [x] Realtime subscriptions working
- [x] Notification modal implemented
- [x] Sound alerts working

### Database Changes
- [ ] Migration 21 needs to be executed (add push_token column)

---

## 📋 Deployment Steps

### Step 1: Database Migration (2 minutes)

```sql
-- Execute in Supabase SQL Editor
-- File: database/21_add_push_tokens.sql

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS push_token TEXT;

CREATE INDEX IF NOT EXISTS idx_users_push_token 
ON public.users(push_token) 
WHERE push_token IS NOT NULL;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Verify
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'push_token';
```

**Expected Result:** Should return 1 row showing push_token column exists

---

### Step 2: Verify Supabase Realtime (1 minute)

```sql
-- Execute in Supabase SQL Editor
-- File: database/06_verify_realtime.sql

SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' AND tablename = 'bookings';
```

**Expected Result:** Should return 1 row showing bookings is in the publication

**If no results:**
```sql
-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
```

---

### Step 3: Deploy Backend (5 minutes)

```bash
# Commit and push changes
git add .
git commit -m "feat: Add push notification support for real-time bookings"
git push origin main

# Render will auto-deploy
# Wait for deployment to complete (check Render dashboard)
```

**Verify Deployment:**
- Visit: https://trimit-az5h.onrender.com/docs
- Check: `/auth/push-token` endpoint exists
- Check: Logs show no errors

---

### Step 4: Build Mobile APK (15 minutes)

```bash
cd mobile

# Build preview APK
eas build --profile preview --platform android

# Wait for build to complete
# EAS will show build URL
```

**Build URL:** https://expo.dev/accounts/arqummalik1/projects/trimit/builds

**Download APK when ready**

---

### Step 5: Install & Test (10 minutes)

#### Device 1: Owner (Real Android Device)

1. **Install APK**
   - Transfer APK to device
   - Install (allow unknown sources if needed)

2. **Login as Owner**
   - Email: (your owner account)
   - Password: (your password)

3. **Grant Permissions**
   - Allow notifications when prompted
   - Check console logs (if using React Native Debugger)

4. **Verify Setup**
   - Look for console logs:
     ```
     [Notifications] ✅ Push token obtained: ExponentPushToken[...]
     [Notifications] ✅ Push token sent to backend
     [Notifications] ✅ Push notifications setup complete
     [Supabase] ✅ Successfully subscribed to salon bookings
     ```

#### Device 2: Customer (Expo Go or APK)

1. **Login as Customer**
   - Email: (your customer account)
   - Password: (your password)

2. **Create a Booking**
   - Select salon
   - Choose service
   - Pick date and time
   - Complete booking

---

### Step 6: Verify Real-Time Notifications

#### Test 1: App Open (Foreground)

**Owner Device:**
- Keep app open on dashboard
- Customer creates booking

**Expected Results:**
- ✅ Modal appears within 1-2 seconds
- ✅ Sound plays
- ✅ Dashboard updates automatically
- ✅ Badge count increases
- ✅ Recent activity shows new booking
- ✅ Accept/Reject buttons work

#### Test 2: App Minimized (Background)

**Owner Device:**
- Press home button (minimize app)
- Customer creates booking

**Expected Results:**
- ✅ System notification appears in notification tray
- ✅ Sound plays
- ✅ Tap notification to open app
- ✅ App opens to dashboard with updated data

#### Test 3: App Closed (Terminated)

**Owner Device:**
- Swipe away app from recent apps (fully close)
- Customer creates booking

**Expected Results:**
- ✅ System notification appears in notification tray
- ✅ Sound plays
- ✅ Tap notification to open app
- ✅ App launches and loads updated data

---

## 🔍 Troubleshooting

### Issue: No push token in console

**Check:**
1. Using APK (not Expo Go)
2. Real device (not emulator)
3. Notification permissions granted
4. Internet connection active

**Solution:**
```typescript
// Add to mobile/src/navigation/OwnerTabs.tsx
useEffect(() => {
  setupPushNotifications().then(() => {
    console.log('Push setup complete');
  }).catch((error) => {
    console.error('Push setup failed:', error);
  });
}, []);
```

---

### Issue: No realtime events received

**Check:**
1. Supabase realtime enabled (Step 2)
2. Console shows subscription success
3. Internet connection active
4. Salon ID is correct

**Debug:**
```typescript
// Check mobile/src/lib/supabase.ts logs
[Supabase] Subscribing to salon bookings: <salon_id>
[Supabase] ✅ Successfully subscribed to salon bookings: <salon_id>
[Supabase] ✅ BOOKING EVENT RECEIVED: { eventType: 'INSERT', ... }
```

---

### Issue: Modal not showing

**Check:**
1. Notification store is adding notification
2. activeNotification state is set
3. Modal component is rendered

**Debug:**
```typescript
// Check mobile/src/store/notificationStore.ts logs
[NotificationStore] Adding notification: { bookingId: ..., type: 'new_booking' }
[NotificationStore] ✅ Notification added and modal should show
[NotificationStore] Setting active notification: <notification_id>
```

---

### Issue: Backend not sending push notifications

**Check:**
1. Backend deployed with latest code
2. Database migration executed
3. Owner has push_token in database
4. Backend logs show notification sent

**Debug:**
```bash
# Check Render logs
✅ Push notification sent to owner for booking <booking_id>

# Or check for errors
❌ Failed to send push notification: <error>
```

**Verify push token in database:**
```sql
SELECT id, email, push_token 
FROM users 
WHERE role = 'owner' 
LIMIT 5;
```

---

## 📊 Success Criteria

### ✅ All Tests Pass

- [ ] Push token registered in database
- [ ] Realtime subscription active
- [ ] Modal shows when app is open
- [ ] System notification when app is minimized
- [ ] System notification when app is closed
- [ ] Sound plays in all scenarios
- [ ] Dashboard updates automatically
- [ ] Badge count updates
- [ ] Accept/Reject buttons work
- [ ] No app crashes or errors

---

## 🎉 Post-Deployment

### Monitor for 24 Hours

1. **Check Render Logs**
   - Look for push notification success/failure
   - Monitor error rates

2. **Check Supabase Logs**
   - Monitor realtime connection count
   - Check for subscription errors

3. **User Feedback**
   - Ask owner to test multiple bookings
   - Verify notifications work consistently

### Performance Metrics

- **Notification Latency:** < 2 seconds
- **Dashboard Update:** < 1 second after notification
- **App Stability:** No crashes
- **Battery Impact:** Minimal (< 5% per hour)

---

## 🚀 Next Steps (Optional)

### Phase 2: Customer Notifications

When owner accepts/rejects booking, notify customer:

1. Customer registers push token (same as owner)
2. Backend sends notification on status change (already implemented)
3. Customer receives notification in all app states

### Phase 3: Notification History

Add notification history screen:

1. List all past notifications
2. Mark as read/unread
3. Filter by type
4. Clear all

### Phase 4: Notification Preferences

Let users customize:

1. Enable/disable sound
2. Enable/disable vibration
3. Notification quiet hours
4. Notification types to receive

---

## 📝 Notes

- **Expo Go Limitation:** Push notifications don't work in Expo Go (SDK 53+). This is intentional. Use APK.
- **Testing Environment:** Always test on real devices, not emulators.
- **Production Build:** When ready, use `eas build --profile production` for Play Store submission.
- **iOS Support:** Same code works for iOS. Build with `eas build --profile preview --platform ios`.

---

## ✅ Checklist Summary

- [ ] Database migration executed
- [ ] Supabase realtime verified
- [ ] Backend deployed
- [ ] APK built
- [ ] APK installed on device
- [ ] Push token registered
- [ ] Realtime subscription active
- [ ] All 3 scenarios tested (open, background, closed)
- [ ] No errors in console
- [ ] Owner satisfied with functionality

---

**When all checkboxes are checked, real-time notifications are fully deployed! 🎉**
