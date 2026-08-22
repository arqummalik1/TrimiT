import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AppleSignInButton from '../../src/components/auth/AppleSignInButton';

const mockAppleSignIn = vi.fn();
const mockToastError = vi.fn();

vi.mock('../../src/store/authStore', () => ({
  useAuthStore: (selector) => selector({ appleSignIn: mockAppleSignIn }),
}));

vi.mock('../../src/store/toastStore', () => ({
  useToastStore: {
    getState: () => ({ error: mockToastError }),
  },
}));

describe('AppleSignInButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders default label', () => {
    render(<AppleSignInButton />);
    expect(screen.getByTestId('apple-signin')).toBeInTheDocument();
    expect(screen.getByText('Sign in with Apple')).toBeInTheDocument();
  });

  it('calls appleSignIn on click', async () => {
    mockAppleSignIn.mockResolvedValue({ success: true });
    render(<AppleSignInButton label="Sign up with Apple" />);
    fireEvent.click(screen.getByTestId('apple-signin'));
    await waitFor(() => {
      expect(mockAppleSignIn).toHaveBeenCalledTimes(1);
    });
  });

  it('shows a toast when appleSignIn fails', async () => {
    mockAppleSignIn.mockResolvedValue({ success: false, error: 'OAuth failed' });
    render(<AppleSignInButton />);
    fireEvent.click(screen.getByTestId('apple-signin'));
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('OAuth failed');
    });
  });
});
