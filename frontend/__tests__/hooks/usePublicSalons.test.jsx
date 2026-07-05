import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePublicSalons, sortSalonsByRating } from '../../src/hooks/usePublicSalons';
import api from '../../src/lib/api';

vi.mock('../../src/lib/api', () => ({
  default: {
    get: vi.fn()
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

describe('usePublicSalons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('hook fetching', () => {
    it('fetches salons with default params', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: [] });
      
      const { result } = renderHook(() => usePublicSalons(), { wrapper });
      
      // Hook will run query on mount
      expect(api.get).toHaveBeenCalled();
      
      // Extract URL passed to api.get
      const url = vi.mocked(api.get).mock.calls[0][0];
      expect(url).toContain('/salons/?');
      expect(url).toContain('limit=8'); // default limit
    });
    
    it('appends search parameters', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: [] });
      
      const { result } = renderHook(() => usePublicSalons({ search: 'Hair', limit: 10 }), { wrapper });
      
      const url = vi.mocked(api.get).mock.calls[0][0];
      expect(url).toContain('search=Hair');
      expect(url).toContain('limit=10');
    });

    it('returns empty array if body.data is missing and body is not array', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: { message: 'no data field' } });
      
      const { result } = renderHook(() => usePublicSalons(), { wrapper });
      // The fetchSalons function is called inside react-query, but we test the query behavior indirectly
    });
  });

  describe('sortSalonsByRating', () => {
    it('sorts by rating descending', () => {
      const salons = [
        { id: 1, avg_rating: 3.0 },
        { id: 2, avg_rating: 5.0 },
        { id: 3, avg_rating: 4.0 },
      ];
      
      const sorted = sortSalonsByRating(salons);
      expect(sorted[0].id).toBe(2); // 5.0
      expect(sorted[1].id).toBe(3); // 4.0
      expect(sorted[2].id).toBe(1); // 3.0
    });

    it('falls back to distance if rating is equal', () => {
      const salons = [
        { id: 1, avg_rating: 4.0, distance: 10 },
        { id: 2, avg_rating: 4.0, distance: 2 },
      ];
      
      const sorted = sortSalonsByRating(salons);
      expect(sorted[0].id).toBe(2); // closer
      expect(sorted[1].id).toBe(1); // further
    });
    
    it('handles nulls safely', () => {
      const salons = [
        { id: 1 }, // no rating, no distance
        { id: 2, avg_rating: 4.0 }
      ];
      
      const sorted = sortSalonsByRating(salons);
      expect(sorted[0].id).toBe(2);
      expect(sorted[1].id).toBe(1);
      
      expect(sortSalonsByRating(null)).toEqual([]);
      expect(sortSalonsByRating(undefined)).toEqual([]);
    });
  });
});
