import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useServiceability } from '../../src/hooks/useServiceability';
import { serviceabilityService } from '../../src/services/serviceabilityService';

vi.mock('../../src/services/serviceabilityService', () => ({
  serviceabilityService: {
    check: vi.fn()
  }
}));

const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const wrapper = ({ children }) => (
  <QueryClientProvider client={createQueryClient()}>
    {children}
  </QueryClientProvider>
);

describe('useServiceability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not fetch when coords are not provided', () => {
    const { result } = renderHook(() => useServiceability(null), { wrapper });
    
    expect(result.current.fetchStatus).toBe('idle');
    expect(serviceabilityService.check).not.toHaveBeenCalled();
  });

  it('does not fetch when coords are incomplete', () => {
    const { result } = renderHook(() => useServiceability({ lat: 10 }), { wrapper });
    
    expect(result.current.fetchStatus).toBe('idle');
    expect(serviceabilityService.check).not.toHaveBeenCalled();
  });

  it('fetches when valid coords are provided', async () => {
    vi.mocked(serviceabilityService.check).mockResolvedValue({ isServiceable: true });
    
    const { result, waitForNextUpdate } = renderHook(
      () => useServiceability({ lat: 10, lng: 20 }), 
      { wrapper }
    );
    
    // We just verify it calls the service
    expect(serviceabilityService.check).toHaveBeenCalledWith({ lat: 10, lng: 20 });
  });

  it('respects the enabled flag', () => {
    const { result } = renderHook(
      () => useServiceability({ lat: 10, lng: 20 }, { enabled: false }), 
      { wrapper }
    );
    
    expect(result.current.fetchStatus).toBe('idle');
    expect(serviceabilityService.check).not.toHaveBeenCalled();
  });
});
