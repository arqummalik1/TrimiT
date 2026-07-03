/**
 * Push Notification Service
 * Handles Expo push registration, Android channels, and backend token sync.
 */

import * as Notifications from 'expo-notifications';
import { AppState, Platform } from 'react-native';
import Constants from 'expo-constants';
import api from './api';
import { logger } from './logger';
import { lightPalette } from '../theme/colors';

const BOOKINGS_CHANNEL_ID = 'bookings_v2';
const LEGACY_BOOKINGS_CHANNEL_ID = 'bookings';
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

  // Android LOCKS a channel's sound/vibration/importance/bypassDnd on first
  // creation — they can never be changed in code afterwards. The original
  // 'bookings' channel shipped with sound:'default' and no DnD bypass, so we
  // create a fresh 'bookings_v2' channel to apply the high-attention settings
  // and delete the stale one so it doesn't linger in the owner's settings.
  await Notifications.deleteNotificationChannelAsync(LEGACY_BOOKINGS_CHANNEL_ID).catch(() => {});

  // 'bookings_v2' channel — maximum attention, mirrors Rapido Captain / Blinkit Partner.
  // bypassDnd: owner must NEVER miss a booking because their phone is on silent.
  // Aggressive vibration pattern: [wait, vibrate, pause, vibrate, pause, vibrate].
  // Sound name must match the filename in assets/sounds/ registered in app.config.js.
  await Notifications.setNotificationChannelAsync(BOOKINGS_CHANNEL_ID, {
    name: 'New Bookings',
    description: 'Incoming booking requests — requires immediate attention.',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: vibrationEnabled ? [0, 400, 200, 400, 200, 400] : undefined,
    enableVibrate: vibrationEnabled,
    lightColor: lightPalette.primary,
    sound: soundEnabled ? 'notification' : undefined,
    enableLights: true,
    showBadge: true,
    bypassDnd: true,
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

  try {
    const data = notification.request.content.data as Record<string, unknown> | undefined;
    const eventType = typeof data?.type === 'string' ? data.type : 'new_booking';

    // Broadcasts (Zomato/Blinkit-style marketing pushes) are not booking events
    // and must not pop the new-booking modal. The system tray notification still
    // shows on the promotions channel; tap → handleNotificationNavigation routes.
    if (eventType === 'broadcast') {
      return;
    }

    // Authenticated user role check takes priority over client-supplied role_hint
    const { useAuthStore } = await import('../store/authStore');
    const user = useAuthStore.getState().user;
    if (!user) {
      logger.warn('[Notifications] Ignored owner foreground push: no authenticated user session');
      return;
    }
    if (user.role !== 'owner') {
      logger.warn('[Notifications] Ignored owner foreground push: authenticated user is not an owner', { role: user.role });
      return;
    }

    const bookingId =
      (typeof data?.booking_id === 'string' && data.booking_id) ||
      (typeof data?.bookingId === 'string' && data.bookingId) ||
      null;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!bookingId || !uuidRegex.test(bookingId)) {
      logger.warn('[Notifications] Ignored owner foreground push: missing or invalid booking UUID', { bookingId });
      return;
    }

    const modalType =
      eventType === 'booking_cancelled' || eventType === 'booking_cancelled_by_owner'
        ? 'cancellation'
        : eventType === 'new_booking' || eventType === 'payment_received'
          ? 'new_booking'
          : 'status_change';

    const { bookingService } = await import('../services/bookingService');
    const { useNotificationStore } = await import('../store/notificationStore');
    const booking = await bookingService.getBooking(bookingId);
    useNotificationStore.getState().addNotification(booking, modalType);
  } catch (error) {
    logger.error('[Notifications] Foreground owner push handling failed', {
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

    const dateParts = params.date.split('-');
    const timeParts = params.time.split(':');

    if (dateParts.length !== 3 || timeParts.length !== 2) {
      logger.warn('[Notifications] Invalid date/time format for reminder', { date: params.date, time: params.time });
      return;
    }

    const year = Number(dateParts[0]);
    const month = Number(dateParts[1]);
    const day = Number(dateParts[2]);
    const hour = Number(timeParts[0]);
    const minute = Number(timeParts[1]);

    if (
      isNaN(year) || isNaN(month) || isNaN(day) ||
      isNaN(hour) || isNaN(minute) ||
      year < 2026 || year > 2100 ||
      month < 1 || month > 12 ||
      day < 1 || day > 31 ||
      hour < 0 || hour > 23 ||
      minute < 0 || minute > 59
    ) {
      logger.warn('[Notifications] Date/time out of bounds for reminder', { year, month, day, hour, minute });
      return;
    }

    const bookingDate = new Date(year, month - 1, day, hour, minute);
    if (isNaN(bookingDate.getTime())) {
      logger.warn('[Notifications] Constructed date is invalid', { year, month, day, hour, minute });
      return;
    }

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
