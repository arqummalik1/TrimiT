import { safeInternalPath } from './utils';

/**
 * Single source of truth for where a user lands after a successful sign-in.
 * Both the password path (LoginPage) and the OTP path (VerifyOtpPage) call
 * this so the two can never drift.
 *
 * Priority: finish profile → explicit redirect → role-based home.
 *
 * @param {object} result
 * @param {object|null} result.profile - Profile returned by the auth store.
 * @param {boolean} result.hasSalon - Whether an owner already created a salon.
 * @param {boolean} result.profileComplete - false for new/broken accounts.
 * @param {string|null} result.redirectTo - Untrusted ?redirect= value.
 * @returns {string} Internal path to navigate to.
 */
export function resolvePostLoginPath({
  profile = null,
  hasSalon = false,
  profileComplete = true,
  redirectTo = null,
} = {}) {
  // The only intentionally incomplete web profile is an employee waiting for
  // invitation verification. Customer/owner profiles bootstrap automatically.
  if (profileComplete === false || !profile?.role) {
    return '/employee-access';
  }

  const redirect = safeInternalPath(redirectTo);
  if (redirect) return redirect;

  if (profile.role === 'owner') {
    return hasSalon ? '/owner/dashboard' : '/owner/salon';
  }
  if (profile.role === 'employee') return '/owner/dashboard';
  return '/explore';
}
