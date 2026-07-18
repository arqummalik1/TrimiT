import * as Location from 'expo-location';
import {
  LOCATION_PERMISSION_WAIT_MAX_MS,
  waitUntilForegroundLocationPermissionResolved,
} from '../../src/lib/locationPermission';

jest.mock('expo-location', () => ({
  getForegroundPermissionsAsync: jest.fn(),
}));

describe('waitUntilForegroundLocationPermissionResolved', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('resolves after permission leaves undetermined', async () => {
    (Location.getForegroundPermissionsAsync as jest.Mock)
      .mockResolvedValueOnce({ status: 'undetermined' })
      .mockResolvedValueOnce({ status: 'undetermined' })
      .mockResolvedValue({ status: 'granted' });

    const promise = waitUntilForegroundLocationPermissionResolved();

    await jest.advanceTimersByTimeAsync(400);
    await jest.advanceTimersByTimeAsync(400);
    await jest.advanceTimersByTimeAsync(600);

    await expect(promise).resolves.toBeUndefined();
    expect(Location.getForegroundPermissionsAsync).toHaveBeenCalledTimes(3);
  });

  it('stops polling when AbortSignal aborts', async () => {
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'undetermined',
    });
    const abort = new AbortController();
    const promise = waitUntilForegroundLocationPermissionResolved({
      signal: abort.signal,
    });

    await jest.advanceTimersByTimeAsync(400);
    abort.abort();

    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('returns after short maxWait when location stays undetermined', async () => {
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'undetermined',
    });

    const promise = waitUntilForegroundLocationPermissionResolved({
      maxWaitMs: 1_200,
    });

    await jest.advanceTimersByTimeAsync(1_600);
    await expect(promise).resolves.toBeUndefined();
    const getPerm = Location.getForegroundPermissionsAsync as jest.Mock;
    expect(getPerm.mock.calls.length).toBeLessThan(10);
    expect(LOCATION_PERMISSION_WAIT_MAX_MS).toBe(8_000);
  });
});
