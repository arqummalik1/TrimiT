import { authService } from '../services/authService';
import { setAuthToken } from '../services/apiClient';
import { User } from '../types';

/**
 * Repository layer for Authentication.
 * Handles domain logic, data transformation, and side effects.
 */
export const authRepository = {
  /**
   * Performs login and prepares the session.
   */
  async login(email: string, password: string) {
    const response = await authService.login({ email, password });
    const { access_token, profile, user } = response.data;

    if (!access_token) {
      throw new Error('Authentication failed: No token received');
    }

    // Set token for subsequent requests
    setAuthToken(access_token);

    return {
      user: (profile || user) as User,
      token: access_token,
    };
  },

  /**
   * Performs signup and prepares the session.
   */
  async signup(data: any) {
    const response = await authService.signup(data);
    const { user, session } = response.data;

    if (session?.access_token) {
      setAuthToken(session.access_token);
      return {
        user: { ...user, ...data } as User,
        token: session.access_token,
      };
    }

    return { user: null, token: null };
  },

  /**
   * Updates user profile.
   */
  async updateProfile(data: Partial<User>) {
    await authService.updateProfile(data);
    return data;
  }
};
