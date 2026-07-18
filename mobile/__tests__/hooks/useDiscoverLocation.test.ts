import { renderHook, act, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { useDiscoverLocation } from '../../src/hooks/useDiscoverLocation';

jest.mock('expo-location', () => ({
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Highest: 6 },
}));

describe('useDiscoverLocation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Location.getLastKnownPositionAsync as jest.Mock).mockResolvedValue(null);
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
      coords: { latitude: 28.61, longitude: 77.2, accuracy: 10 },
    });
  });

  it('requests OS permission directly when undetermined (no custom primer phase)', async () => {
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'undetermined' });
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });

    const { result } = renderHook(() => useDiscoverLocation());

    await act(async () => {
      await result.current.bootstrap();
    });

    await waitFor(() => {
      expect(result.current.locationReady).toBe(true);
    });

    expect(result.current.phase).toBe('ready');
    expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(result.current.coords).toEqual({ lat: 28.61, lng: 77.2 });
  });

  it('does not run bootstrap twice on repeated calls', async () => {
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });

    const { result } = renderHook(() => useDiscoverLocation());

    await act(async () => {
      await result.current.bootstrap();
      await result.current.bootstrap();
    });

    expect(Location.getCurrentPositionAsync).toHaveBeenCalledTimes(1);
  });

  it('marks ready without coords when permission denied', async () => {
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });

    const { result } = renderHook(() => useDiscoverLocation());

    await act(async () => {
      await result.current.bootstrap();
    });

    expect(result.current.locationReady).toBe(true);
    expect(result.current.coords).toBeNull();
    expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });
});
