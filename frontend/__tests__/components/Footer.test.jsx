import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Footer from '../../src/components/Footer';
import { useAuthStore } from '../../src/store/authStore';

// Mock dependencies
vi.mock('../../src/store/authStore', () => ({
  useAuthStore: vi.fn()
}));

vi.mock('../../src/components/brand/TrimitLogo', () => ({
  default: () => <div data-testid="trimit-logo">Logo</div>
}));

vi.mock('../../src/components/StoreDownloadLinks', () => ({
  default: () => <div data-testid="store-download-links">App Links</div>
}));

describe('Footer Component', () => {
  const renderFooter = () => {
    return render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );
  };

  it('renders correctly with default sections', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      profile: null
    });

    renderFooter();

    // Brand and logo
    expect(screen.getByTestId('trimit-logo')).toBeInTheDocument();
    
    // Discover Links
    expect(screen.getByText('Discover')).toBeInTheDocument();
    expect(screen.getAllByText('Explore marketplace')[0]).toBeInTheDocument();
    
    // Legal Links
    expect(screen.getByText('Legal & app')).toBeInTheDocument();
    expect(screen.getAllByText('Privacy Policy')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Terms & Conditions')[0]).toBeInTheDocument();
    
    // Store links
    expect(screen.getByTestId('store-download-links')).toBeInTheDocument();
  });

});
