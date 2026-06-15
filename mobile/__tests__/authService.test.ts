/**
 * Unit tests for authService — the thin HTTP seam over apiClient.
 *
 * authService returns the raw AxiosResponse (no unwrapping). We verify the
 * exact HTTP verb + path + payload for every endpoint, against a mocked
 * apiClient. This locks the API contract the repository depends on.
 */

jest.mock('../src/services/apiClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
  setAuthToken: jest.fn(),
}));

import apiClient from '../src/services/apiClient';
import { authService } from '../src/services/authService';

const mockedApi = apiClient as jest.Mocked<typeof apiClient>;

beforeEach(() => jest.clearAllMocks());

describe('authService HTTP contract', () => {
  it('login POSTs /auth/login with credentials', async () => {
    mockedApi.post.mockResolvedValue({ data: { access_token: 't' } } as any);

    const res = await authService.login({ email: 'a@b.com', password: 'pw' });

    expect(mockedApi.post).toHaveBeenCalledWith('/auth/login', {
      email: 'a@b.com',
      password: 'pw',
    });
    expect(res).toEqual({ data: { access_token: 't' } });
  });

  it('signup POSTs /auth/signup with the full payload', async () => {
    mockedApi.post.mockResolvedValue({ status: 200, data: {} } as any);

    await authService.signup({
      email: 'a@b.com',
      password: 'pw',
      name: 'A',
      phone: '123',
      role: 'owner',
    });

    expect(mockedApi.post).toHaveBeenCalledWith('/auth/signup', {
      email: 'a@b.com',
      password: 'pw',
      name: 'A',
      phone: '123',
      role: 'owner',
    });
  });

  it('forgotPassword POSTs /auth/forgot-password with email', async () => {
    mockedApi.post.mockResolvedValue({ data: {} } as any);
    await authService.forgotPassword('a@b.com');
    expect(mockedApi.post).toHaveBeenCalledWith('/auth/forgot-password', { email: 'a@b.com' });
  });

  it('resendConfirmation POSTs /auth/resend-confirmation with email', async () => {
    mockedApi.post.mockResolvedValue({ data: {} } as any);
    await authService.resendConfirmation('a@b.com');
    expect(mockedApi.post).toHaveBeenCalledWith('/auth/resend-confirmation', { email: 'a@b.com' });
  });

  it('updateProfile PATCHes /auth/profile', async () => {
    mockedApi.patch.mockResolvedValue({ data: {} } as any);
    await authService.updateProfile({ name: 'New', phone: '999' });
    expect(mockedApi.patch).toHaveBeenCalledWith('/auth/profile', { name: 'New', phone: '999' });
  });

  it('registerPushToken POSTs /auth/push-token', async () => {
    mockedApi.post.mockResolvedValue({ data: {} } as any);
    await authService.registerPushToken('expo-token');
    expect(mockedApi.post).toHaveBeenCalledWith('/auth/push-token', { push_token: 'expo-token' });
  });

  it('updateNotificationPreferences PATCHes /auth/notification-preferences', async () => {
    mockedApi.patch.mockResolvedValue({ data: {} } as any);
    await authService.updateNotificationPreferences({ push_enabled: false });
    expect(mockedApi.patch).toHaveBeenCalledWith('/auth/notification-preferences', {
      push_enabled: false,
    });
  });

  it('getMe GETs /auth/me', async () => {
    mockedApi.get.mockResolvedValue({ data: { profile: { id: 'u1' } } } as any);
    const res = await authService.getMe();
    expect(mockedApi.get).toHaveBeenCalledWith('/auth/me');
    expect(res).toEqual({ data: { profile: { id: 'u1' } } });
  });

  it('deleteAccount DELETEs /auth/account', async () => {
    mockedApi.delete.mockResolvedValue({ data: {} } as any);
    await authService.deleteAccount();
    expect(mockedApi.delete).toHaveBeenCalledWith('/auth/account');
  });

  it('sendOtp POSTs /auth/send-otp with email', async () => {
    mockedApi.post.mockResolvedValue({ data: {} } as any);
    await authService.sendOtp('a@b.com');
    expect(mockedApi.post).toHaveBeenCalledWith('/auth/send-otp', { email: 'a@b.com' });
  });

  it('verifyOtp POSTs /auth/verify-otp with email, token and type', async () => {
    mockedApi.post.mockResolvedValue({ data: { access_token: 't' } } as any);
    await authService.verifyOtp('a@b.com', '123456', 'magiclink');
    expect(mockedApi.post).toHaveBeenCalledWith('/auth/verify-otp', {
      email: 'a@b.com',
      token: '123456',
      type: 'magiclink',
    });
  });

  it('completeProfile POSTs /auth/complete-profile with role/name/phone', async () => {
    mockedApi.post.mockResolvedValue({ data: { profile: { id: 'u1' } } } as any);
    await authService.completeProfile({ role: 'customer', name: 'A', phone: '123' });
    expect(mockedApi.post).toHaveBeenCalledWith('/auth/complete-profile', {
      role: 'customer',
      name: 'A',
      phone: '123',
    });
  });

  it('propagates rejection from apiClient (network failure)', async () => {
    mockedApi.post.mockRejectedValue(new Error('Network Error'));
    await expect(authService.sendOtp('a@b.com')).rejects.toThrow('Network Error');
  });
});
