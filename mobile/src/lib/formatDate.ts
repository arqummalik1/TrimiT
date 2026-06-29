/**
 * Shared date formatter for subscription screens (and anywhere a short
 * human-readable date is needed). Single source of truth so format changes
 * stay consistent across screens.
 *
 * Example: "5 Jun 2026". Returns "—" for null/invalid input.
 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    // `toLocaleDateString` returns "Invalid Date" (it does NOT throw) for a
    // malformed input, so guard explicitly and return the em-dash instead.
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}
