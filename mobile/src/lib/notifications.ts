/**
 * Push Notification Service
 * Handles Expo push registration, Android channels, and backend token sync.
 */

import * as Notifications from 'expo-notifications';
import { AppState, Platform } from 'react-native';
import Constants from 'expo-constants';
import api from './api';
import { logger } from './logger';

const BOOKINGS_CHANNEL_ID = 'bookings';
const PROMOTIONS_CHANNEL_ID = 'promotions';
const DEFAULT_EAS_PROJECT_ID = 'e4f2eade-fe15-4a16-8766-83b0771a4643';

let pushTokenListener: Notifications.Subscription | null = null;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function resolveEasProjectId(): string {
  return (
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ??
    DEFAULT_EAS_PROJECT_ID
  );
}

export async function ensureAndroidNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  const { useNotificationPrefsStore } = await import('../store/notificationPrefsStore');
  const { soundEnabled, vibrationEnabled } = useNotificationPrefsStore.getState();

  await Notifications.setNotificationChannelAsync(BOOKINGS_CHANNEL_ID, {
    name: 'Bookings',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: vibrationEnabled ? [0, 250, 250, 250] : undefined,
    enableVibrate: vibrationEnabled,
    lightColor: '#FF6B6B',
    sound: soundEnabled ? 'default' : undefined,
    enableLights: true,
    showBadge: true,
  });

  // Promotions / broadcast channel — kept separate from bookings so users
  // can mute marketing pushes in Android settings without losing booking
  // alerts. Lower importance than bookings (no full-screen interrupt).
  await Notifications.setNotificationChannelAsync(PROMOTIONS_CHANNEL_ID, {
    name: 'Promotions & Offers',
    description:
      'Offers, news, and announcements from TrimiT. Booking alerts use a separate channel.',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: vibrationEnabled ? [0, 200, 100, 200] : undefined,
    enableVibrate: vibrationEnabled,
    sound: soundEnabled ? 'default' : undefined,
    enableLights: false,
    showBadge: false,
  });
}

/**
 * Android 13+ requires runtime POST_NOTIFICATIONS grant for tray delivery in standalone builds.
 */
async function ensureNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus, canAskAgain } = await Notifications.getPermissionsAsync();

  if (existingStatus === 'granted') {
    return true;
  }

  if (existingStatus === 'denied' && canAskAgain === false) {
    logger.warn('[Notifications] Permission permanently denied');
    return false;
  }

  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });

  return status === 'granted';
}

/**
 * Register for push notifications and get Expo push token.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    if (Constants.appOwnership === 'expo') {
      logger.info('[Notifications] Expo Go: remote push may be limited; use a release APK for production testing.');
    }

    if (!Constants.isDevice) {
      logger.info('[Notifications] Skipping push registration: simulator/emulator');
      return null;
    }

    const granted = await ensureNotificationPermissions();
    if (!granted) {
      logger.warn('[Notifications] Permission not granted');
      return null;
    }

    await ensureAndroidNotificationChannels();

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: resolveEasProjectId(),
    });

    const token = tokenData.data;
    logger.info('[Notifications] Push token obtained', { prefix: token.substring(0, 28) });
    return token;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('[Notifications] Registration failed', { message, error });
    return null;
  }
}

export async function sendPushTokenToBackend(token: string): Promise<boolean> {
  try {
    await api.post('/auth/push-token', { push_token: token });
    logger.info('[Notifications] Push token synced to backend');
    return true;
  } catch (error) {
    logger.error('[Notifications] Failed to sync push token', error);
    return false;
  }
}

export async function clearPushTokenOnBackend(): Promise<void> {
  try {
    await api.post('/auth/push-token', { push_token: null });
  } catch {
    // Best-effort on logout
  }
}

export function startPushTokenRefreshListener(): void {
  if (pushTokenListener) {
    return;
  }

  pushTokenListener = Notifications.addPushTokenListener(({ data }) => {
    if (!data) {
      return;
    }
    logger.info('[Notifications] Push token refreshed by OS');
    void sendPushTokenToBackend(data);
  });
}

export function stopPushTokenRefreshListener(): void {
  pushTokenListener?.remove();
  pushTokenListener = null;
}

/**
 * Complete push notification setup after login.
 */
export async function setupPushNotifications(): Promise<void> {
  try {
    const { useAuthStore } = await import('../store/authStore');
    const user = useAuthStore.getState().user;
    if (user?.push_enabled === false) {
      logger.info('[Notifications] Skipped — push_enabled is false');
      return;
    }

    const token = await registerForPushNotifications();
    if (!token) {
      return;
    }

    await sendPushTokenToBackend(token);
    startPushTokenRefreshListener();
  } catch (error) {
    logger.error('[Notifications] Setup failed', error);
  }
}

export async function teardownPushNotifications(): Promise<void> {
  stopPushTokenRefreshListener();
  await clearPushTokenOnBackend();
}

export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
) {
  return Notifications.addNotificationReceivedListener(callback);
}

export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

export async function getLastNotificationResponse(): Promise<Notifications.NotificationResponse | null> {
  return Notifications.getLastNotificationResponseAsync();
}

export async function clearAllNotifications(): Promise<void> {
  await Notifications.dismissAllNotificationsAsync();
}

export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Owner foreground: map remote push payload to in-app booking modal when app is active.
 */
export async function handleOwnerForegroundPush(
  notification: Notifications.Notification
): Promise<void> {
  if (AppState.currentState !== 'active') {
    return;
  }

  const data = notification.request.content.data as Record<string, unknown> | undefined;
  const eventType = typeof data?.type === 'string' ? data.type : 'new_booking';

  // Broadcasts (Zomato/Blinkit-style marketing pushes) are not booking events
  // and must not pop the new-booking modal. The system tray notification still
  // shows on the promotions channel; tap → handleNotificationNavigation routes.
  if (eventType === 'broadcast') {
    return;
  }

  const roleHint = typeof data?.role_hint === 'string' ? data.role_hint : '';
  if (roleHint && roleHint !== 'owner') {
    return;
  }

  const bookingId =
    (typeof data?.booking_id === 'string' && data.booking_id) ||
    (typeof data?.bookingId === 'string' && data.bookingId) ||
    null;

  if (!bookingId) {
    return;
  }

  const modalType =
    eventType === 'booking_cancelled' || eventType === 'booking_cancelled_by_owner'
      ? 'cancellation'
      : eventType === 'new_booking' || eventType === 'payment_received'
        ? 'new_booking'
        : 'status_change';

  try {
    const { bookingService } = await import('../services/bookingService');
    const { useNotificationStore } = await import('../store/notificationStore');
    const booking = await bookingService.getBooking(bookingId);
    useNotificationStore.getState().addNotification(booking, modalType);
  } catch (error) {
    logger.warn('[Notifications] Foreground owner push handling failed', {
      bookingId,
      error: String(error),
    });
  }
}

export async function scheduleBookingReminder(params: {
  bookingId: string;
  salonName: string;
  serviceName: string;
  date: string;
  time: string;
}) {
  try {
    const { useAuthStore } = await import('../store/authStore');
    if (useAuthStore.getState().user?.notify_reminders === false) {
      return;
    }

    if (!params.date || !params.time) {
      return;
    }
    const [year, month, day] = params.date.split('-').map(Number);
    const [hour, minute] = params.time.split(':').map(Number);

    const bookingDate = new Date(year, month - 1, day, hour, minute);
    const reminderDate = new Date(bookingDate.getTime() - 60 * 60 * 1000);

    const reminderId = `reminder-${params.bookingId}`;
    await Notifications.cancelScheduledNotificationAsync(reminderId).catch(() => {});

    if (reminderDate.getTime() > Date.now()) {
      await Notifications.scheduleNotificationAsync({
        identifier: reminderId,
        content: {
          title: `Upcoming Appointment at ${params.salonName}`,
          body: `Your ${params.serviceName} appointment is in 1 hour (${params.time}).`,
          sound: true,
          data: { bookingId: params.bookingId },
          ...(Platform.OS === 'android' ? { channelId: BOOKINGS_CHANNEL_ID } : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: reminderDate,
        },
      });
    }
  } catch (error) {
    logger.warn('[Notifications] scheduleBookingReminder failed', { error: String(error) });
  }
}

export async function cancelBookingReminder(bookingId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(`reminder-${bookingId}`);
  } catch {
    // non-fatal
  }
}

export async function presentBookingConfirmedLocal(params: {
  salonName: string;
  serviceName: string;
  date: string;
  time: string;
}): Promise<void> {
  try {
    const granted = await ensureNotificationPermissions();
    if (!granted) {
      return;
    }
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Booking confirmed',
        body: `${params.serviceName} at ${params.salonName} — ${params.date} at ${params.time}`,
        sound: true,
        ...(Platform.OS === 'android' ? { channelId: BOOKINGS_CHANNEL_ID } : {}),
      },
      trigger: null,
    });
  } catch (error) {
    logger.warn('[Notifications] presentBookingConfirmedLocal failed', { error: String(error) });
  }
}
