import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRemoveChannel = vi.fn();
const mockUnsubscribe = vi.fn();
const channelObj = {
  on() {
    return this;
  },
  subscribe() {
    return this;
  },
  unsubscribe: mockUnsubscribe,
};

const mockChannel = vi.fn(() => channelObj);

const mockClient = {
  channel: mockChannel,
  removeChannel: mockRemoveChannel,
  realtime: { setAuth: vi.fn() },
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockClient),
}));

vi.mock('../../src/config/env', () => ({
  getEnv: vi.fn((key) => {
    if (key === 'SUPABASE_URL') return 'https://test.supabase.co';
    if (key === 'SUPABASE_ANON_KEY') return 'anon-key';
    return '';
  }),
}));

describe('supabase realtime cleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('unsubscribeFromChannel removes channel on owning client', async () => {
    const { subscribeToUserBookings, unsubscribeFromChannel } = await import('../../src/lib/supabase');

    const channel = subscribeToUserBookings('user-1', vi.fn(), 'token-abc');
    unsubscribeFromChannel(channel);

    expect(mockUnsubscribe).toHaveBeenCalled();
    expect(mockRemoveChannel).toHaveBeenCalledWith(channelObj);
    expect(channelObj._trimitRealtimeClient).toBe(mockClient);
  });
});
