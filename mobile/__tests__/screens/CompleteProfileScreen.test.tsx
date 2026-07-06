import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../../src/theme/ThemeContext';
import CompleteProfileScreen from '../../src/screens/auth/CompleteProfileScreen';

const mockCompleteProfile = jest.fn();
const mockLogout = jest.fn();
const mockClearError = jest.fn();

const mockStore = {
  completeProfile: mockCompleteProfile,
  logout: mockLogout,
  error: null as string | null,
  clearError: mockClearError,
};

jest.mock('../../src/store/authStore', () => {
  const useAuthStoreMock = (selector?: (s: any) => any) => {
    if (typeof selector === 'function') {
      return selector(mockStore);
    }
    return mockStore;
  };
  (useAuthStoreMock as any).getState = () => mockStore;
  return {
    useAuthStore: useAuthStoreMock,
  };
});

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function renderScreen(route: any) {
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ThemeProvider>
        <CompleteProfileScreen route={route} navigation={{} as any} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

describe('CompleteProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStore.error = null;
    mockCompleteProfile.mockResolvedValue({ success: true });
  });

  it('renders all form components', () => {
    const route = { params: {} } as any;
    renderScreen(route);

    expect(screen.getByText('Almost there!')).toBeTruthy();
    expect(screen.getByText("Let's finish setting up your profile")).toBeTruthy();
    expect(screen.getByText('Customer')).toBeTruthy();
    expect(screen.getByText('Business owner')).toBeTruthy();
    expect(screen.getByPlaceholderText('John Doe')).toBeTruthy();
    expect(screen.getByPlaceholderText('98765 43210')).toBeTruthy();
    expect(screen.getByText('Complete Setup')).toBeTruthy();
    expect(screen.getByText('Sign Out & Cancel')).toBeTruthy();
  });

  it('does NOT show the UPI field for customers but shows it for owners', () => {
    const route = { params: {} } as any;
    renderScreen(route);

    // Default role is customer → no UPI field.
    expect(screen.queryByPlaceholderText('glowsalon@okaxis')).toBeNull();

    // Switching to owner reveals the required UPI field.
    fireEvent.press(screen.getByText('Business owner'));
    expect(screen.getByPlaceholderText('glowsalon@okaxis')).toBeTruthy();
  });

  it('blocks owner submission without a UPI ID', async () => {
    const route = { params: {} } as any;
    renderScreen(route);

    fireEvent.changeText(screen.getByPlaceholderText('John Doe'), 'Owner Bob');
    fireEvent.press(screen.getByText('Business owner'));
    fireEvent.press(screen.getByText(/I agree to the/));

    await act(async () => {
      fireEvent.press(screen.getByText('Complete Setup'));
    });

    await waitFor(() => {
      expect(screen.getByText('UPI ID is required so customers can pay you')).toBeTruthy();
    });
    expect(mockCompleteProfile).not.toHaveBeenCalled();
  });

  it('rejects an invalid UPI ID for owners', async () => {
    const route = { params: {} } as any;
    renderScreen(route);

    fireEvent.changeText(screen.getByPlaceholderText('John Doe'), 'Owner Bob');
    fireEvent.press(screen.getByText('Business owner'));
    fireEvent.changeText(screen.getByPlaceholderText('glowsalon@okaxis'), 'not-a-upi');
    fireEvent.press(screen.getByText(/I agree to the/));

    await act(async () => {
      fireEvent.press(screen.getByText('Complete Setup'));
    });

    await waitFor(() => {
      expect(screen.getByText('Enter a valid UPI ID (e.g. glowsalon@okaxis)')).toBeTruthy();
    });
    expect(mockCompleteProfile).not.toHaveBeenCalled();
  });

  it('validates required fields on submit', async () => {
    const route = { params: {} } as any;
    renderScreen(route);

    const submitBtn = screen.getByText('Complete Setup');
    fireEvent.press(submitBtn);

    // Wait for react-hook-form validation
    await waitFor(() => {
      expect(screen.getByText('Name must be at least 2 characters')).toBeTruthy();
      expect(screen.getByText('You must accept the terms and conditions')).toBeTruthy();
    });

    expect(mockCompleteProfile).not.toHaveBeenCalled();
  });

  it('calls completeProfile with a UPI ID for owner signup', async () => {
    const route = { params: {} } as any;
    renderScreen(route);

    fireEvent.changeText(screen.getByPlaceholderText('John Doe'), 'Alice Test');
    fireEvent.changeText(screen.getByPlaceholderText('98765 43210'), '9876543210');
    fireEvent.press(screen.getByText('Business owner'));
    fireEvent.changeText(screen.getByPlaceholderText('glowsalon@okaxis'), 'glowsalon@okaxis');
    fireEvent.press(screen.getByText(/I agree to the/));

    await act(async () => {
      fireEvent.press(screen.getByText('Complete Setup'));
    });

    await waitFor(() => {
      expect(mockCompleteProfile).toHaveBeenCalledWith({
        name: 'Alice Test',
        phone: '+919876543210',
        role: 'owner',
        upi_id: 'glowsalon@okaxis',
      });
    });
  });

  it('calls completeProfile without UPI for a customer', async () => {
    const route = { params: {} } as any;
    renderScreen(route);

    fireEvent.changeText(screen.getByPlaceholderText('John Doe'), 'Cathy Cust');
    fireEvent.changeText(screen.getByPlaceholderText('98765 43210'), '9876543210');
    fireEvent.press(screen.getByTestId('profile-gender-female'));
    fireEvent.press(screen.getByText(/I agree to the/));

    await act(async () => {
      fireEvent.press(screen.getByText('Complete Setup'));
    });

    await waitFor(() => {
      expect(mockCompleteProfile).toHaveBeenCalledWith({
        name: 'Cathy Cust',
        phone: '+919876543210',
        role: 'customer',
        upi_id: undefined,
        gender: 'female',
      });
    });
  });

  it('calls logout when Sign Out & Cancel is pressed', () => {
    const route = { params: {} } as any;
    renderScreen(route);

    const cancelBtn = screen.getByText('Sign Out & Cancel');
    fireEvent.press(cancelBtn);

    expect(mockLogout).toHaveBeenCalled();
  });
});
