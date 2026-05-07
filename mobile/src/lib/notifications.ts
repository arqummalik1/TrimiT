/**
 * Push Notification Service
 * ────────────────────────────────────────────────────────────────────────────
 * Handles push notification registration and management.
 * Works with Expo Push Notifications (requires development build or standalone app).
 * 
 * IMPORTANT: Push notifications DO NOT work in Expo Go (SDK 53+).
 * You must use a development build or standalone APK/IPA.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { api } from './api';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
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
    // Check if running on a physical device (using Constants instead of Device)
    const isDevice = Constants.isDevice;
    if (!isDevice) {
      console.warn('[Notifications] Push notifications only work on physical devices');
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
      projectId: 'e4f2eade-fe15-4a16-8766-83b0771a4643', // From app.config.js
    });

    const token = tokenData.data;
    console.log('[Notifications] ✅ Push token obtained:', token.substring(0, 30) + '...');

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

      console.log('[Notifications] ✅ Android notification channel configured');
    }

    return token;
  } catch (error) {
    console.error('[Notifications] ❌ Failed to register for push notifications:', error);
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
    console.log('[Notifications] ✅ Push token sent to backend');
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
    console.log('[Notifications] Setting up push notifications...');

    const token = await registerForPushNotifications();
    if (!token) {
      console.warn('[Notifications] ⚠️ Could not obtain push token');
      return;
    }

    const success = await sendPushTokenToBackend(token);
    if (success) {
      console.log('[Notifications] ✅ Push notifications setup complete');
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
