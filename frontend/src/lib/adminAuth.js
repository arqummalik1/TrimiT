/**
 * Admin dashboard token storage (founder-only PIN-gated dashboard).
 *
 * The admin bearer token only ever exists in memory + sessionStorage AFTER a
 * correct PIN is exchanged at POST /admin/login. It is intentionally kept
 * separate from the normal user auth token (authStore / Supabase session) so
 * the regular auth interceptor never touches it and vice-versa. Session
 * storage means the unlock does not survive a tab close — by design.
 */

const ADMIN_TOKEN_KEY = 'trimit.admin.token';

export function getAdminToken() {
  try {
    return sessionStorage.getItem(ADMIN_TOKEN_KEY) || null;
  } catch {
    return null;
  }
}

export function setAdminToken(token) {
  try {
    if (token) sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
  } catch {
    /* sessionStorage unavailable (private mode) — token stays in component state */
  }
}

export function clearAdminToken() {
  try {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  } catch {
    /* no-op */
  }
}
