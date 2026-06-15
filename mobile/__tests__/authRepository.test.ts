/**
 * Unit tests for authRepository — domain logic, response normalization,
 * session side-effects, and the parseAuthFailure / translateMobileAuthError
 * branch tables.
 *
 * authService is mocked at the module boundary so we exercise the repository's
 * own decision-making (HTTP 202 confirmation, /auth/me enrichment, profile
 * gating, error-code mapping) without a network. setAuthToken is asserted as
 * the session side-effect.
 *
 * Covers mandatory items: 1,2 (signup customer/owner), 3,4 (login), 7,8
 * (verify ok/fail), 9,10 (invalid/expired OTP -> friendly copy), 14,15
 * (completeProfile ok/fail).
 */

const mockLogin = jest.fn();
const mockSignup = jest.fn();
const mockGetMe = jest.fn();
const mockVerifyOtp = jest.fn();
const mockCompleteProfile = jest.fn();
const mockResendConfirmation = jest.fn();
const mockUpdateProfile = jest.fn();
const mockDeleteAccount = jest.fn();

jest.mock('../src/services/authService', () => ({
  authService: {
    login: (...a: unknown[]) => mockLogin(...a),
    signup: (...a: unknown[]) => mockSignup(...a),
    getMe: (...a: unknown[]) => mockGetMe(...a),
    verifyOtp: (...a: unknown[]) => mockVerifyOtp(...a),
    completeProfile: (...a: unknown[]) => mockCompleteProfile(...a),
    resendConfirmation: (...a: unknown[]) => mockResendConfirmation(...a),
    updateProfile: (...a: unknown[]) => mockUpdateProfile(...a),
    deleteAccount: (...a: unknown[]) => mockDeleteAccount(...a),
  },
}));

jest.mock('../src/services/apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
  setAuthToken: jest.fn(),
}));

import { authRepository, parseAuthFailure } from '../src/repositories/authRepository';
import { setAuthToken } from '../src/services/apiClient';

const PROFILE = (over: Record<string, unknown> = {}) => ({
  id: 'u1',
  email: 'user@example.com',
  name: 'User',
  role: 'customer',
  created_at: '2026-01-01',
  ...over,
});

/** Build an AppError-shaped object (isAppError checks 'kind' + 'message'). */
const appError = (kind: string, message: string, extra: Record<string, unknown> = {}) => ({
  kind,
  message,
  ...extra,
});

/** Build an axios-shaped error (jest.setup: isAxiosError = !!err.isAxiosError). */
const axiosError = (data: unknown) => ({ isAxiosError: true, response: { data } });

beforeEach(() => jest.clearAllMocks());

// ─── parseAuthFailure / translateMobileAuthError ──────────────────────────────
describe('parseAuthFailure', () => {
  it('maps invalid OTP message to friendly copy (item 9)', () => {
    const { message, code } = parseAuthFailure(appError('validation', 'Invalid OTP', { code: 'BAD_OTP' }));
    expect(message).toMatch(/invalid or has expired/i);
    expect(code).toBe('BAD_OTP');
  });

  it('maps expired OTP message to the same friendly copy (item 10)', () => {
    const { message } = parseAuthFailure(appError('validation', 'expired otp'));
    expect(message).toMatch(/invalid or has expired/i);
  });

  it('maps "invalid login credentials" to credentials copy', () => {
    const { message } = parseAuthFailure(appError('validation', 'Invalid login credentials'));
    expect(message).toMatch(/email address or password you entered is incorrect/i);
  });

  it('maps rate-limit phrases to throttling copy', () => {
    const { message } = parseAuthFailure(appError('rate_limit', 'Too many requests'));
    expect(message).toMatch(/too many requests/i);
  });

  it('maps network/timeout phrases to connectivity copy', () => {
    const { message } = parseAuthFailure(appError('network', 'Network Error'));
    expect(message).toMatch(/trouble connecting/i);
  });

  it('reads nested details.code/message from an AppError', () => {
    const err = appError('validation', 'outer', { code: 'OUTER', details: { code: 'INNER', message: 'inner msg' } });
    const { code } = parseAuthFailure(err);
    expect(code).toBe('INNER');
  });

  it('extracts code+message from an axios error envelope', () => {
    const { message, code } = parseAuthFailure(
      axiosError({ error: { details: { code: 'EMAIL_NOT_CONFIRMED', message: 'confirm first' } } })
    );
    expect(code).toBe('EMAIL_NOT_CONFIRMED');
    expect(message).toBe('confirm first');
  });

  it('extracts string detail from an axios error', () => {
    const { message } = parseAuthFailure(axiosError({ detail: 'Something specific failed' }));
    expect(message).toBe('Something specific failed');
  });

  it('falls back to NETWORK_ERROR for unknown error shapes', () => {
    const { code, message } = parseAuthFailure('totally unexpected');
    expect(code).toBe('NETWORK_ERROR');
    expect(message).toMatch(/trouble connecting/i);
  });

  it('passes through an unrecognized message verbatim', () => {
    const { message } = parseAuthFailure(appError('unknown', 'A very specific server reason'));
    expect(message).toBe('A very specific server reason');
  });
});

// ─── login (items 3, 4) ───────────────────────────────────────────────────────
describe('authRepository.login', () => {
  it('returns enriched user from /auth/me on success and sets token (customer)', async () => {
    mockLogin.mockResolvedValue({ data: { access_token: 'tok', refresh_token: 'ref' } });
    mockGetMe.mockResolvedValue({ data: { profile: PROFILE({ role: 'customer' }) } });

    const result = await authRepository.login('user@example.com', 'pw');

    expect(result.token).toBe('tok');
    expect(result.refreshToken).toBe('ref');
    expect(result.user?.role).toBe('customer');
    expect(setAuthToken).toHaveBeenCalledWith('tok');
  });

  it('returns owner role from /auth/me (item 4)', async () => {
    mockLogin.mockResolvedValue({ data: { access_token: 'tok' } });
    mockGetMe.mockResolvedValue({ data: { profile: PROFILE({ role: 'owner' }) } });

    const result = await authRepository.login('owner@example.com', 'pw');

    expect(result.user?.role).toBe('owner');
  });

  it('falls back to login-response profile when /auth/me throws', async () => {
    mockLogin.mockResolvedValue({ data: { access_token: 'tok', profile: PROFILE({ id: 'u9' }) } });
    mockGetMe.mockRejectedValue(new Error('me failed'));

    const result = await authRepository.login('user@example.com', 'pw');

    expect(result.user?.id).toBe('u9');
    expect(result.token).toBe('tok');
  });

  it('maps EMAIL_NOT_CONFIRMED to requiresEmailConfirmation', async () => {
    mockLogin.mockRejectedValue(
      axiosError({ error: { details: { code: 'EMAIL_NOT_CONFIRMED', message: 'confirm first' } } })
    );

    const result = await authRepository.login('user@example.com', 'pw');

    expect(result.requiresEmailConfirmation).toBe(true);
    expect(result.errorCode).toBe('EMAIL_NOT_CONFIRMED');
    expect(result.token).toBeNull();
  });

  it('maps a NETWORK_ERROR login failure to LOGIN_FAILED', async () => {
    mockLogin.mockRejectedValue('boom');

    const result = await authRepository.login('user@example.com', 'pw');

    expect(result.token).toBeNull();
    expect(result.errorCode).toBe('LOGIN_FAILED');
    expect(result.error).toMatch(/trouble connecting/i);
  });

  it('errors when response has no access_token', async () => {
    mockLogin.mockResolvedValue({ data: {} });

    const result = await authRepository.login('user@example.com', 'pw');

    expect(result.token).toBeNull();
    expect(result.errorCode).toBe('LOGIN_FAILED');
  });

  it('errors when token present but profile cannot be loaded anywhere', async () => {
    mockLogin.mockResolvedValue({ data: { access_token: 'tok' } });
    mockGetMe.mockRejectedValue(new Error('me failed'));

    const result = await authRepository.login('user@example.com', 'pw');

    expect(result.token).toBe('tok');
    expect(result.user).toBeNull();
    expect(result.errorCode).toBe('LOGIN_FAILED');
  });
});

// ─── signup (items 1, 2) ──────────────────────────────────────────────────────
describe('authRepository.signup', () => {
  it('returns requiresEmailConfirmation on HTTP 202', async () => {
    mockSignup.mockResolvedValue({
      status: 202,
      data: { code: 'EMAIL_CONFIRMATION_REQUIRED', message: 'check your email' },
    });

    const result = await authRepository.signup({
      email: 'new@example.com', password: 'pw', name: 'New', role: 'customer',
    });

    expect(result.requiresEmailConfirmation).toBe(true);
    expect(result.accountReadyForLogin).toBe(false);
  });

  it('flags accountReadyForLogin for SIGNUP_READY_SIGN_IN', async () => {
    mockSignup.mockResolvedValue({
      status: 202,
      data: { code: 'SIGNUP_READY_SIGN_IN', message: 'sign in now' },
    });

    const result = await authRepository.signup({
      email: 'new@example.com', password: 'pw', name: 'New', role: 'customer',
    });

    expect(result.requiresEmailConfirmation).toBe(true);
    expect(result.accountReadyForLogin).toBe(true);
  });

  it('enriches the new customer profile via /auth/me on 200 (item 1)', async () => {
    mockSignup.mockResolvedValue({ status: 200, data: { session: { access_token: 'tok', refresh_token: 'ref' } } });
    mockGetMe.mockResolvedValue({ data: { profile: PROFILE({ role: 'customer' }) } });

    const result = await authRepository.signup({
      email: 'new@example.com', password: 'pw', name: 'New', role: 'customer',
    });

    expect(result.user?.role).toBe('customer');
    expect(result.token).toBe('tok');
    expect(setAuthToken).toHaveBeenCalledWith('tok');
  });

  it('enriches the new owner profile via /auth/me on 200 (item 2)', async () => {
    mockSignup.mockResolvedValue({ status: 200, data: { session: { access_token: 'tok' } } });
    mockGetMe.mockResolvedValue({ data: { profile: PROFILE({ role: 'owner' }) } });

    const result = await authRepository.signup({
      email: 'owner@example.com', password: 'pw', name: 'Owner', role: 'owner',
    });

    expect(result.user?.role).toBe('owner');
  });

  it('falls back to local profile when /auth/me fails after signup', async () => {
    mockSignup.mockResolvedValue({ status: 200, data: { session: { access_token: 'tok' }, user: { id: 'u5' } } });
    mockGetMe.mockRejectedValue(new Error('me failed'));

    const result = await authRepository.signup({
      email: 'owner@example.com', password: 'pw', name: 'Owner', phone: '12', role: 'owner',
    });

    expect(result.user?.id).toBe('u5');
    expect(result.user?.role).toBe('owner');
    expect(result.user?.name).toBe('Owner');
  });

  it('errors when 200 returns no session', async () => {
    mockSignup.mockResolvedValue({ status: 200, data: {} });

    const result = await authRepository.signup({
      email: 'new@example.com', password: 'pw', name: 'New', role: 'customer',
    });

    expect(result.token).toBeNull();
    expect(result.errorCode).toBe('SIGNUP_FAILED');
  });

  it('maps a rate-limited signup failure to friendly cooldown copy', async () => {
    mockSignup.mockRejectedValue(appError('rate_limit', 'too many', { code: 'EMAIL_RATE_LIMIT' }));

    const result = await authRepository.signup({
      email: 'new@example.com', password: 'pw', name: 'New', role: 'customer',
    });

    expect(result.errorCode).toBe('EMAIL_RATE_LIMIT');
    expect(result.error).toMatch(/about an hour/i);
  });
});

// ─── verifyOtp (items 7, 8) ───────────────────────────────────────────────────
describe('authRepository.verifyOtp', () => {
  it('returns profile + profileComplete=true for a returning user (item 7)', async () => {
    mockVerifyOtp.mockResolvedValue({
      data: { access_token: 'tok', refresh_token: 'ref', profile_complete: true, profile: PROFILE() },
    });

    const result = await authRepository.verifyOtp('user@example.com', '123456', 'magiclink');

    expect(result.token).toBe('tok');
    expect(result.profileComplete).toBe(true);
    expect(result.profile?.id).toBe('u1');
  });

  it('returns null profile when profile_complete=false (new user)', async () => {
    mockVerifyOtp.mockResolvedValue({
      data: { access_token: 'tok', refresh_token: 'ref', profile_complete: false },
    });

    const result = await authRepository.verifyOtp('new@example.com', '123456', 'magiclink');

    expect(result.profileComplete).toBe(false);
    expect(result.profile).toBeNull();
    expect(result.rawSession).toBeDefined();
  });

  it('defaults profileComplete to false when the flag is absent', async () => {
    mockVerifyOtp.mockResolvedValue({ data: { access_token: 'tok' } });

    const result = await authRepository.verifyOtp('new@example.com', '123456', 'magiclink');

    expect(result.profileComplete).toBe(false);
  });

  it('maps an invalid/expired OTP error to friendly copy (item 8)', async () => {
    mockVerifyOtp.mockRejectedValue(appError('validation', 'Invalid or expired OTP', { code: 'OTP_INVALID' }));

    const result = await authRepository.verifyOtp('user@example.com', '000000', 'magiclink');

    expect(result.token).toBeNull();
    expect(result.errorCode).toBe('OTP_INVALID');
    expect(result.error).toMatch(/invalid or has expired/i);
  });
});

// ─── completeProfile (items 14, 15) ───────────────────────────────────────────
describe('authRepository.completeProfile', () => {
  it('returns the normalized profile on success (item 14)', async () => {
    mockCompleteProfile.mockResolvedValue({ data: { profile: PROFILE({ role: 'owner' }) } });

    const result = await authRepository.completeProfile({ role: 'owner', name: 'Owner' });

    expect(result.success).toBe(true);
    expect(result.profile?.role).toBe('owner');
  });

  it('returns PROFILE_CREATE_FAILED when the profile cannot be normalized', async () => {
    mockCompleteProfile.mockResolvedValue({ data: { profile: { /* no id */ } } });

    const result = await authRepository.completeProfile({ role: 'customer', name: 'X' });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('PROFILE_CREATE_FAILED');
  });

  it('maps a thrown error to friendly copy (item 15)', async () => {
    mockCompleteProfile.mockRejectedValue(appError('server', 'boom', { code: 'PROFILE_CREATION_FAILED' }));

    const result = await authRepository.completeProfile({ role: 'customer', name: 'X' });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('PROFILE_CREATION_FAILED');
  });
});

// ─── resendConfirmation ───────────────────────────────────────────────────────
describe('authRepository.resendConfirmation', () => {
  it('returns success and accountReadyForLogin for SIGNUP_READY_SIGN_IN', async () => {
    mockResendConfirmation.mockResolvedValue({ data: { code: 'SIGNUP_READY_SIGN_IN', message: 'ready' } });

    const result = await authRepository.resendConfirmation('user@example.com');

    expect(result.success).toBe(true);
    expect(result.accountReadyForLogin).toBe(true);
  });

  it('returns success without ready flag for a normal confirmation send', async () => {
    mockResendConfirmation.mockResolvedValue({ data: { message: 'sent' } });

    const result = await authRepository.resendConfirmation('user@example.com');

    expect(result.success).toBe(true);
    expect(result.accountReadyForLogin).toBe(false);
  });

  it('maps a rate-limited resend to the resend cooldown copy', async () => {
    mockResendConfirmation.mockRejectedValue(appError('rate_limit', 'too many', { code: 'EMAIL_RATE_LIMIT' }));

    const result = await authRepository.resendConfirmation('user@example.com');

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('EMAIL_RATE_LIMIT');
    expect(result.error).toMatch(/paused for about an hour/i);
  });
});

// ─── updateProfile / deleteAccount ────────────────────────────────────────────
describe('authRepository.updateProfile', () => {
  it('returns the patched fields after a successful update', async () => {
    mockUpdateProfile.mockResolvedValue({ data: {} });
    const result = await authRepository.updateProfile({ name: 'Renamed' });
    expect(mockUpdateProfile).toHaveBeenCalledWith({ name: 'Renamed' });
    expect(result).toEqual({ name: 'Renamed' });
  });
});

describe('authRepository.deleteAccount', () => {
  it('returns success when the service resolves', async () => {
    mockDeleteAccount.mockResolvedValue({ data: {} });
    const result = await authRepository.deleteAccount();
    expect(result.success).toBe(true);
  });

  it('surfaces an axios string detail on failure', async () => {
    mockDeleteAccount.mockRejectedValue(axiosError({ detail: 'cannot delete' }));
    const result = await authRepository.deleteAccount();
    expect(result.success).toBe(false);
    expect(result.error).toBe('cannot delete');
  });

  it('returns a network error for a non-axios failure', async () => {
    mockDeleteAccount.mockRejectedValue(new Error('offline'));
    const result = await authRepository.deleteAccount();
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/network error/i);
  });
});
