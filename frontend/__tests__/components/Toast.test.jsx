import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Toast from '../../src/components/Toast';
import { useToastStore } from '../../src/store/toastStore';

// Mock the child component
vi.mock('../../src/components/ToastItem', () => ({
  default: ({ toast }) => <div data-testid={`toast-item-${toast.id}`}>{toast.message}</div>
}));

// Mock the store
vi.mock('../../src/store/toastStore', () => ({
  useToastStore: vi.fn()
}));

describe('Toast Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when there are no toasts', () => {
    vi.mocked(useToastStore).mockReturnValue({
      toasts: [],
      clearAll: vi.fn()
    });

    const { container } = render(<Toast />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a toast item', () => {
    const mockToasts = [
      { id: '1', message: 'First toast', position: 'top-right' }
    ];
    vi.mocked(useToastStore).mockReturnValue({
      toasts: mockToasts,
      clearAll: vi.fn()
    });

    render(<Toast />);
    
    const toastElement = screen.getByTestId('toast-item-1');
    expect(toastElement).toBeInTheDocument();
    expect(toastElement).toHaveTextContent('First toast');
  });

  it('shows clear all button when there are more than 2 toasts in a position', () => {
    const mockToasts = [
      { id: '1', message: 'T1', position: 'top-right' },
      { id: '2', message: 'T2', position: 'top-right' },
      { id: '3', message: 'T3', position: 'top-right' }
    ];
    
    vi.mocked(useToastStore).mockReturnValue({
      toasts: mockToasts,
      clearAll: vi.fn()
    });

    render(<Toast />);
    
    const clearButton = screen.getByText(/Clear all \(3\)/i);
    expect(clearButton).toBeInTheDocument();
  });

  it('does not show clear all button when there are 2 or fewer toasts', () => {
    const mockToasts = [
      { id: '1', message: 'T1', position: 'top-right' },
      { id: '2', message: 'T2', position: 'top-right' }
    ];
    
    vi.mocked(useToastStore).mockReturnValue({
      toasts: mockToasts,
      clearAll: vi.fn()
    });

    render(<Toast />);
    
    const clearButton = screen.queryByText(/Clear all/i);
    expect(clearButton).not.toBeInTheDocument();
  });
});
