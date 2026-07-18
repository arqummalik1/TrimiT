/**
 * Helpers to avoid stacking permission modals (Discover location OS sheet +
 * App notification primer). Poll only briefly — never block onboarding for minutes
 * when location was never requested.
 */
import * as Location from 'expo-location';

const POLL_MS = 400;
/** Enough time for Discover’s concurrent OS location sheet; not a 2‑minute stall. */
export const LOCATION_PERMISSION_WAIT_MAX_MS = 8_000;
/** Brief pause after the OS location sheet closes so iOS can dismiss it before another Modal. */
const POST_RESOLVE_DELAY_MS = 600;

export type WaitLocationPermissionOptions = {
  signal?: AbortSignal;
  maxWaitMs?: number;
};

function abortError(): Error {
  const err = new Error('Aborted');
  err.name = 'AbortError';
  return err;
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw abortError();
  }
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    throwIfAborted(signal);
    const id = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(id);
      reject(abortError());
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * Resolves once foreground location is no longer `undetermined` (granted or denied),
 * or when `maxWaitMs` elapses (location never prompted — do not block forever).
 * Honours `signal` so App effect cleanup can stop polling immediately.
 */
export async function waitUntilForegroundLocationPermissionResolved(
  options?: WaitLocationPermissionOptions,
): Promise<void> {
  const signal = options?.signal;
  const maxWaitMs = options?.maxWaitMs ?? LOCATION_PERMISSION_WAIT_MAX_MS;
  const deadline = Date.now() + maxWaitMs;

  while (Date.now() < deadline) {
    throwIfAborted(signal);
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'undetermined') {
      await delay(POST_RESOLVE_DELAY_MS, signal);
      return;
    }
    await delay(POLL_MS, signal);
  }
}
