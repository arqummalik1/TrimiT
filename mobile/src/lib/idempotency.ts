import * as Crypto from 'expo-crypto';

/** POST paths that require `Idempotency-Key` (must match backend `@idempotency_required`). */
export const IDEMPOTENT_POST_PATHS = ['/bookings/', '/payments/verify'] as const;

export function pathRequiresIdempotencyKey(url: string | undefined): boolean {
  if (!url) return false;
  const path = url.split('?')[0];
  return IDEMPOTENT_POST_PATHS.some((p) => path === p || path.endsWith(p));
}

/** Fresh UUID v4 for one logical user action (confirm booking, verify payment). */
export async function createIdempotencyKey(): Promise<string> {
  return Crypto.randomUUID();
}
