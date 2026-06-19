/**
 * Unit tests for src/store/notificationPrefsStore.ts
 * Covers: soundEnabled, vibrationEnabled, toggles
 *
 * Note: We test the zustand actions directly without persistence.
 * The ensureAndroidNotificationChannels side-effect is mocked.
 */
jest.mock('../../src/lib/notifications', () => ({
  ensureAndroidNotificationChannels: jest.fn().mockResolvedValue(undefined),
}));

import { useNotificationPrefsStore } from '../../src/store/notificationPrefsStore';

describe('notificationPrefsStore', () => {
  beforeEach(() => {
    // Reset to defaults without triggering persistence rehydration
    useNotificationPrefsStore.setState({
      soundEnabled: true,
      vibrationEnabled: true,
    });
  });

  it('initializes with soundEnabled = true', () => {
    expect(useNotificationPrefsStore.getState().soundEnabled).toBe(true);
  });

  it('initializes with vibrationEnabled = true', () => {
    expect(useNotificationPrefsStore.getState().vibrationEnabled).toBe(true);
  });

  it('toggles soundEnabled to false', () => {
    useNotificationPrefsStore.getState().setSoundEnabled(false);
    expect(useNotificationPrefsStore.getState().soundEnabled).toBe(false);
  });

  it('toggles soundEnabled back to true', () => {
    useNotificationPrefsStore.getState().setSoundEnabled(false);
    useNotificationPrefsStore.getState().setSoundEnabled(true);
    expect(useNotificationPrefsStore.getState().soundEnabled).toBe(true);
  });

  it('toggles vibrationEnabled to false', () => {
    useNotificationPrefsStore.getState().setVibrationEnabled(false);
    expect(useNotificationPrefsStore.getState().vibrationEnabled).toBe(false);
  });

  it('toggles vibrationEnabled back to true', () => {
    useNotificationPrefsStore.getState().setVibrationEnabled(false);
    useNotificationPrefsStore.getState().setVibrationEnabled(true);
    expect(useNotificationPrefsStore.getState().vibrationEnabled).toBe(true);
  });

  it('does not affect vibrationEnabled when toggling sound', () => {
    useNotificationPrefsStore.getState().setSoundEnabled(false);
    expect(useNotificationPrefsStore.getState().vibrationEnabled).toBe(true);
  });

  it('does not affect soundEnabled when toggling vibration', () => {
    useNotificationPrefsStore.getState().setVibrationEnabled(false);
    expect(useNotificationPrefsStore.getState().soundEnabled).toBe(true);
  });
});
