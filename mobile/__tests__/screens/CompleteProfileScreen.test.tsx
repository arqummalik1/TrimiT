import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../../src/theme/ThemeContext';
import CompleteProfileScreen from '../../src/screens/auth/CompleteProfileScreen';

const mockCompleteProfile = jest.fn();
const mockLogout = jest.fn();
const mockClearIntent = jest.fn();

const mockStore = {
  completeProfile: mockCompleteProfile,
  logout: mockLogout,
  isLoading: false,
  error: null as string | null,
  profileComplete: false,
};

jest.mock('../../src/store/authStore', () => ({
  useAuthStore: (selector: (state: typeof mockStore) => unknown) => selector(mockStore),
}));

jest.mock('../../src/store/pendingAuthIntentStore', () => ({
  usePendingAuthIntentStore: {
    getState: () => ({ clearIntent: mockClearIntent }),
  },
}));

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function renderScreen(navigation: any = { canGoBack: () => false, goBack: jest.fn() }) {
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ThemeProvider>
        <CompleteProfileScreen route={{ params: { prefilledRole: 'employee' } } as any} navigation={navigation} />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

describe('CompleteProfileScreen employee invitation claim', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStore.error = null;
    mockStore.isLoading = false;
    mockStore.profileComplete = false;
    mockCompleteProfile.mockResolvedValue({ success: true });
    mockLogout.mockResolvedValue(undefined);
  });

  it('asks only for the invited mobile number', () => {
    renderScreen();
    expect(screen.getByText('Connect to your salon')).toBeTruthy();
    expect(screen.getByPlaceholderText('+91 98765 43210')).toBeTruthy();
    expect(screen.getByText('Verify invitation')).toBeTruthy();
    expect(screen.queryByText('Customer')).toBeNull();
    expect(screen.queryByText('Business owner')).toBeNull();
  });

  it('validates the invited phone before calling the backend', async () => {
    renderScreen();
    fireEvent.press(screen.getByText('Verify invitation'));
    expect(await screen.findByText(/same 10-digit mobile number/i)).toBeTruthy();
    expect(mockCompleteProfile).not.toHaveBeenCalled();
  });

  it('submits a normalized employee invitation claim', async () => {
    renderScreen();
    fireEvent.changeText(screen.getByPlaceholderText('+91 98765 43210'), '9876543210');
    await act(async () => {
      fireEvent.press(screen.getByText('Verify invitation'));
    });
    await waitFor(() => {
      expect(mockCompleteProfile).toHaveBeenCalledWith({
        role: 'employee',
        phone: '+919876543210',
      });
    });
  });

  it('shows an invitation error returned by the backend', async () => {
    mockCompleteProfile.mockResolvedValue({ success: false, error: 'No pending invite found' });
    renderScreen();
    fireEvent.changeText(screen.getByPlaceholderText('+91 98765 43210'), '9876543210');
    await act(async () => {
      fireEvent.press(screen.getByText('Verify invitation'));
    });
    expect(await screen.findByText('No pending invite found')).toBeTruthy();
  });

  it('clears the intent and signs out when employee claim is cancelled', async () => {
    const navigation = { canGoBack: () => true, goBack: jest.fn() };
    renderScreen(navigation);
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Cancel employee sign in'));
    });
    expect(mockClearIntent).toHaveBeenCalled();
    expect(mockLogout).toHaveBeenCalled();
    expect(navigation.goBack).toHaveBeenCalled();
  });

  it('keeps an existing customer signed in when employee claim is cancelled', async () => {
    mockStore.profileComplete = true;
    const navigation = { canGoBack: () => true, goBack: jest.fn() };
    renderScreen(navigation);
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Cancel employee sign in'));
    });
    expect(mockClearIntent).toHaveBeenCalled();
    expect(mockLogout).not.toHaveBeenCalled();
    expect(navigation.goBack).toHaveBeenCalled();
  });
});
