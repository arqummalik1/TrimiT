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
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}
