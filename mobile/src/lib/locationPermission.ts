/**
 * Helpers to avoid stacking multiple permission modals (Discover location + App notification primer).
 */
import * as Location from 'expo-location';

const POLL_MS = 400;
const MAX_WAIT_MS = 120_000;
/** Brief pause after the OS location sheet closes so iOS can dismiss it before another Modal. */
const POST_RESOLVE_DELAY_MS = 600;

/** Resolves once foreground location is no longer `undetermined` (granted or denied). */
export async function waitUntilForegroundLocationPermissionResolved(): Promise<void> {
  const deadline = Date.now() + MAX_WAIT_MS;
  while (Date.now() < deadline) {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'undetermined') {
      await new Promise((resolve) => setTimeout(resolve, POST_RESOLVE_DELAY_MS));
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
}
