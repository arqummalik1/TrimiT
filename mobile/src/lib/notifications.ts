/**
 * Push Notification Service
 * Handles Expo push registration, Android channels, and backend token sync.
 *
 * Rapido-style booking alerts (app backgrounded or killed):
 * - Android: high-importance channel + alarm audio attributes + custom sound
 * - iOS: APNs alert + critical interruption (needs Apple Critical Alerts entitlement)
 * Shared IDs/sounds: src/lib/pushConstants.ts ← shared/push-constants.json
 */

import * as Notifications from 'expo-notifications';
import { AppState, Platform } from 'react-native';
import Constants from 'expo-constants';
import api from './api';
import { logger } from './logger';
import { lightPalette } from '../theme/colors';
import { useNotificationPrefsStore } from '../store/notificationPrefsStore';
import {
  BOOKING_ANDROID_SOUND,
  BOOKING_CHANNEL_ID,
  LEGACY_BOOKING_CHANNEL_IDS,
  PROMOTIONS_CHANNEL_ID,
  UPDATES_CHANNEL_ID,
  OWNER_BOOKING_CATEGORY_ID,
  OWNER_PAYMENT_CATEGORY_ID,
  ACTION_ACCEPT_BOOKING,
  ACTION_REJECT_BOOKING,
  ACTION_VERIFY_PAYMENT,
  ACTION_REJECT_PAYMENT,
  isOwnerUrgentPushType,
} from './pushConstants';

export {
  BOOKING_CHANNEL_ID,
  PROMOTIONS_CHANNEL_ID,
  UPDATES_CHANNEL_ID,
  OWNER_BOOKING_CATEGORY_ID,
  OWNER_PAYMENT_CATEGORY_ID,
};
export { BOOKING_NOTIFICATION_SOUND } from './pushConstants';

const DEFAULT_EAS_PROJECT_ID = 'e4f2eade-fe15-4a16-8766-83b0771a4643';

let pushTokenListener: Notifications.Subscription | null = null;

/** Foreground OS banner presentation — respect local sound toggle. */
export async function resolveNotificationPresentation(): Promise<{
  shouldShowBanner: boolean;
  shouldShowList: boolean;
  shouldPlaySound: boolean;
  shouldSetBadge: boolean;
}> {
  const { soundEnabled } = useNotificationPrefsStore.getState();
  return {
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: soundEnabled,
    shouldSetBadge: true,
  };
}

Notifications.setNotificationHandler({
  handleNotification: async () => resolveNotificationPresentation(),
});

function resolveEasProjectId(): string {
  return (
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ??
    DEFAULT_EAS_PROJECT_ID
  );
}

/**
 * Android Rapido-style booking channel.
 * Channel settings lock on first create — we delete the active channel (and
 * legacy IDs) before recreate so sound/vibrate toggles take effect. Also bump
 * BOOKING_CHANNEL_ID in shared/push-constants.json when changing audioAttributes
 * layout for users who never reopen Settings.
 */
export async function ensureAndroidNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  const { soundEnabled, vibrationEnabled } = useNotificationPrefsStore.getState();

  for (const legacyId of LEGACY_BOOKING_CHANNEL_IDS) {
    await Notifications.deleteNotificationChannelAsync(legacyId).catch(() => {});
  }

  // Android freezes channel config after first create — delete active IDs first.
  await Notifications.deleteNotificationChannelAsync(BOOKING_CHANNEL_ID).catch(() => {});
  await Notifications.deleteNotificationChannelAsync(UPDATES_CHANNEL_ID).catch(() => {});
  await Notifications.deleteNotificationChannelAsync(PROMOTIONS_CHANNEL_ID).catch(() => {});

  await Notifications.setNotificationChannelAsync(BOOKING_CHANNEL_ID, {
    name: 'New Bookings',
    description:
      'Incoming booking requests and payments — plays even when TrimiT is closed. Requires immediate attention.',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: vibrationEnabled ? [0, 400, 200, 400, 200, 400] : undefined,
    enableVibrate: vibrationEnabled,
    lightColor: lightPalette.primary,
    sound: soundEnabled ? BOOKING_ANDROID_SOUND : undefined,
    enableLights: true,
    showBadge: true,
    bypassDnd: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    // Treat like an alarm so OEMs are less likely to silence when app is killed.
    audioAttributes: {
      usage: Notifications.AndroidAudioUsage.ALARM,
      contentType: Notifications.AndroidAudioContentType.SONIFICATION,
      flags: {
        enforceAudibility: true,
        requestHardwareAudioVideoSynchronization: false,
      },
    },
  });

  await Notifications.setNotificationChannelAsync(UPDATES_CHANNEL_ID, {
    name: 'Booking updates',
    description: 'Reschedules, cancellations, and other booking updates. Uses the default notification sound.',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: vibrationEnabled ? [0, 200, 100, 200] : undefined,
    enableVibrate: vibrationEnabled,
    sound: 'default',
    enableLights: false,
    showBadge: true,
  });

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
 * Register interactive notification categories (Accept/Reject, Verify payment).
 * Required on device before remote pushes with categoryId show action buttons.
 * Identifier must not contain ":" or "-" (Expo docs).
 */
export async function registerOwnerNotificationCategories(): Promise<void> {
  try {
    await Notifications.setNotificationCategoryAsync(OWNER_BOOKING_CATEGORY_ID, [
      {
        identifier: ACTION_ACCEPT_BOOKING,
        buttonTitle: 'Accept',
        options: { opensAppToForeground: true },
      },
      {
        identifier: ACTION_REJECT_BOOKING,
        buttonTitle: 'Reject',
        options: {
          opensAppToForeground: true,
          isDestructive: true,
        },
      },
    ]);

    await Notifications.setNotificationCategoryAsync(OWNER_PAYMENT_CATEGORY_ID, [
      {
        identifier: ACTION_VERIFY_PAYMENT,
        buttonTitle: 'Verify',
        options: { opensAppToForeground: true },
      },
      {
        identifier: ACTION_REJECT_PAYMENT,
        buttonTitle: 'Reject',
        options: {
          opensAppToForeground: true,
          isDestructive: true,
        },
      },
    ]);
    logger.info('[Notifications] Owner action categories registered');
  } catch (error) {
    logger.warn('[Notifications] Category registration failed', { error: String(error) });
  }
}

/**
 * Android 13+ requires runtime POST_NOTIFICATIONS.
 * Create channels before requesting permission so the OS prompt can appear.
 */
async function ensureNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await ensureAndroidNotificationChannels();
  }

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
      // Rapido-style: play booking tone when app is killed / silent / Focus.
      allowCriticalAlerts: true,
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

    // Channels already ensured on Android inside ensureNotificationPermissions.
    if (Platform.OS === 'android') {
      await ensureAndroidNotificationChannels();
    }

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

    await registerOwnerNotificationCategories();

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

    if (eventType === 'broadcast') {
      return;
    }

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
        : isOwnerUrgentPushType(eventType)
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
          sound: Platform.OS === 'ios' ? 'default' : true,
          data: { bookingId: params.bookingId, type: 'reminder' },
          ...(Platform.OS === 'android' ? { channelId: UPDATES_CHANNEL_ID } : {}),
          ...(Platform.OS === 'ios'
            ? { interruptionLevel: 'active' as const }
            : {}),
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
        sound: Platform.OS === 'ios' ? 'default' : true,
        ...(Platform.OS === 'android' ? { channelId: UPDATES_CHANNEL_ID } : {}),
        ...(Platform.OS === 'ios'
          ? { interruptionLevel: 'active' as const }
          : {}),
      },
      trigger: null,
    });
  } catch (error) {
    logger.warn('[Notifications] presentBookingConfirmedLocal failed', { error: String(error) });
  }
}
