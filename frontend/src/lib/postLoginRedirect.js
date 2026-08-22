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
  // New / broken account (no role yet) must pick role + name first — same gate
  // as ProtectedRoute, so sending them anywhere else would just bounce.
  if (profileComplete === false || !profile?.role) {
    return '/complete-profile';
  }

  const redirect = safeInternalPath(redirectTo);
  if (redirect) return redirect;

  if (profile.role === 'owner') {
    return hasSalon ? '/owner/dashboard' : '/owner/salon';
  }
  return '/explore';
}
