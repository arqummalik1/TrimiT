/**
 * Unit tests for src/lib/realtimeOwnerGuard.ts
 * Covers: setOwnerRealtimeSubscribed, isOwnerRealtimeSubscribed
 */

// Module-level mutable state — must reset between tests
import {
  setOwnerRealtimeSubscribed,
  isOwnerRealtimeSubscribed,
} from '../../src/lib/realtimeOwnerGuard';

describe('realtimeOwnerGuard', () => {
  afterEach(() => {
    // Reset module state between tests
    setOwnerRealtimeSubscribed(false);
  });

  it('starts as false', () => {
    expect(isOwnerRealtimeSubscribed()).toBe(false);
  });

  it('returns true after setting to true', () => {
    setOwnerRealtimeSubscribed(true);
    expect(isOwnerRealtimeSubscribed()).toBe(true);
  });

  it('returns false after setting back to false', () => {
    setOwnerRealtimeSubscribed(true);
    setOwnerRealtimeSubscribed(false);
    expect(isOwnerRealtimeSubscribed()).toBe(false);
  });
});
