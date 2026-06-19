/**
 * Unit tests for src/lib/formatDate.ts
 * The shared short-date formatter used by subscription and other screens.
 */
import { formatDate } from '../../src/lib/formatDate';

describe('formatDate (lib/formatDate)', () => {
  it('returns "—" for null', () => {
    expect(formatDate(null)).toBe('—');
  });

  it('returns "—" for undefined', () => {
    expect(formatDate(undefined)).toBe('—');
  });

  it('returns "—" for empty string', () => {
    expect(formatDate('')).toBe('—');
  });

  it('formats a valid ISO date to "D Mon YYYY" pattern', () => {
    const result = formatDate('2025-06-15T00:00:00Z');
    expect(result).toMatch(/\d+\s+\w{3}\s+\d{4}/);
  });

  it('formats a date-only string', () => {
    const result = formatDate('2025-01-01');
    expect(result).toMatch(/\d+\s+\w{3}\s+\d{4}/);
  });

  it('returns "—" for completely invalid input', () => {
    expect(formatDate('not-even-close')).toBe('—');
  });
});
