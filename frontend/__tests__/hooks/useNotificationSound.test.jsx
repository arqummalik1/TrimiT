import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import useNotificationSound from '../../src/hooks/useNotificationSound';
import { useNotificationStore } from '../../src/store/notificationStore';

// Mock the store
vi.mock('../../src/store/notificationStore', () => ({
  useNotificationStore: vi.fn()
}));

// Mock Audio constructor
const mockPlay = vi.fn().mockResolvedValue(undefined);
const mockPause = vi.fn();
class MockAudio {
  constructor(src) {
    this.src = src;
    this.volume = 1;
    this.currentTime = 0;
  }
  play = mockPlay;
  pause = mockPause;
}

describe('useNotificationSound', () => {
  let originalAudio;

  beforeEach(() => {
    vi.clearAllMocks();
    originalAudio = global.Audio;
    global.Audio = MockAudio;
  });

  afterEach(() => {
    global.Audio = originalAudio;
  });

  it('plays standard sound when enabled', () => {
    vi.mocked(useNotificationStore).mockReturnValue({ soundEnabled: true });
    
    const { result } = renderHook(() => useNotificationSound());
    result.current.playSound();
    
    expect(mockPlay).toHaveBeenCalledTimes(1);
  });

  it('does not play standard sound when disabled', () => {
    vi.mocked(useNotificationStore).mockReturnValue({ soundEnabled: false });
    
    const { result } = renderHook(() => useNotificationSound());
    result.current.playSound();
    
    expect(mockPlay).not.toHaveBeenCalled();
  });

  it('plays booking sound when enabled', () => {
    vi.mocked(useNotificationStore).mockReturnValue({ soundEnabled: true });
    
    const { result } = renderHook(() => useNotificationSound());
    result.current.playBookingSound();
    
    expect(mockPlay).toHaveBeenCalledTimes(1);
  });

  it('does not play booking sound when disabled', () => {
    vi.mocked(useNotificationStore).mockReturnValue({ soundEnabled: false });
    
    const { result } = renderHook(() => useNotificationSound());
    result.current.playBookingSound();
    
    expect(mockPlay).not.toHaveBeenCalled();
  });

  it('pauses audio on unmount', () => {
    vi.mocked(useNotificationStore).mockReturnValue({ soundEnabled: true });
    
    const { unmount } = renderHook(() => useNotificationSound());
    unmount();
    
    expect(mockPause).toHaveBeenCalledTimes(1);
  });
});
