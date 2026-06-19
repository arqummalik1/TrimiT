/**
 * Unit tests for src/lib/lastNotificationHandled.ts
 * Covers: getLastHandledNotificationId, setLastHandledNotificationId
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

import {
  getLastHandledNotificationId,
  setLastHandledNotificationId,
} from '../../src/lib/lastNotificationHandled';

describe('lastNotificationHandled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getLastHandledNotificationId', () => {
    it('returns the stored value', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('notif-123');
      expect(await getLastHandledNotificationId()).toBe('notif-123');
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('trimit_last_handled_notification_id');
    });

    it('returns null when nothing stored', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      expect(await getLastHandledNotificationId()).toBeNull();
    });
  });

  describe('setLastHandledNotificationId', () => {
    it('persists the notification id', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      await setLastHandledNotificationId('notif-456');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('trimit_last_handled_notification_id', 'notif-456');
    });
  });
});
