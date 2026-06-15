/**
 * Lifecycle tests for authStore — the audit's "gold standard" component.
 *
 * Contract under test (RULES §4): trust the persisted token, refresh in the
 * background, and ONLY a confirmed 401 clears the session. Network errors / 5xx
 * must keep the user logged in across cold starts.
 *
 * Collaborators are mocked at the module boundary so we exercise the store's
 * own state machine, not the network.
 */

const mockLogin = jest.fn();
const mockGetMe = jest.fn();
const mockVerifyOtp = jest.fn();
const mockCompleteProfile = jest.fn();

jest.mock('../src/repositories/authRepository', () => ({
  authRepository: {
    login: (...args: unknown[]) => mockLogin(...args),
    signup: jest.fn(),
    resendConfirmation: jest.fn(),
    updateProfile: jest.fn(),
    deleteAccount: jest.fn(),
    verifyOtp: (...args: unknown[]) => mockVerifyOtp(...args),
    completeProfile: (...args: unknown[]) => mockCompleteProfile(...args),
  },
  parseAuthFailure: (err: any) => ({
    message: err?.message ?? 'error',
    code: err?.code ?? 'unknown',
  }),
}));

jest.mock('../src/services/authService', () => ({
  authService: {
    getMe: (...args: unknown[]) => mockGetMe(...args),
    verifyOtp: jest.fn(),
    sendOtp: jest.fn(),
    forgotPassword: jest.fn(),
  },
}));

jest.mock('../src/services/apiClient', () => ({
  __esModule: true,
  default: { interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } } },
  setAuthToken: jest.fn(),
}));

jest.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: { signOut: jest.fn().mockResolvedValue(undefined) },
    realtime: { setAuth: jest.fn().mockResolvedValue(undefined) },
  },
  syncSupabaseAuthSession: jest.fn(),
}));

import { useAuthStore } from '../src/store/authStore';
import { setAuthToken } from '../src/services/apiClient';

const resetStore = () =>
  useAuthStore.setState({
    user: null,
    token: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: false,
    isSigningOut: false,
    sessionExpired: false,
    error: null,
    authBootstrapComplete: false,
    queryClient: null,
  });

beforeEach(() => {
  jest.clearAllMocks();
  resetStore();
});

describe('login', () => {
  it('sets user, token and isAuthenticated on success', async () => {
    mockLogin.mockResolvedValue({
      token: 'tok-1',
      refreshToken: 'ref-1',
      user: { id: 'u1', email: 'a@b.com', name: 'A' },
    });

    const result = await useAuthStore.getState().login('a@b.com', 'pw');

    expect(result.success).toBe(true);
    const s = useAuthStore.getState();
    expect(s.isAuthenticated).toBe(true);
    expect(s.token).toBe('tok-1');
    expect(s.user?.id).toBe('u1');
    expect(setAuthToken).toHaveBeenCalledWith('tok-1');
  });

  it('returns requiresEmailConfirmation without authenticating', async () => {
    mockLogin.mockResolvedValue({
      requiresEmailConfirmation: true,
      error: 'confirm your email',
    });

    const result = await useAuthStore.getState().login('a@b.com', 'pw');

    expect(result.requiresEmailConfirmation).toBe(true);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('surfaces an error and stays unauthenticated when token is missing', async () => {
    mockLogin.mockResolvedValue({ error: 'Invalid credentials' });

    const result = await useAuthStore.getState().login('a@b.com', 'bad');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid credentials');
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});

describe('initializeAuth', () => {
  it('with no token, completes bootstrap as unauthenticated', async () => {
    await useAuthStore.getState().initializeAuth();

    const s = useAuthStore.getState();
    expect(s.authBootstrapComplete).toBe(true);
    expect(s.isAuthenticated).toBe(false);
    expect(mockGetMe).not.toHaveBeenCalled();
  });

  it('with a persisted token, trusts it immediately (isAuthenticated before refresh)', async () => {
    useAuthStore.setState({ token: 'persisted', refreshToken: 'r' });
    mockGetMe.mockResolvedValue({ data: { profile: { id: 'u1', role: 'customer' } } });

    await useAuthStore.getState().initializeAuth();

    const s = useAuthStore.getState();
    expect(s.isAuthenticated).toBe(true);
    expect(s.authBootstrapComplete).toBe(true);
    expect(setAuthToken).toHaveBeenCalledWith('persisted');
  });

  it('keeps the user logged in when the background refresh fails with a network/5xx error', async () => {
    useAuthStore.setState({ token: 'persisted' });
    // Not an AppError with kind 'unauthorized' -> must NOT clear the session.
    mockGetMe.mockRejectedValue(new Error('Network Error'));

    await useAuthStore.getState().initializeAuth();
    // Let the fire-and-forget background refresh settle.
    await new Promise((r) => setImmediate(r));

    const s = useAuthStore.getState();
    expect(s.isAuthenticated).toBe(true);
    expect(s.sessionExpired).toBe(false);
  });

  it('clears the session only on a confirmed 401 (unauthorized AppError)', async () => {
    useAuthStore.setState({ token: 'persisted' });
    mockGetMe.mockRejectedValue({ kind: 'unauthorized', message: '401' });

    await useAuthStore.getState().initializeAuth();
    await new Promise((r) => setImmediate(r));

    const s = useAuthStore.getState();
    expect(s.isAuthenticated).toBe(false);
    expect(s.sessionExpired).toBe(true);
    expect(s.token).toBeNull();
  });
});

describe('logout', () => {
  it('clears auth state and detaches the token', async () => {
    useAuthStore.setState({
      user: { id: 'u1' } as any,
      token: 'tok',
      isAuthenticated: true,
    });

    await useAuthStore.getState().logout();

    const s = useAuthStore.getState();
    expect(s.isAuthenticated).toBe(false);
    expect(s.user).toBeNull();
    expect(s.token).toBeNull();
    expect(setAuthToken).toHaveBeenCalledWith(null);
  });
});

describe('verifyOtp', () => {
  it('handles verification for returning user (profileComplete=true)', async () => {
    const mockProfile = { id: 'u1', email: 'test@example.com', name: 'Existing User', role: 'customer' } as any;
    mockVerifyOtp.mockResolvedValue({
      token: 'access-tok',
      refreshToken: 'refresh-tok',
      profile: mockProfile,
      profileComplete: true,
      rawSession: { user: { id: 'u1' } },
    });

    const result = await useAuthStore.getState().verifyOtp('test@example.com', '123456', 'magiclink');

    expect(result.success).toBe(true);
    const s = useAuthStore.getState();
    expect(s.isAuthenticated).toBe(true);
    expect(s.profileComplete).toBe(true);
    expect(s.user).toEqual(mockProfile);
    expect(s.token).toBe('access-tok');
    expect(s.refreshToken).toBe('refresh-tok');
  });

  it('handles verification for new user (profileComplete=false)', async () => {
    mockVerifyOtp.mockResolvedValue({
      token: 'access-tok',
      refreshToken: 'refresh-tok',
      profile: null,
      profileComplete: false,
      rawSession: { user: { id: 'u2' } },
    });

    const result = await useAuthStore.getState().verifyOtp('new@example.com', '123456', 'magiclink');

    expect(result.success).toBe(true);
    const s = useAuthStore.getState();
    expect(s.isAuthenticated).toBe(true);
    expect(s.profileComplete).toBe(false);
    expect(s.user).toBeNull();
    expect(s.token).toBe('access-tok');
  });

  it('handles verification failure', async () => {
    mockVerifyOtp.mockResolvedValue({
      token: null,
      refreshToken: null,
      profile: null,
      profileComplete: false,
      error: 'Invalid code',
    });

    const result = await useAuthStore.getState().verifyOtp('new@example.com', '000000', 'magiclink');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid code');
    const s = useAuthStore.getState();
    expect(s.isAuthenticated).toBe(false);
    expect(s.error).toBe('Invalid code');
  });
});

describe('completeProfile', () => {
  it('handles profile completion success', async () => {
    const mockProfile = { id: 'u2', email: 'new@example.com', name: 'New User', role: 'customer' } as any;
    mockCompleteProfile.mockResolvedValue({
      success: true,
      profile: mockProfile,
    });

    useAuthStore.setState({ token: 'access-tok', isAuthenticated: true, profileComplete: false });

    const result = await useAuthStore.getState().completeProfile({
      role: 'customer',
      name: 'New User',
    });

    expect(result.success).toBe(true);
    const s = useAuthStore.getState();
    expect(s.profileComplete).toBe(true);
    expect(s.user).toEqual(mockProfile);
  });

  it('handles profile completion failure', async () => {
    mockCompleteProfile.mockResolvedValue({
      success: false,
      error: 'Creation failed',
    });

    useAuthStore.setState({ token: 'access-tok', isAuthenticated: true, profileComplete: false });

    const result = await useAuthStore.getState().completeProfile({
      role: 'customer',
      name: 'New User',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Creation failed');
    const s = useAuthStore.getState();
    expect(s.profileComplete).toBe(false);
    expect(s.error).toBe('Creation failed');
  });
});

