/**
 * Realtime resilience for the booking channels (src/lib/supabase.ts).
 *
 * A channel that errors out used to stay dead forever — the list silently
 * stopped updating. These tests pin the re-join behaviour: exponential backoff
 * on CHANNEL_ERROR / TIMED_OUT, backoff reset on SUBSCRIBED, and no retry (nor
 * leaked timer) once the caller tears the channel down.
 *
 * The Supabase client is replaced with a fake whose channels record their
 * subscribe/unsubscribe calls, so no socket is ever opened.
 */

type StatusCallback = (status: string, err?: Error) => void;

interface FakeChannel {
  topic: string;
  on: jest.Mock;
  subscribe: jest.Mock;
  /** Records every leave, including the one the retry helper wraps. */
  leave: jest.Mock;
  unsubscribe: (timeout?: number) => Promise<string>;
  statusCallback: StatusCallback | null;
}

interface SupabaseMockModule {
  __channels: FakeChannel[];
}

jest.mock('@supabase/supabase-js', () => {
  const channels: FakeChannel[] = [];

  const makeChannel = (topic: string): FakeChannel => {
    const channel: FakeChannel = {
      topic,
      on: jest.fn(() => channel),
      subscribe: jest.fn((cb?: StatusCallback) => {
        channel.statusCallback = cb ?? null;
        return channel;
      }),
      leave: jest.fn(async () => 'ok'),
      unsubscribe: (timeout?: number) => channel.leave(timeout),
      statusCallback: null,
    };
    channels.push(channel);
    return channel;
  };

  const client = {
    channel: jest.fn((topic: string) => makeChannel(topic)),
    removeChannel: jest.fn((channel: FakeChannel) => channel.unsubscribe()),
    auth: { signOut: jest.fn(), setSession: jest.fn() },
    realtime: { setAuth: jest.fn() },
  };

  return {
    createClient: jest.fn(() => client),
    __channels: channels,
  };
});

import {
  computeRealtimeRetryDelayMs,
  subscribeToSalonBookings,
  subscribeToUserBookings,
  unsubscribeFromBookings,
} from '../../src/lib/supabase';

const fakeChannels = (jest.requireMock('@supabase/supabase-js') as SupabaseMockModule).__channels;

const lastChannel = (): FakeChannel => fakeChannels[fakeChannels.length - 1];

const emit = (status: string, err?: Error): void => {
  lastChannel().statusCallback?.(status, err);
};

describe('computeRealtimeRetryDelayMs', () => {
  const noJitter = () => 0;

  it('backs off exponentially from 1s', () => {
    expect(computeRealtimeRetryDelayMs(0, noJitter)).toBe(1000);
    expect(computeRealtimeRetryDelayMs(1, noJitter)).toBe(2000);
    expect(computeRealtimeRetryDelayMs(2, noJitter)).toBe(4000);
    expect(computeRealtimeRetryDelayMs(3, noJitter)).toBe(8000);
  });

  it('caps the delay at 30s no matter how many attempts failed', () => {
    expect(computeRealtimeRetryDelayMs(10, noJitter)).toBe(30000);
    expect(computeRealtimeRetryDelayMs(50, noJitter)).toBe(30000);
  });

  it('adds up to 20% jitter on top of the base delay', () => {
    expect(computeRealtimeRetryDelayMs(0, () => 1)).toBe(1200);
    expect(computeRealtimeRetryDelayMs(0, () => 0.5)).toBe(1100);
    expect(computeRealtimeRetryDelayMs(10, () => 1)).toBe(36000);
  });

  it('treats a negative attempt as the first attempt', () => {
    expect(computeRealtimeRetryDelayMs(-3, noJitter)).toBe(1000);
  });
});

describe('booking channel auto re-join', () => {
  beforeEach(() => {
    fakeChannels.length = 0;
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.spyOn(Math, 'random').mockReturnValue(0);
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('subscribes once up front', () => {
    subscribeToUserBookings('u1', jest.fn());
    expect(lastChannel().topic).toBe('user-bookings:u1');
    expect(lastChannel().subscribe).toHaveBeenCalledTimes(1);
  });

  it('re-subscribes 1s after CHANNEL_ERROR', async () => {
    subscribeToUserBookings('u1', jest.fn());
    const channel = lastChannel();

    emit('CHANNEL_ERROR', new Error('socket dropped'));
    await jest.advanceTimersByTimeAsync(999);
    expect(channel.subscribe).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(1);
    expect(channel.leave).toHaveBeenCalledTimes(1); // leave before re-join
    expect(channel.subscribe).toHaveBeenCalledTimes(2);
  });

  it('re-subscribes after TIMED_OUT too', async () => {
    subscribeToSalonBookings('s1', jest.fn());
    const channel = lastChannel();
    expect(channel.topic).toBe('salon-bookings:s1');

    emit('TIMED_OUT');
    await jest.advanceTimersByTimeAsync(1000);
    expect(channel.subscribe).toHaveBeenCalledTimes(2);
  });

  it('doubles the delay while failures continue', async () => {
    subscribeToUserBookings('u1', jest.fn());
    const channel = lastChannel();

    emit('CHANNEL_ERROR');
    await jest.advanceTimersByTimeAsync(1000);
    expect(channel.subscribe).toHaveBeenCalledTimes(2);

    emit('CHANNEL_ERROR');
    await jest.advanceTimersByTimeAsync(1000);
    expect(channel.subscribe).toHaveBeenCalledTimes(2); // still waiting: 2s this time
    await jest.advanceTimersByTimeAsync(1000);
    expect(channel.subscribe).toHaveBeenCalledTimes(3);
  });

  it('collapses repeated error callbacks into a single pending retry', async () => {
    subscribeToUserBookings('u1', jest.fn());
    const channel = lastChannel();

    emit('CHANNEL_ERROR');
    emit('CHANNEL_ERROR');
    emit('CHANNEL_ERROR');
    await jest.advanceTimersByTimeAsync(5000);
    expect(channel.subscribe).toHaveBeenCalledTimes(2);
  });

  it('resets the backoff once the channel is SUBSCRIBED again', async () => {
    subscribeToUserBookings('u1', jest.fn());
    const channel = lastChannel();

    emit('CHANNEL_ERROR');
    await jest.advanceTimersByTimeAsync(1000);
    emit('CHANNEL_ERROR');
    await jest.advanceTimersByTimeAsync(2000);
    expect(channel.subscribe).toHaveBeenCalledTimes(3);

    emit('SUBSCRIBED');
    emit('CHANNEL_ERROR');
    await jest.advanceTimersByTimeAsync(1000);
    expect(channel.subscribe).toHaveBeenCalledTimes(4);
  });

  it('does not retry after the caller removes the channel', async () => {
    const channel = subscribeToUserBookings('u1', jest.fn());
    const fake = lastChannel();

    emit('CHANNEL_ERROR');
    unsubscribeFromBookings(channel);

    expect(fake.leave).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(60000);
    expect(fake.subscribe).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('ignores a late error callback that arrives after teardown', async () => {
    const channel = subscribeToUserBookings('u1', jest.fn());
    const fake = lastChannel();

    unsubscribeFromBookings(channel);
    emit('CHANNEL_ERROR');

    await jest.advanceTimersByTimeAsync(60000);
    expect(fake.subscribe).toHaveBeenCalledTimes(1);
  });
});
