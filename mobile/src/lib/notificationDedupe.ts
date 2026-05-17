const seen = new Map<string, number>();
const TTL_MS = 30_000;

/** Prevent duplicate in-app alerts for the same booking event within TTL. */
export function shouldShowBookingNotification(bookingId: string, eventType: string): boolean {
  const key = `${bookingId}:${eventType}`;
  const now = Date.now();
  const last = seen.get(key);
  if (last !== undefined && now - last < TTL_MS) {
    return false;
  }
  seen.set(key, now);
  return true;
}
