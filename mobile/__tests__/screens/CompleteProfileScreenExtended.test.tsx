/**
 * CompleteProfileScreen — extended behavior coverage.
 *
 * Covers: role default (customer) + switching to owner (item 16 role selection),
 * name min-length validation, prefilled values, completeProfile failure → inline
 * error (item 15), and the customer happy path (item 14). authStore is mocked at
 * the module boundary.
 */
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
  const useAuthStoreMock = (selector?: (s: any) => any) =>
    typeof selector === 'function' ? selector(mockStore) : mockStore;
  (useAuthStoreMock as any).getState = () => mockStore;
  return { useAuthStore: useAuthStoreMock };
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

const acceptTerms = () => fireEvent.press(screen.getByText(/I agree to the/));
const selectCustomerGender = () => fireEvent.press(screen.getByTestId('profile-gender-male'));

// react-hook-form + zodResolver + themed render is heavy; under full-suite
// parallel CPU contention the first render can exceed the 5s default. Give
// these async submit tests headroom (logic is fast — this only guards flakiness).
jest.setTimeout(20000);

beforeEach(() => {
  jest.clearAllMocks();
  mockStore.error = null;
  mockCompleteProfile.mockResolvedValue({ success: true });
});

describe('CompleteProfileScreen — role selection (item 16)', () => {
  it('defaults the role to customer and submits it (item 14)', async () => {
    renderScreen({ params: {} } as any);

    fireEvent.changeText(screen.getByPlaceholderText('John Doe'), 'Cara Customer');
    selectCustomerGender();
    acceptTerms();
    await act(async () => {
      fireEvent.press(screen.getByText('Complete Setup'));
    });

    await waitFor(() => {
      expect(mockCompleteProfile).toHaveBeenCalledWith({
        name: 'Cara Customer',
        phone: undefined,
        role: 'customer',
        gender: 'male',
      });
    });
  });

  it('switches to owner when the Salon Owner card is selected', async () => {
    renderScreen({ params: {} } as any);

    fireEvent.press(screen.getByText('Salon Owner'));
    fireEvent.changeText(screen.getByPlaceholderText('John Doe'), 'Olive Owner');
    // Owners must provide a UPI ID (customers get paid directly to it).
    fireEvent.changeText(screen.getByPlaceholderText('glowsalon@okaxis'), 'olive@okaxis');
    acceptTerms();
    await act(async () => {
      fireEvent.press(screen.getByText('Complete Setup'));
    });

    await waitFor(() => {
      expect(mockCompleteProfile).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'owner', upi_id: 'olive@okaxis' })
      );
    });
  });

  it('can switch back to customer after selecting owner', async () => {
    renderScreen({ params: {} } as any);

    fireEvent.press(screen.getByText('Salon Owner'));
    fireEvent.press(screen.getByText('Customer'));
    fireEvent.changeText(screen.getByPlaceholderText('John Doe'), 'Switcher');
    selectCustomerGender();
    acceptTerms();
    await act(async () => {
      fireEvent.press(screen.getByText('Complete Setup'));
    });

    await waitFor(() => {
      expect(mockCompleteProfile).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'customer' })
      );
    });
  });
});

describe('CompleteProfileScreen — validation', () => {
  it('rejects a name shorter than 2 characters', async () => {
    renderScreen({ params: {} } as any);

    fireEvent.changeText(screen.getByPlaceholderText('John Doe'), 'A');
    acceptTerms();
    await act(async () => {
      fireEvent.press(screen.getByText('Complete Setup'));
    });

    await waitFor(() => {
      expect(screen.getByText('Name must be at least 2 characters')).toBeTruthy();
    });
    expect(mockCompleteProfile).not.toHaveBeenCalled();
  });

  it('requires the terms checkbox', async () => {
    renderScreen({ params: {} } as any);

    fireEvent.changeText(screen.getByPlaceholderText('John Doe'), 'Valid Name');
    await act(async () => {
      fireEvent.press(screen.getByText('Complete Setup'));
    });

    await waitFor(() => {
      expect(screen.getByText('You must accept the terms and conditions')).toBeTruthy();
    });
    expect(mockCompleteProfile).not.toHaveBeenCalled();
  });
});

describe('CompleteProfileScreen — prefilled params', () => {
  it('pre-populates name from route params', () => {
    renderScreen({ params: { prefilledName: 'Preset Name', prefilledRole: 'owner' } } as any);
    expect(screen.getByDisplayValue('Preset Name')).toBeTruthy();
  });
});

describe('CompleteProfileScreen — failure (item 15)', () => {
  it('renders the inline error when completeProfile fails', async () => {
    mockCompleteProfile.mockResolvedValue({ success: false, error: 'Profile creation failed' });
    renderScreen({ params: {} } as any);

    fireEvent.changeText(screen.getByPlaceholderText('John Doe'), 'Fail Case');
    selectCustomerGender();
    acceptTerms();
    await act(async () => {
      fireEvent.press(screen.getByText('Complete Setup'));
    });

    await waitFor(() => {
      expect(screen.getByText('Profile creation failed')).toBeTruthy();
    });
  });

  it('shows a stored store-level error', () => {
    mockStore.error = 'Server rejected the profile';
    renderScreen({ params: {} } as any);
    expect(screen.getByText('Server rejected the profile')).toBeTruthy();
  });
});
