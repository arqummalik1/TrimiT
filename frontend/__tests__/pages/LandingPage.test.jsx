import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import LandingPage from '../../src/pages/LandingPage';
import { MemoryRouter } from 'react-router-dom';

// Mock child components
vi.mock('../../src/components/landing/sections/HeroSection', () => ({
  default: () => <div data-testid="hero-section">Hero Section</div>
}));

vi.mock('../../src/components/landing/sections/HowItWorksSection', () => ({
  default: () => <div data-testid="how-it-works-section">How It Works</div>
}));

vi.mock('../../src/components/landing/sections/FeaturedSalonsSection', () => ({
  default: () => <div data-testid="featured-salons-section">Featured Salons</div>
}));

vi.mock('../../src/components/landing/sections/AppDownloadSection', () => ({
  default: () => <div data-testid="app-download-section">App Download</div>
}));

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock IntersectionObserver for framer-motion
class IntersectionObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.IntersectionObserver = IntersectionObserverMock;

describe('LandingPage Component', () => {
  const queryClient = new QueryClient();

  it('renders all sections correctly', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByTestId('hero-section')).toBeInTheDocument();
    expect(screen.getByTestId('how-it-works-section')).toBeInTheDocument();
    expect(screen.getAllByTestId('featured-salons-section')[0]).toBeInTheDocument();
    expect(screen.getByTestId('app-download-section')).toBeInTheDocument();
  });
});
