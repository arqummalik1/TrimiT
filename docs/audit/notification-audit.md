# Notification Audit

**Channels:** Expo Push (remote), local notifications (reminders/confirm), Supabase Realtime (in-app owner modal)

---

## Requirements vs implementation

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Customer notified on booking complete | ✅ | `booking_push.py` + `push_dispatch.py` |
| Salon alerted on new booking | ✅ | Owner push on create |
| Preferences ON/OFF in settings | ✅ Mobile | `NotificationSettingsSection.tsx`, migration 24 |
| App branding/logo in notifications | ⚠️ Partial | Android channel `bookings`; custom sound `notification.mp3` |
| Web notification prefs | ❌ | No UI |
| Retry on push failure | ❌ | Log only |
| Stale token cleanup | ❌ | No Expo receipt handling |

---

## Backend pipeline

```
routers/bookings.py (status change / create)
    → services/booking_push.py
    → services/push_dispatch.send_booking_push()
    → services/push_preferences.should_send_push()
    → services/push_preferences.record_notification_event()  # dedupe
    → services/push_notifications.PushNotificationService
    → https://exp.host/--/api/v2/push/send
```

### Preference columns (`users` table, migration 24)

| Column | Default | UI label |
|--------|---------|----------|
| `push_enabled` | true | Master toggle |
| `notify_bookings` | true | New bookings (owner) |
| `notify_booking_updates` | true | Status changes |
| `notify_promotional` | false | Offers |
| `notify_reminders` | true | Reminders |

**API:** `PATCH /api/v1/auth/notification-preferences`

### Dedupe
`notification_events` UNIQUE `(booking_id, event_type, recipient_user_id)` prevents duplicate pushes for same event.

---

## Mobile implementation

| Component | Role |
|-----------|------|
| `lib/notifications.ts` | Permission, token, channels, local schedule |
| `App.tsx` | Response listener (tap) |
| `CustomerTabs` / `OwnerTabs` | Register token on mount |
| `NotificationSettingsSection` | Prefs UI |
| `notificationNavigation.ts` | Tap → Bookings tab |
| `useRealtimeBookings.ts` | Owner foreground modal |
| `BookingScreen` | `presentBookingConfirmedLocal`, `scheduleBookingReminder` |

### Gaps

1. **`notify_reminders` not checked** before `scheduleBookingReminder()`.
2. **Tap navigation** does not open booking detail by `bookingId`.
3. **Duplicate** `setNotificationHandler` in `App.tsx` and `notifications.ts`.
4. **Foreground** remote display — relies on default handler only.
5. **Expo Go** — remote push requires dev/production build.

---

## Branding recommendations

Add to Expo push payload:
```json
{
  "title": "TrimiT",
  "body": "...",
  "data": { "bookingId": "...", "type": "booking_complete" },
  "channelId": "bookings",
  "priority": "high"
}
```

Android: ensure `notification-icon.png` in assets; set `expo-notifications` plugin icon in `app.config.js`.

---

## Web

- No push notifications (expected for CRA).
- `useNotificationSound.js` — sound only for in-app bell.
- Orphan notification pages not routed.

---

## Testing checklist

- [ ] Owner receives push on new booking (device, prefs ON)
- [ ] Customer receives push on `completed` status
- [ ] Prefs OFF → no push (keep Realtime separate)
- [ ] Duplicate status change → single push (dedupe table)
- [ ] Tap notification → correct screen (after fix)
- [ ] Local reminder fires 1h before (prefs ON)
- [ ] Token registered after login + app resume

---

## Post-MVP improvements

1. Expo push receipts → clear invalid `push_token`
2. Rich notifications (salon name, time in body template)
3. Web push (optional, Phase 3)
4. Email fallback for critical booking events
