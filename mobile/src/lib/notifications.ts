/**
 * Push Notification Service
 * ────────────────────────────────────────────────────────────────────────────
 * Handles push notification registration and management via Expo Push.
 *
 * Reliable background / killed-state delivery needs a dev build or store build.
 * In Expo Go we still attempt registration so owners can test on a physical device;
 * if the SDK cannot issue a token, the catch path logs and returns null.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import api from './api';

const devLog = (...args: unknown[]) => {
  if (__DEV__) {
    console.log(...args);
  }
};

// Configure notification behavior (avoid deprecated shouldShowAlert)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Register for push notifications and get Expo push token.
 * This token is sent to the backend and used to send notifications.
 * 
 * @returns Expo push token or null if registration failed
 */
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    const easProjectId =
      (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ??
      'e4f2eade-fe15-4a16-8766-83b0771a4643';

    if (Constants.appOwnership === 'expo') {
      devLog(
        '[Notifications] Expo Go: attempting push token (use a dev build for production-grade remote push).'
      );
    }

    // Check if running on a physical device (using Constants instead of Device)
    const isDevice = Constants.isDevice;
    if (!isDevice) {
      devLog('[Notifications] Skipping push registration: not a physical device (simulator).');
      return null;
    }

    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[Notifications] Permission not granted for push notifications');
      return null;
    }

    // Get Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: easProjectId,
    });

    const token = tokenData.data;
    devLog('[Notifications] ✅ Push token obtained:', token.substring(0, 30) + '...');

    // Configure Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('bookings', {
        name: 'Bookings',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B6B',
        sound: 'notification.mp3',
        enableVibrate: true,
        enableLights: true,
        showBadge: true,
      });

      devLog('[Notifications] ✅ Android notification channel configured');
    }

    return token;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Notifications] ❌ Failed to register for push notifications:', message, error);
    return null;
  }
}

/**
 * Send push token to backend for storage.
 * This allows the backend to send push notifications to this device.
 * 
 * @param token - Expo push token
 * @returns true if successful, false otherwise
 */
export async function sendPushTokenToBackend(token: string): Promise<boolean> {
  try {
    await api.post('/auth/push-token', { push_token: token });
    devLog('[Notifications] ✅ Push token sent to backend');
    return true;
  } catch (error) {
    console.error('[Notifications] ❌ Failed to send push token to backend:', error);
    return false;
  }
}

/**
 * Complete push notification setup:
 * 1. Register for push notifications
 * 2. Get Expo push token
 * 3. Send token to backend
 * 
 * Call this after user logs in.
 */
export async function setupPushNotifications(): Promise<void> {
  try {
    devLog('[Notifications] Setting up push notifications...');

    const { useAuthStore } = await import('../store/authStore');
    const user = useAuthStore.getState().user;
    if (user?.push_enabled === false) {
      devLog('[Notifications] Skipped — push_enabled is false');
      return;
    }

    const token = await registerForPushNotifications();
    if (!token) {
      // registerForPushNotifications already logs the specific reason (Expo Go, simulator, permission, etc.)
      return;
    }

    const success = await sendPushTokenToBackend(token);
    if (success) {
      devLog('[Notifications] ✅ Push notifications setup complete');
    } else {
      console.warn('[Notifications] ⚠️ Failed to register token with backend');
    }
  } catch (error) {
    console.error('[Notifications] ❌ Push notification setup failed:', error);
  }
}

/**
 * Add listener for notifications received while app is in foreground.
 * 
 * @param callback - Function to call when notification is received
 * @returns Subscription object (call .remove() to unsubscribe)
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
) {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Add listener for notification responses (user tapped notification).
 * 
 * @param callback - Function to call when user taps notification
 * @returns Subscription object (call .remove() to unsubscribe)
 */
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Get the notification that opened the app (if any).
 * Useful for handling cold start from notification tap.
 * 
 * @returns Notification response or null
 */
export async function getLastNotificationResponse(): Promise<Notifications.NotificationResponse | null> {
  return await Notifications.getLastNotificationResponseAsync();
}

/**
 * Clear all delivered notifications from notification tray.
 */
export async function clearAllNotifications(): Promise<void> {
  await Notifications.dismissAllNotificationsAsync();
}

/**
 * Set app badge count (iOS only).
 * 
 * @param count - Badge count (0 to clear)
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Schedule a local reminder notification 1 hour before the booking.
 */
export async function scheduleBookingReminder(params: {
  bookingId: string;
  salonName: string;
  serviceName: string;
  date: string;
  time: string;
}) {
  try {
    if (!params.date || !params.time) {
      console.warn('[Notifications] ⚠️ scheduleBookingReminder: missing date or time');
      return;
    }
    const [year, month, day] = params.date.split('-').map(Number);
    const [hour, minute] = params.time.split(':').map(Number);
    
    // Create Date object for the booking
    const bookingDate = new Date(year, month - 1, day, hour, minute);
    
    // Subtract 1 hour for the reminder
    const reminderDate = new Date(bookingDate.getTime() - 60 * 60 * 1000);
    
    // Only schedule if the reminder time is in the future
    if (reminderDate.getTime() > Date.now()) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Upcoming Appointment at ${params.salonName}`,
          body: `Your ${params.serviceName} appointment is in 1 hour (${params.time}).`,
          sound: true,
          data: { bookingId: params.bookingId },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: reminderDate,
        },
      });
      devLog('[Notifications] ✅ Scheduled reminder for:', reminderDate.toISOString());
    }
  } catch (error) {
    console.warn('[Notifications] ⚠️ Failed to schedule reminder:', error);
  }
}

/**
 * Immediate local notification when the customer’s booking is created (confirmed path).
 * Best-effort: no-op if permissions denied or Expo Go limitations apply.
 */
export async function presentBookingConfirmedLocal(params: {
  salonName: string;
  serviceName: string;
  date: string;
  time: string;
}): Promise<void> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      if (req.status !== 'granted') {
        return;
      }
    }
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Booking confirmed',
        body: `${params.serviceName} at ${params.salonName} — ${params.date} at ${params.time}`,
        sound: true,
      },
      trigger: null,
    });
  } catch (error) {
    console.warn('[Notifications] ⚠️ presentBookingConfirmedLocal failed:', error);
  }
}
