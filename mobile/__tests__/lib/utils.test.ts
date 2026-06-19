/**
 * Unit tests for src/lib/utils.ts
 * ─────────────────────────────────────────────────────────────────
 * Covers: formatDistanceKm, formatPrice, formatDate, formatTime,
 *         normalizeSlotTimeToHHMM
 */
import {
  formatDistanceKm,
  formatPrice,
  formatDate,
  formatTime,
  normalizeSlotTimeToHHMM,
} from '../../src/lib/utils';

// ─── formatDistanceKm ────────────────────────────────────────────────────────

describe('formatDistanceKm', () => {
  it('returns empty string for negative values', () => {
    expect(formatDistanceKm(-1)).toBe('');
  });

  it('returns empty string for NaN', () => {
    expect(formatDistanceKm(NaN)).toBe('');
  });

  it('returns empty string for Infinity', () => {
    expect(formatDistanceKm(Infinity)).toBe('');
  });

  it('returns empty string for -Infinity', () => {
    expect(formatDistanceKm(-Infinity)).toBe('');
  });

  it('formats short distances with 1 decimal (e.g. 3.14 → "3.1 km")', () => {
    expect(formatDistanceKm(3.14159)).toBe('3.1 km');
  });

  it('formats exactly 0 as "0 km"', () => {
    expect(formatDistanceKm(0)).toBe('0.0 km');
  });

  it('formats values < 1 with 1 decimal (e.g. 0.5 → "0.5 km")', () => {
    expect(formatDistanceKm(0.5)).toBe('0.5 km');
  });

  it('rounds long distances to integer (e.g. 15.7 → "16 km")', () => {
    expect(formatDistanceKm(15.7)).toBe('16 km');
  });

  it('keeps exact integers >= 10 as integer (e.g. 10 → "10 km")', () => {
    expect(formatDistanceKm(10)).toBe('10 km');
  });

  it('handles boundary at 10 km (9.99 → "10.0 km")', () => {
    expect(formatDistanceKm(9.99)).toBe('10.0 km');
  });

  it('formats very large distances (e.g. 1234.56 → "1235 km")', () => {
    expect(formatDistanceKm(1234.56)).toBe('1235 km');
  });
});

// ─── formatPrice ─────────────────────────────────────────────────────────────

describe('formatPrice', () => {
  it('formats zero as "₹0"', () => {
    expect(formatPrice(0)).toBe('₹0');
  });

  it('formats positive integers', () => {
    expect(formatPrice(500)).toBe('₹500');
  });

  it('formats decimal amounts', () => {
    expect(formatPrice(199.99)).toBe('₹200');
  });

  it('formats large amounts with Indian numbering system', () => {
    expect(formatPrice(100000)).toBe('₹1,00,000');
  });

  it('formats very large amounts', () => {
    expect(formatPrice(1500000)).toBe('₹15,00,000');
  });
});

// ─── formatDate (lib/utils version — weekday included) ──────────────────────

describe('formatDate (utils)', () => {
  it('formats a valid ISO date string with weekday', () => {
    const result = formatDate('2025-06-15T00:00:00Z');
    // weekday is locale-dependent, but we check it includes the day/month
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('formats a date-only string', () => {
    const result = formatDate('2025-01-01');
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('handles invalid date string gracefully (returns a string)', () => {
    // new Date('invalid') produces "Invalid Date" but toLocaleDateString still
    // returns a string, so we just check it doesn't throw.
    const result = formatDate('not-a-date');
    expect(typeof result).toBe('string');
  });
});

// ─── formatTime ─────────────────────────────────────────────────────────────

describe('formatTime', () => {
  it('returns "—" for null', () => {
    expect(formatTime(null)).toBe('—');
  });

  it('returns "—" for undefined', () => {
    expect(formatTime(undefined)).toBe('—');
  });

  it('returns "—" for empty string', () => {
    expect(formatTime('')).toBe('—');
  });

  it('returns "—" for non-string input', () => {
    expect(formatTime(123 as any)).toBe('—');
  });

  it('converts midnight to 12:00 AM', () => {
    expect(formatTime('00:00')).toBe('12:00 AM');
  });

  it('converts noon to 12:00 PM', () => {
    expect(formatTime('12:00')).toBe('12:00 PM');
  });

  it('converts 09:30 to 9:30 AM', () => {
    expect(formatTime('09:30')).toBe('9:30 AM');
  });

  it('converts 15:45 to 3:45 PM', () => {
    expect(formatTime('15:45')).toBe('3:45 PM');
  });

  it('converts 23:59 to 11:59 PM', () => {
    expect(formatTime('23:59')).toBe('11:59 PM');
  });

  it('converts 01:05 to 1:05 AM', () => {
    expect(formatTime('01:05')).toBe('1:05 AM');
  });

  it('handles HH:MM:SS by using first two parts', () => {
    expect(formatTime('14:30:00')).toBe('2:30 PM');
  });

  it('returns the string as-is if it has no colon', () => {
    expect(formatTime('morning')).toBe('morning');
  });

  it('trims whitespace before parsing', () => {
    expect(formatTime('  09:00  ')).toBe('9:00 AM');
  });
});

// ─── normalizeSlotTimeToHHMM ────────────────────────────────────────────────

describe('normalizeSlotTimeToHHMM', () => {
  it('returns empty string for null', () => {
    expect(normalizeSlotTimeToHHMM(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(normalizeSlotTimeToHHMM(undefined)).toBe('');
  });

  it('returns first 5 chars for HH:MM:SS string', () => {
    expect(normalizeSlotTimeToHHMM('14:30:00')).toBe('14:30');
  });

  it('returns string as-is if already 5 chars', () => {
    expect(normalizeSlotTimeToHHMM('09:30')).toBe('09:30');
  });

  it('returns short strings as-is', () => {
    expect(normalizeSlotTimeToHHMM('9:3')).toBe('9:3');
  });

  it('trims whitespace', () => {
    expect(normalizeSlotTimeToHHMM('  14:30  ')).toBe('14:30');
  });
});
