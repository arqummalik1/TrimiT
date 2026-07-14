/**
 * Shared push constants + Android Rapido channel wiring.
 */
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(() => Promise.resolve(null)),
  deleteNotificationChannelAsync: jest.fn(() => Promise.resolve()),
  setNotificationCategoryAsync: jest.fn(() => Promise.resolve({ identifier: 'x', actions: [] })),
  AndroidImportance: { MAX: 7, DEFAULT: 5 },
  AndroidNotificationVisibility: { PUBLIC: 1 },
  AndroidAudioUsage: { ALARM: 4 },
  AndroidAudioContentType: { SONIFICATION: 4 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    appOwnership: 'standalone',
    isDevice: true,
    expoConfig: { extra: { eas: { projectId: 'e4f2eade-fe15-4a16-8766-83b0771a4643' } } },
  },
}));

jest.mock('../../src/lib/api', () => ({
  __esModule: true,
  default: { post: jest.fn(), get: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

jest.mock('../../src/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('../../src/store/notificationPrefsStore', () => {
  const state = { soundEnabled: true, vibrationEnabled: true };
  return {
    __notificationPrefsState: state,
    useNotificationPrefsStore: {
      getState: () => state,
    },
  };
});

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import {
  BOOKING_CHANNEL_ID,
  BOOKING_NOTIFICATION_SOUND,
  UPDATES_CHANNEL_ID,
  ensureAndroidNotificationChannels,
  registerForPushNotifications,
  registerOwnerNotificationCategories,
  resolveNotificationPresentation,
} from '../../src/lib/notifications';
import * as PrefsModule from '../../src/store/notificationPrefsStore';

const prefsState = (PrefsModule as { __notificationPrefsState: { soundEnabled: boolean; vibrationEnabled: boolean } })
  .__notificationPrefsState;

describe('shared Rapido-style push constants', () => {
  it('uses bookings_v4 + notification.mp3 from shared/push-constants.json', () => {
    expect(BOOKING_CHANNEL_ID).toBe('bookings_v4');
    expect(BOOKING_NOTIFICATION_SOUND).toBe('notification.mp3');
  });
});

describe('Android booking channel', () => {
  const originalOS = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'android' });
  });

  afterAll(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => originalOS });
  });

  it('deletes legacy + active channels then creates MAX + ALARM + bypassDnd', async () => {
    await ensureAndroidNotificationChannels();

    expect(Notifications.deleteNotificationChannelAsync).toHaveBeenCalledWith('bookings');
    expect(Notifications.deleteNotificationChannelAsync).toHaveBeenCalledWith('bookings_v2');
    expect(Notifications.deleteNotificationChannelAsync).toHaveBeenCalledWith('bookings_v3');
    expect(Notifications.deleteNotificationChannelAsync).toHaveBeenCalledWith('bookings_v4');
    expect(Notifications.deleteNotificationChannelAsync).toHaveBeenCalledWith('booking_updates');
    expect(Notifications.deleteNotificationChannelAsync).toHaveBeenCalledWith('promotions');
    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
      'bookings_v4',
      expect.objectContaining({
        importance: Notifications.AndroidImportance.MAX,
        bypassDnd: true,
        sound: 'notification',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        audioAttributes: expect.objectContaining({
          usage: Notifications.AndroidAudioUsage.ALARM,
        }),
      })
    );
    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
      UPDATES_CHANNEL_ID,
      expect.objectContaining({
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
      })
    );
  });

  it('recreates booking channel without sound when soundEnabled is false', async () => {
    prefsState.soundEnabled = false;
    await ensureAndroidNotificationChannels();

    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
      'bookings_v4',
      expect.objectContaining({
        sound: undefined,
      })
    );
    prefsState.soundEnabled = true;
  });
});

describe('notifications permission + token', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'ios' });
  });

  it('requests critical alerts on iOS then returns Expo push token', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'undetermined',
      canAskAgain: true,
    });
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
    (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
      data: 'ExponentPushToken[test-token]',
    });

    const token = await registerForPushNotifications();

    expect(Notifications.requestPermissionsAsync).toHaveBeenCalledWith({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
        allowCriticalAlerts: true,
      },
    });
    expect(token).toBe('ExponentPushToken[test-token]');
  });
});

describe('resolveNotificationPresentation', () => {
  beforeEach(() => {
    prefsState.soundEnabled = true;
    prefsState.vibrationEnabled = true;
  });

  it('plays sound when prefs soundEnabled is true', async () => {
    const presentation = await resolveNotificationPresentation();
    expect(presentation.shouldPlaySound).toBe(true);
    expect(presentation.shouldShowBanner).toBe(true);
  });

  it('mutes OS banner sound when prefs soundEnabled is false', async () => {
    prefsState.soundEnabled = false;
    const presentation = await resolveNotificationPresentation();
    expect(presentation.shouldPlaySound).toBe(false);
    expect(presentation.shouldShowList).toBe(true);
  });
});

describe('registerOwnerNotificationCategories', () => {
  it('registers Accept/Reject and Verify/Reject categories', async () => {
    await registerOwnerNotificationCategories();
    expect(Notifications.setNotificationCategoryAsync).toHaveBeenCalledWith(
      'owner_booking_actions',
      expect.arrayContaining([
        expect.objectContaining({ identifier: 'ACCEPT_BOOKING', buttonTitle: 'Accept' }),
        expect.objectContaining({ identifier: 'REJECT_BOOKING', buttonTitle: 'Reject' }),
      ])
    );
    expect(Notifications.setNotificationCategoryAsync).toHaveBeenCalledWith(
      'owner_payment_actions',
      expect.arrayContaining([
        expect.objectContaining({ identifier: 'VERIFY_PAYMENT', buttonTitle: 'Verify' }),
      ])
    );
  });
});
