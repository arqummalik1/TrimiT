/**
 * authStore — auth-flow state machine coverage (complements authStoreLifecycle).
 *
 * Collaborators mocked at the module boundary so we exercise the store's own
 * transitions: signup (customer/owner/confirmation/fail), sendOtp ok/fail,
 * forgotPassword, resendConfirmation, session teardown (clearSession /
 * sessionExpired / dismiss), persistence (partialize) and the role-based state
 * that drives navigation gating (items 1,2,5,6,11,12,13,16,17,18,19,20).
 *
 * NOTE: the store resolves authService + authRepository + authRateLimitMessages
 * via require() inside some actions, so the jest.mock factories below must match
 * the shapes those call sites read.
 */

const mockRepoLogin = jest.fn();
const mockRepoSignup = jest.fn();
const mockRepoResendConfirmation = jest.fn();
const mockRepoVerifyOtp = jest.fn();
const mockRepoCompleteProfile = jest.fn();
const mockRepoUpdateProfile = jest.fn();
const mockRepoDeleteAccount = jest.fn();

const mockSvcGetMe = jest.fn();
const mockSvcSendOtp = jest.fn();
const mockSvcForgotPassword = jest.fn();

jest.mock('../src/repositories/authRepository', () => ({
  authRepository: {
    login: (...a: unknown[]) => mockRepoLogin(...a),
    signup: (...a: unknown[]) => mockRepoSignup(...a),
    resendConfirmation: (...a: unknown[]) => mockRepoResendConfirmation(...a),
    verifyOtp: (...a: unknown[]) => mockRepoVerifyOtp(...a),
    completeProfile: (...a: unknown[]) => mockRepoCompleteProfile(...a),
    updateProfile: (...a: unknown[]) => mockRepoUpdateProfile(...a),
    deleteAccount: (...a: unknown[]) => mockRepoDeleteAccount(...a),
  },
  parseAuthFailure: (err: any) => ({
    message: err?.message ?? 'error',
    code: err?.code ?? 'UNKNOWN',
  }),
}));

jest.mock('../src/services/authService', () => ({
  authService: {
    getMe: (...a: unknown[]) => mockSvcGetMe(...a),
    sendOtp: (...a: unknown[]) => mockSvcSendOtp(...a),
    forgotPassword: (...a: unknown[]) => mockSvcForgotPassword(...a),
    verifyOtp: jest.fn(),
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
    requiresEmailConfirmation: false,
    profileComplete: false,
    authBootstrapComplete: false,
    queryClient: null,
  });

beforeEach(() => {
  jest.clearAllMocks();
  resetStore();
});

// ─── signup (items 1, 2) ──────────────────────────────────────────────────────
describe('authStore.signup', () => {
  it('authenticates a new customer and marks profile complete (item 1)', async () => {
    mockRepoSignup.mockResolvedValue({
      token: 'tok', refreshToken: 'ref',
      user: { id: 'c1', email: 'c@x.com', name: 'Cust', role: 'customer' },
    });

    const result = await useAuthStore.getState().signup('c@x.com', 'pw', 'Cust', '1', 'customer');

    expect(result.success).toBe(true);
    const s = useAuthStore.getState();
    expect(s.isAuthenticated).toBe(true);
    expect(s.profileComplete).toBe(true);
    expect(s.user?.role).toBe('customer');
    expect(setAuthToken).toHaveBeenCalledWith('tok');
  });

  it('authenticates a new owner (item 2)', async () => {
    mockRepoSignup.mockResolvedValue({
      token: 'tok', user: { id: 'o1', role: 'owner' },
    });

    await useAuthStore.getState().signup('o@x.com', 'pw', 'Own', '1', 'owner');

    expect(useAuthStore.getState().user?.role).toBe('owner');
  });

  it('returns requiresEmailConfirmation without authenticating', async () => {
    mockRepoSignup.mockResolvedValue({ requiresEmailConfirmation: true, accountReadyForLogin: false });

    const result = await useAuthStore.getState().signup('n@x.com', 'pw', 'N', '', 'customer');

    expect(result.success).toBe(true);
    expect(result.requiresEmailConfirmation).toBe(true);
    const s = useAuthStore.getState();
    expect(s.isAuthenticated).toBe(false);
    expect(s.requiresEmailConfirmation).toBe(true);
  });

  it('surfaces an error and stays unauthenticated when token is missing', async () => {
    mockRepoSignup.mockResolvedValue({ error: 'Signup failed', errorCode: 'SIGNUP_FAILED' });

    const result = await useAuthStore.getState().signup('n@x.com', 'pw', 'N', '', 'customer');

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('SIGNUP_FAILED');
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().error).toBe('Signup failed');
  });

  it('toggles isLoading off after completion', async () => {
    mockRepoSignup.mockResolvedValue({ token: 'tok', user: { id: 'c1', role: 'customer' } });
    await useAuthStore.getState().signup('c@x.com', 'pw', 'C', '', 'customer');
    expect(useAuthStore.getState().isLoading).toBe(false);
  });
});

// ─── sendOtp (items 5, 6) ─────────────────────────────────────────────────────
describe('authStore.sendOtp', () => {
  it('returns success when the service resolves (item 5)', async () => {
    mockSvcSendOtp.mockResolvedValue({ data: {} });

    const result = await useAuthStore.getState().sendOtp('user@x.com');

    expect(result.success).toBe(true);
    expect(mockSvcSendOtp).toHaveBeenCalledWith('user@x.com');
    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  it('returns a friendly error and stores it on failure (item 6)', async () => {
    mockSvcSendOtp.mockRejectedValue({ message: 'send blew up', code: 'NETWORK_ERROR' });

    const result = await useAuthStore.getState().sendOtp('user@x.com');

    expect(result.success).toBe(false);
    expect(result.error).toBe('send blew up');
    expect(useAuthStore.getState().error).toBe('send blew up');
    expect(useAuthStore.getState().isLoading).toBe(false);
  });
});

// ─── forgotPassword ───────────────────────────────────────────────────────────
describe('authStore.forgotPassword', () => {
  it('returns success when the email is dispatched', async () => {
    mockSvcForgotPassword.mockResolvedValue({ data: {} });

    const result = await useAuthStore.getState().forgotPassword('user@x.com');

    expect(result.success).toBe(true);
    expect(mockSvcForgotPassword).toHaveBeenCalledWith('user@x.com');
    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  it('returns a friendly error on failure', async () => {
    mockSvcForgotPassword.mockRejectedValue({ message: 'reset failed', code: 'UNKNOWN' });

    const result = await useAuthStore.getState().forgotPassword('user@x.com');

    expect(result.success).toBe(false);
    expect(result.error).toBe('reset failed');
  });

  it('returns the forgot-password cooldown copy when rate-limited', async () => {
    mockSvcForgotPassword.mockRejectedValue({ message: 'too many', code: 'RATE_LIMIT_EXCEEDED' });

    const result = await useAuthStore.getState().forgotPassword('user@x.com');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/password-reset emails/i);
  });
});

// ─── resendConfirmation (item 11 sibling) ─────────────────────────────────────
describe('authStore.resendConfirmation', () => {
  it('delegates to the repository and returns its result', async () => {
    mockRepoResendConfirmation.mockResolvedValue({ success: true, accountReadyForLogin: true });

    const result = await useAuthStore.getState().resendConfirmation('user@x.com');

    expect(result.success).toBe(true);
    expect(result.accountReadyForLogin).toBe(true);
    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  it('stores the error message on failure', async () => {
    mockRepoResendConfirmation.mockResolvedValue({ success: false, error: 'nope' });

    await useAuthStore.getState().resendConfirmation('user@x.com');

    expect(useAuthStore.getState().error).toBe('nope');
  });
});

// ─── verifyOtp recovery (item 7 variant) ──────────────────────────────────────
describe('authStore.verifyOtp recovery', () => {
  it('returns the raw session for a recovery verification', async () => {
    mockRepoVerifyOtp.mockResolvedValue({
      token: 'tok', refreshToken: 'ref', profile: null, profileComplete: false,
      rawSession: { access_token: 'reset-token' },
    });

    const result = await useAuthStore.getState().verifyOtp('user@x.com', '123456', 'recovery');

    expect(result.success).toBe(true);
    // new-user gating includes is_new_user on the session
    expect(result.session?.is_new_user).toBe(true);
    expect(useAuthStore.getState().profileComplete).toBe(false);
  });
});

// ─── session teardown (items 12, 13) ──────────────────────────────────────────
describe('clearSession / sessionExpired / dismiss', () => {
  it('clearSession with sessionExpired sets the expired flag and message', async () => {
    useAuthStore.setState({ user: { id: 'u1' } as any, token: 'tok', isAuthenticated: true });

    await useAuthStore.getState().clearSession({
      sessionExpired: true,
      errorMessage: 'Session expired. Please sign in again.',
    });

    const s = useAuthStore.getState();
    expect(s.isAuthenticated).toBe(false);
    expect(s.token).toBeNull();
    expect(s.sessionExpired).toBe(true);
    expect(s.error).toBe('Session expired. Please sign in again.');
    expect(setAuthToken).toHaveBeenCalledWith(null);
  });

  it('dismissSessionExpired clears the expired flag and error', () => {
    useAuthStore.setState({ sessionExpired: true, error: 'expired' });

    useAuthStore.getState().dismissSessionExpired();

    const s = useAuthStore.getState();
    expect(s.sessionExpired).toBe(false);
    expect(s.error).toBeNull();
  });

  it('logout is a no-op while a sign-out is already in progress', async () => {
    useAuthStore.setState({ isSigningOut: true, token: 'tok', isAuthenticated: true });

    await useAuthStore.getState().logout();

    // still has the token because the guard short-circuited
    expect(useAuthStore.getState().token).toBe('tok');
  });
});

// ─── role-based gating state (items 17, 18, 19) ───────────────────────────────
describe('navigation gating state', () => {
  it('new user via verifyOtp → authenticated but profileComplete=false (item 18)', async () => {
    mockRepoVerifyOtp.mockResolvedValue({
      token: 'tok', refreshToken: 'ref', profile: null, profileComplete: false,
      rawSession: { user: { id: 'u2' } },
    });

    await useAuthStore.getState().verifyOtp('new@x.com', '123456', 'magiclink');

    const s = useAuthStore.getState();
    // RootNavigator: isAuthenticated && !profileComplete → CompleteProfileScreen
    expect(s.isAuthenticated).toBe(true);
    expect(s.profileComplete).toBe(false);
    expect(s.user).toBeNull();
  });

  it('completeProfile flips profileComplete=true and sets owner role → OwnerTabs (item 19)', async () => {
    useAuthStore.setState({ isAuthenticated: true, profileComplete: false, token: 'tok' });
    mockRepoCompleteProfile.mockResolvedValue({
      success: true, profile: { id: 'o1', role: 'owner', email: 'o@x.com', name: 'Owner' },
    });

    await useAuthStore.getState().completeProfile({ role: 'owner', name: 'Owner' });

    const s = useAuthStore.getState();
    expect(s.profileComplete).toBe(true);
    expect(s.user?.role).toBe('owner');
  });

  it('returning customer via verifyOtp → profileComplete=true, customer role → CustomerTabs (item 19)', async () => {
    mockRepoVerifyOtp.mockResolvedValue({
      token: 'tok', refreshToken: 'ref', profileComplete: true,
      profile: { id: 'c1', role: 'customer', email: 'c@x.com', name: 'Cust' },
      rawSession: {},
    });

    await useAuthStore.getState().verifyOtp('c@x.com', '123456', 'magiclink');

    const s = useAuthStore.getState();
    expect(s.profileComplete).toBe(true);
    expect(s.user?.role).toBe('customer');
  });
});

// ─── persistence shape (item 20) ──────────────────────────────────────────────
describe('persistence (partialize)', () => {
  it('only persists the auth-critical keys', () => {
    const full = {
      user: { id: 'u1' }, token: 't', refreshToken: 'r', isAuthenticated: true,
      isOnboardingCompleted: true, profileComplete: true,
      // these must be dropped:
      isLoading: true, error: 'x', queryClient: {}, sessionExpired: true,
      requiresEmailConfirmation: true, isSigningOut: true, isHydrated: true,
      authBootstrapComplete: true,
    };
    const opts = (useAuthStore as any).persist.getOptions();
    const persisted = opts.partialize(full);

    expect(Object.keys(persisted).sort()).toEqual(
      ['isAuthenticated', 'isOnboardingCompleted', 'profileComplete', 'refreshToken', 'token', 'user'].sort()
    );
    expect(persisted).not.toHaveProperty('isLoading');
    expect(persisted).not.toHaveProperty('error');
    expect(persisted).not.toHaveProperty('queryClient');
  });

  it('uses the trimit-auth-storage persist key', () => {
    const opts = (useAuthStore as any).persist.getOptions();
    expect(opts.name).toBe('trimit-auth-storage');
  });

  it('completeOnboarding flips the persisted onboarding flag', () => {
    expect(useAuthStore.getState().isOnboardingCompleted).toBe(false);
    useAuthStore.getState().completeOnboarding();
    expect(useAuthStore.getState().isOnboardingCompleted).toBe(true);
  });
});
