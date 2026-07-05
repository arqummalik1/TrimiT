import { describe, it, expect } from 'vitest';
import { 
  formatPrice, 
  formatTime, 
  normalizeSlotTimeToHHMM,
  cn, 
  getApiErrorMessage, 
  safeInternalPath 
} from '../../src/lib/utils';

describe('utils', () => {
  it('cn merges class names correctly', () => {
    expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500');
    expect(cn('p-4', { 'text-white': true })).toBe('p-4 text-white');
  });

  it('formatPrice formats INR correctly', () => {
    // Note: Due to Node.js Intl implementation differences, we check for currency symbol
    // It could be '₹' or 'INR' depending on environment
    const result = formatPrice(1500);
    expect(result).toMatch(/1,500/);
    expect(result).toMatch(/₹|INR/);
  });

  it('formatTime converts 24h to 12h AM/PM correctly', () => {
    expect(formatTime('14:30:00')).toBe('2:30 PM');
    expect(formatTime('09:15:00')).toBe('9:15 AM');
    expect(formatTime('12:00:00')).toBe('12:00 PM');
    expect(formatTime('00:45:00')).toBe('12:45 AM');
  });

  it('normalizeSlotTimeToHHMM strips seconds', () => {
    expect(normalizeSlotTimeToHHMM('14:30:00')).toBe('14:30');
    expect(normalizeSlotTimeToHHMM('09:00')).toBe('09:00');
    expect(normalizeSlotTimeToHHMM(null)).toBe('');
  });

  it('getApiErrorMessage extracts messages gracefully', () => {
    expect(getApiErrorMessage({ response: { data: { detail: 'Custom error' } } })).toBe('Custom error');
    expect(getApiErrorMessage({ response: { data: { detail: { message: 'Object error' } } } })).toBe('Object error');
    expect(getApiErrorMessage(null)).toBe('Something went wrong. Please try again.');
  });

  it('safeInternalPath prevents external redirects', () => {
    expect(safeInternalPath('/dashboard')).toBe('/dashboard');
    expect(safeInternalPath('https://evil.com')).toBe(null);
    expect(safeInternalPath('//evil.com')).toBe(null);
    expect(safeInternalPath(null)).toBe(null);
  });
});
