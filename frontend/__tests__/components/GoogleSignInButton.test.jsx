import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GoogleSignInButton from '../../src/components/auth/GoogleSignInButton';
import { useAuthStore } from '../../src/store/authStore';
import { useToastStore } from '../../src/store/toastStore';

vi.mock('../../src/store/authStore', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('../../src/store/toastStore', () => ({
  useToastStore: {
    getState: vi.fn(() => ({ error: vi.fn() })),
  },
}));

describe('GoogleSignInButton', () => {
  const mockGoogleSignIn = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.mockImplementation((selector) =>
      selector({ googleSignIn: mockGoogleSignIn }),
    );
  });

  it('renders the colorful Google mark and default label', () => {
    render(<GoogleSignInButton />);
    expect(screen.getByTestId('google-signin')).toBeInTheDocument();
    expect(screen.getByText('Sign in with Google')).toBeInTheDocument();
    expect(document.querySelector('svg path[fill="#4285F4"]')).toBeTruthy();
  });

  it('calls googleSignIn on click', async () => {
    mockGoogleSignIn.mockResolvedValue({ success: true });
    render(<GoogleSignInButton label="Sign up with Google" />);
    fireEvent.click(screen.getByTestId('google-signin'));
    await waitFor(() => {
      expect(mockGoogleSignIn).toHaveBeenCalledTimes(1);
    });
  });

  it('shows a toast when googleSignIn fails', async () => {
    const toastError = vi.fn();
    useToastStore.getState.mockReturnValue({ error: toastError });
    mockGoogleSignIn.mockResolvedValue({ success: false, error: 'OAuth failed' });

    render(<GoogleSignInButton />);
    fireEvent.click(screen.getByTestId('google-signin'));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith('OAuth failed');
    });
  });
});
