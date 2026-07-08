import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../../src/theme/ThemeContext';
import { DiscoverySettingsSection } from '../../src/components/DiscoverySettingsSection';

const mockUpdateProfile = jest.fn();
const mockSetUser = jest.fn();

jest.mock('../../src/services/authService', () => ({
  authService: {
    updateProfile: (...args: unknown[]) => mockUpdateProfile(...args),
  },
}));

jest.mock('../../src/store/authStore', () => {
  const store = {
    user: { id: 'u1', discovery_audience: 'auto' as const },
    token: 'tok',
  };
  const useAuthStore = (selector?: (s: typeof store & { setUser: typeof mockSetUser }) => unknown) => {
    const full = { ...store, setUser: mockSetUser };
    return typeof selector === 'function' ? selector(full) : full;
  };
  (useAuthStore as any).getState = () => ({
    ...store,
    setUser: mockSetUser,
  });
  return { useAuthStore };
});

jest.mock('../../src/store/toastStore', () => ({ showToast: jest.fn() }));

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function renderSection() {
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ThemeProvider>
        <DiscoverySettingsSection />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

describe('DiscoverySettingsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateProfile.mockResolvedValue({});
  });

  it('shows collapsed header with current preference subtitle', () => {
    renderSection();
    expect(screen.getByText('Salons shown near you')).toBeTruthy();
    expect(screen.getByText('Match my profile')).toBeTruthy();
    expect(screen.queryByTestId('discovery-pref-men')).toBeNull();
  });

  it('expands options on header tap', async () => {
    renderSection();
    await act(async () => {
      fireEvent.press(screen.getByText('Salons shown near you'));
    });
    expect(screen.getByTestId('discovery-pref-men')).toBeTruthy();
    expect(screen.getByText('Men')).toBeTruthy();
  });

  it('saves selection and collapses after choosing an option', async () => {
    renderSection();
    await act(async () => {
      fireEvent.press(screen.getByText('Salons shown near you'));
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('discovery-pref-women'));
    });
    expect(mockUpdateProfile).toHaveBeenCalledWith({ discovery_audience: 'women' });
    expect(screen.queryByTestId('discovery-pref-men')).toBeNull();
  });
});
