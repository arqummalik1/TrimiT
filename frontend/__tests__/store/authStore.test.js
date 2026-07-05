import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from '../../src/store/authStore';
import api from '../../src/lib/api';
import { supabase } from '../../src/lib/supabase';

// Mock dependencies
vi.mock('../../src/lib/api', () => ({
  default: {
    defaults: { headers: { common: {} } },
    post: vi.fn(),
    get: vi.fn(),
  }
}));

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      signOut: vi.fn(),
      getSession: vi.fn(),
      setSession: vi.fn(),
      signInWithOAuth: vi.fn(),
    }
  }
}));

describe('authStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: null,
      profile: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      isInitializing: false,
      hasSalon: false,
      profileComplete: false,
      error: null,
    });
  });

  it('initializes with default state', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(false);
  });

  it('setUser updates state and api headers', () => {
    const store = useAuthStore.getState();
    const mockUser = { id: 1, email: 'test@example.com' };
    const mockProfile = { name: 'Test User' };
    
    store.setUser(mockUser, mockProfile, 'mock-token', 'mock-refresh');
    
    const updated = useAuthStore.getState();
    expect(updated.user).toEqual(mockUser);
    expect(updated.profile).toEqual(mockProfile);
    expect(updated.token).toBe('mock-token');
    expect(updated.refreshToken).toBe('mock-refresh');
    expect(updated.isAuthenticated).toBe(true);
    
    // Check if API header was set
    expect(api.defaults.headers.common['Authorization']).toBe('Bearer mock-token');
  });

  it('login with valid credentials', async () => {
    const mockResponse = {
      data: {
        access_token: 'valid-token',
        refresh_token: 'refresh-token',
        user: { id: 1 },
        profile: { role: 'customer' }
      }
    };
    api.post.mockResolvedValueOnce(mockResponse);
    
    const store = useAuthStore.getState();
    const result = await store.login('test@example.com', 'password');
    
    expect(result.success).toBe(true);
    const updated = useAuthStore.getState();
    expect(updated.isAuthenticated).toBe(true);
    expect(updated.token).toBe('valid-token');
    expect(updated.isLoading).toBe(false);
    expect(updated.error).toBeNull();
  });

  it('login handles errors correctly', async () => {
    const mockError = {
      response: { data: { detail: 'Invalid login credentials' } }
    };
    api.post.mockRejectedValueOnce(mockError);
    
    const store = useAuthStore.getState();
    const result = await store.login('test@example.com', 'wrongpassword');
    
    expect(result.success).toBe(false);
    const updated = useAuthStore.getState();
    expect(updated.isAuthenticated).toBe(false);
    expect(updated.isLoading).toBe(false);
    expect(updated.error).toContain('incorrect'); // Matches translated error
  });

  it('logout clears state and auth headers', async () => {
    // Setup authenticated state
    useAuthStore.setState({
      user: { id: 1 },
      token: 'some-token',
      isAuthenticated: true
    });
    api.defaults.headers.common['Authorization'] = 'Bearer some-token';
    supabase.auth.signOut.mockResolvedValueOnce();

    const store = useAuthStore.getState();
    await store.logout();

    const updated = useAuthStore.getState();
    expect(updated.user).toBeNull();
    expect(updated.token).toBeNull();
    expect(updated.isAuthenticated).toBe(false);
    expect(api.defaults.headers.common['Authorization']).toBeUndefined();
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  it('googleSignIn starts Supabase OAuth redirect', async () => {
    supabase.auth.signInWithOAuth.mockResolvedValueOnce({ error: null });
    const store = useAuthStore.getState();
    const result = await store.googleSignIn();
    expect(result.success).toBe(true);
    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: 'select_account' },
      },
    });
  });

  it('hydrateFromSupabaseSession loads profile via /auth/me', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        id: 'user-1',
        email: 'test@example.com',
        profile: { role: 'customer', name: 'Test' },
        profile_complete: true,
      },
    });
    const store = useAuthStore.getState();
    const result = await store.hydrateFromSupabaseSession({
      access_token: 'google-access',
      refresh_token: 'google-refresh',
    });
    expect(result.success).toBe(true);
    expect(result.profileComplete).toBe(true);
    expect(supabase.auth.setSession).toHaveBeenCalledWith({
      access_token: 'google-access',
      refresh_token: 'google-refresh',
    });
    expect(useAuthStore.getState().token).toBe('google-access');
  });
});
