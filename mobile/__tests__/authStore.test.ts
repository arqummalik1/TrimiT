import { useAuthStore } from '../src/store/authStore';

describe('authStore', () => {
  it('should initialize with default values', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBeFalsy();
    expect(typeof state.isHydrated).toBe('boolean');
  });

  it('should set user and token', () => {
    const mockUser = { id: '123', email: 'test@example.com', name: 'Test' } as any;
    const mockToken = 'mock-token';
    
    useAuthStore.getState().setUser(mockUser, mockToken);
    
    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.token).toBe(mockToken);
    expect(state.isAuthenticated).toBeTruthy();
  });
});
