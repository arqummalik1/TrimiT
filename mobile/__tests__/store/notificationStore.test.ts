/**
 * Unit tests for src/store/notificationStore.ts
 * Covers: silent-mode audio setup, play on new_booking, prefs gate.
 */
jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => ({
    seekTo: jest.fn(),
    play: jest.fn(),
    remove: jest.fn(),
  })),
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
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

jest.mock('../../src/lib/notificationDedupe', () => ({
  shouldShowBookingNotification: jest.fn(() => true),
}));

import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { useNotificationStore } from '../../src/store/notificationStore';
import * as PrefsModule from '../../src/store/notificationPrefsStore';
import type { Booking } from '../../src/types';

const prefsState = (PrefsModule as { __notificationPrefsState: { soundEnabled: boolean } })
  .__notificationPrefsState;

const mockBooking = {
  id: '11111111-1111-4111-8111-111111111111',
  status: 'pending',
} as Booking;

describe('notificationStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prefsState.soundEnabled = true;
    useNotificationStore.setState({
      notifications: [],
      unreadCount: 0,
      activeNotification: null,
      soundEnabled: true,
      sound: null,
    });
  });

  it('initializeSound enables playsInSilentMode then loads the player', async () => {
    await useNotificationStore.getState().initializeSound();

    expect(setAudioModeAsync).toHaveBeenCalledWith({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
    });
    expect(createAudioPlayer).toHaveBeenCalled();
    expect(useNotificationStore.getState().sound).not.toBeNull();
  });

  it('initializeSound copies soundEnabled from prefsStore', async () => {
    prefsState.soundEnabled = false;
    useNotificationStore.setState({ soundEnabled: true, sound: null });

    await useNotificationStore.getState().initializeSound();

    expect(useNotificationStore.getState().soundEnabled).toBe(false);
  });

  it('playNotificationSound re-applies silent mode and plays', async () => {
    const player = {
      seekTo: jest.fn(),
      play: jest.fn(),
      remove: jest.fn(),
    };
    useNotificationStore.setState({ sound: player as never, soundEnabled: true });

    await useNotificationStore.getState().playNotificationSound();

    expect(setAudioModeAsync).toHaveBeenCalledWith({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
    });
    expect(player.seekTo).toHaveBeenCalledWith(0);
    expect(player.play).toHaveBeenCalled();
  });

  it('addNotification plays sound for new_booking', async () => {
    const player = {
      seekTo: jest.fn(),
      play: jest.fn(),
      remove: jest.fn(),
    };
    useNotificationStore.setState({ sound: player as never, soundEnabled: true });

    useNotificationStore.getState().addNotification(mockBooking, 'new_booking');

    // playNotificationSound is fire-and-forget
    await Promise.resolve();
    await Promise.resolve();

    expect(setAudioModeAsync).toHaveBeenCalledWith({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
    });
    expect(player.play).toHaveBeenCalled();
    expect(useNotificationStore.getState().activeNotification).not.toBeNull();
  });

  it('cleanupSound removes the player', async () => {
    const player = {
      seekTo: jest.fn(),
      play: jest.fn(),
      remove: jest.fn(),
    };
    useNotificationStore.setState({ sound: player as never });

    await useNotificationStore.getState().cleanupSound();

    expect(player.remove).toHaveBeenCalled();
    expect(useNotificationStore.getState().sound).toBeNull();
  });
});
