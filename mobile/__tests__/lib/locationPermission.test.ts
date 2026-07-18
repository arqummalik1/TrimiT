import * as Location from 'expo-location';
import { waitUntilForegroundLocationPermissionResolved } from '../../src/lib/locationPermission';

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
});
