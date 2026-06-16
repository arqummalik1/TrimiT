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
    expect(screen.getByText('Salon Owner')).toBeTruthy();
    expect(screen.getByPlaceholderText('John Doe')).toBeTruthy();
    expect(screen.getByPlaceholderText('98765 43210')).toBeTruthy();
    expect(screen.getByText('Complete Setup')).toBeTruthy();
    expect(screen.getByText('Sign Out & Cancel')).toBeTruthy();
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

  it('calls completeProfile with the correct data on successful submission', async () => {
    const route = { params: {} } as any;
    renderScreen(route);

    const nameInput = screen.getByPlaceholderText('John Doe');
    fireEvent.changeText(nameInput, 'Alice Test');

    const phoneInput = screen.getByPlaceholderText('98765 43210');
    fireEvent.changeText(phoneInput, '9876543210');

    // Select Owner role card
    const ownerCard = screen.getByText('Salon Owner');
    fireEvent.press(ownerCard);

    // Accept terms
    const checkboxLabel = screen.getByText(/I agree to the/);
    fireEvent.press(checkboxLabel);

    const submitBtn = screen.getByText('Complete Setup');
    await act(async () => {
      fireEvent.press(submitBtn);
    });

    await waitFor(() => {
      expect(mockCompleteProfile).toHaveBeenCalledWith({
        name: 'Alice Test',
        phone: '+919876543210',
        role: 'owner',
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
