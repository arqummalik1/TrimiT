import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from '../../src/store/authStore';
import api from '../../src/lib/api';
import { supabase } from '../../src/lib/supabase';
import { setPendingAuthIntent } from '../../src/lib/pendingAuthIntent';

// Mock dependencies
vi.mock('../../src/lib/api', () => ({
  default: {
    defaults: { headers: { common: {} } },
    post: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
  }
}));

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      signOut: vi.fn(),
      getSession: vi.fn(),
      setSession: vi.fn(),
      signInWithOAuth: vi.fn(),
      updateUser: vi.fn(),
    }
  }
}));

describe('authStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
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

  it('appleSignIn starts Supabase Apple OAuth redirect', async () => {
    supabase.auth.signInWithOAuth.mockResolvedValueOnce({ error: null });
    const store = useAuthStore.getState();
    const result = await store.appleSignIn();
    expect(result.success).toBe(true);
    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'apple',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
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

  it('preserves a first-time Apple object name without blocking profile bootstrap', async () => {
    api.get.mockResolvedValueOnce({
      data: { id: 'apple-1', email: 'relay@privaterelay.appleid.com', profile: null, profile_complete: false },
    });
    api.post.mockResolvedValueOnce({
      data: { profile: { id: 'apple-1', role: 'customer', name: 'Apple Person' } },
    });
    supabase.auth.updateUser.mockResolvedValueOnce({ error: null });

    const result = await useAuthStore.getState().hydrateFromSupabaseSession({
      access_token: 'apple-access',
      refresh_token: 'apple-refresh',
      user: { user_metadata: { name: { firstName: 'Apple', lastName: 'Person' } } },
    });

    expect(result.success).toBe(true);
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({
      data: { full_name: 'Apple Person', name: 'Apple Person' },
    });
    expect(api.post).toHaveBeenCalledWith('/auth/complete-profile', {
      role: 'customer',
      name: 'Apple Person',
      phone: undefined,
      upi_id: undefined,
      gender: undefined,
    });
  });

  it('completeProfile sends gender for customers', async () => {
    api.post.mockResolvedValueOnce({
      data: {
        profile: { role: 'customer', name: 'Alex', gender: 'female' },
      },
    });
    useAuthStore.setState({ user: { id: 'u1', email: 'a@test.com' } });

    const store = useAuthStore.getState();
    const result = await store.completeProfile({
      role: 'customer',
      name: 'Alex',
      gender: 'female',
    });

    expect(result.success).toBe(true);
    expect(api.post).toHaveBeenCalledWith('/auth/complete-profile', {
      role: 'customer',
      name: 'Alex',
      phone: undefined,
      upi_id: undefined,
      gender: 'female',
    });
    expect(useAuthStore.getState().profile.gender).toBe('female');
  });

  it('automatically bootstraps a new OTP customer without a profile form', async () => {
    api.post
      .mockResolvedValueOnce({
        data: {
          access_token: 'otp-access',
          refresh_token: 'otp-refresh',
          user: { id: 'u-new', email: 'new@example.com' },
          profile: null,
          profile_complete: false,
        },
      })
      .mockResolvedValueOnce({
        data: { profile: { id: 'u-new', role: 'customer', name: 'New' } },
      });

    const result = await useAuthStore.getState().verifyOtp(
      'new@example.com', '123456', 'magiclink',
    );

    expect(result.success).toBe(true);
    expect(result.profileComplete).toBe(true);
    expect(api.post).toHaveBeenNthCalledWith(2, '/auth/complete-profile', {
      role: 'customer',
      name: undefined,
      phone: undefined,
      upi_id: undefined,
      gender: undefined,
    });
    expect(useAuthStore.getState().profile.role).toBe('customer');
  });

  it('keeps a returning customer as customer during owner setup', async () => {
    setPendingAuthIntent({ kind: 'owner_onboarding' });
    api.post.mockResolvedValueOnce({
      data: {
        access_token: 'owner-access',
        refresh_token: 'owner-refresh',
        user: { id: 'u-owner' },
        profile: { id: 'u-owner', role: 'customer', name: 'Owner' },
      },
    });

    const result = await useAuthStore.getState().login('owner@example.com', 'password');

    expect(result.success).toBe(true);
    expect(result.profile.role).toBe('customer');
    expect(useAuthStore.getState().profile.role).toBe('customer');
    expect(api.post).not.toHaveBeenCalledWith('/auth/complete-profile', expect.anything());
  });

  it('updateProfile patches discovery_audience', async () => {
    api.patch.mockResolvedValueOnce({
      data: { profile: { role: 'customer', discovery_audience: 'men' } },
    });
    useAuthStore.setState({
      user: { id: 'u1' },
      profile: { role: 'customer', discovery_audience: 'auto' },
    });

    const store = useAuthStore.getState();
    const result = await store.updateProfile({ discovery_audience: 'men' });

    expect(result.success).toBe(true);
    expect(api.patch).toHaveBeenCalledWith('/auth/profile', { discovery_audience: 'men' });
    expect(useAuthStore.getState().profile.discovery_audience).toBe('men');
  });
});
