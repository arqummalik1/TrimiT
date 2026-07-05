import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ManageCategories from '../../src/pages/owner/ManageCategories';

vi.mock('../../src/services/serviceCategoryService', () => ({
  default: {
    list: vi.fn(() =>
      Promise.resolve([
        { id: 'c1', name: 'Hair', service_count: 2 },
        { id: 'c2', name: 'Face', service_count: 0 },
      ]),
    ),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    quickStart: vi.fn(),
  },
}));

class IntersectionObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.IntersectionObserver = IntersectionObserverMock;

describe('ManageCategories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders categories with service counts', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ManageCategories />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Hair')).toBeInTheDocument();
    expect(screen.getByText('2 services')).toBeInTheDocument();
    expect(screen.getByTestId('delete-category-c2')).not.toBeDisabled();
    expect(screen.getByTestId('delete-category-c1')).toBeDisabled();
  });
});
