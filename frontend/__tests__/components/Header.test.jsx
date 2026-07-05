import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Header from '../../src/components/Header';
import { useAuthStore } from '../../src/store/authStore';

// Mock dependencies
vi.mock('../../src/store/authStore', () => ({
  useAuthStore: vi.fn()
}));

vi.mock('../../src/components/brand/TrimitLogo', () => ({
  default: () => <div data-testid="trimit-logo">Logo</div>
}));

vi.mock('../../src/components/DownloadAppButton', () => ({
  default: () => <button data-testid="download-app-button">Download App</button>
}));

describe('Header Component', () => {
  const mockLogout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderHeader = () => {
    return render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );
  };

  it('renders correctly for unauthenticated users', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: false,
      profile: null,
      logout: mockLogout
    });

    renderHeader();

    expect(screen.getByTestId('trimit-logo')).toBeInTheDocument();
    
    // Should see marketing links
    expect(screen.getAllByText('Explore')[0]).toBeInTheDocument();
    expect(screen.getAllByText('For Salons')[0]).toBeInTheDocument();
    
    // Should see sign in / sign up
    expect(screen.getByTestId('login-btn')).toBeInTheDocument();
    expect(screen.getByTestId('signup-btn')).toBeInTheDocument();
  });

  it('renders correctly for authenticated customer', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: true,
      profile: { name: 'John Doe', role: 'customer' },
      logout: mockLogout
    });

    renderHeader();

    // Should see customer links
    expect(screen.getByTestId('nav-account')).toBeInTheDocument();
    expect(screen.getByTestId('nav-my-bookings')).toBeInTheDocument();
    
    // Should see user name and logout
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByTestId('logout-btn')).toBeInTheDocument();
  });

  it('renders correctly for authenticated owner', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: true,
      profile: { name: 'Jane Owner', role: 'owner' },
      logout: mockLogout
    });

    renderHeader();

    // Should see owner links
    expect(screen.getByTestId('nav-dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('nav-salon')).toBeInTheDocument();
    expect(screen.getByTestId('nav-bookings')).toBeInTheDocument();
    expect(screen.getByTestId('nav-services')).toBeInTheDocument();
    
    // Marketing link 'For Salons' should be hidden for owners
    expect(screen.queryByText('For Salons')).not.toBeInTheDocument();
  });

  it('calls logout when sign out is clicked', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: true,
      profile: { name: 'John Doe', role: 'customer' },
      logout: mockLogout
    });

    renderHeader();

    const logoutBtn = screen.getByTestId('logout-btn');
    fireEvent.click(logoutBtn);

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
