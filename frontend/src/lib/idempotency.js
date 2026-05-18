/** POST paths that require `Idempotency-Key` (must match backend `@idempotency_required`). */
export const IDEMPOTENT_POST_PATHS = ['/bookings/', '/payments/verify'];

export function pathRequiresIdempotencyKey(url) {
  if (!url) return false;
  const path = url.split('?')[0];
  return IDEMPOTENT_POST_PATHS.some((p) => path === p || path.endsWith(p));
}

/** Fresh UUID for one logical user action (confirm booking, verify payment). */
export function createIdempotencyKey() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}
