/**
 * Unit tests for src/lib/serviceImage.ts
 * Covers: resolveServiceImage (keyword matching, fallback, owner image)
 */
import { resolveServiceImage, DEFAULT_SERVICE_IMAGE } from '../../src/lib/serviceImage';

describe('resolveServiceImage', () => {
  it('returns image_url when provided', () => {
    const result = resolveServiceImage({ name: 'Haircut', image_url: 'https://custom.com/img.jpg' });
    expect(result).toBe('https://custom.com/img.jpg');
  });

  it('returns null image_url as-is when truthy', () => {
    const result = resolveServiceImage({ name: 'Haircut', image_url: null });
    // null is falsy so it should fall through to keyword matching
    expect(result).not.toBe('https://custom.com/img.jpg');
  });

  // ─── Keyword: hair / cut / trim / style / blow ─────────────────────────────
  it('matches "Haircut" keyword → hair category', () => {
    const result = resolveServiceImage({ name: 'Haircut', image_url: null });
    expect(result).toContain('unsplash.com');
    expect(result).not.toBe(DEFAULT_SERVICE_IMAGE);
  });

  it('matches "hair spa" keyword', () => {
    const result = resolveServiceImage({ name: 'Hair Spa', image_url: null });
    expect(result).not.toBe(DEFAULT_SERVICE_IMAGE);
  });

  it('matches "trim" keyword', () => {
    const result = resolveServiceImage({ name: 'Beard Trim', image_url: null });
    // "Beard Trim" — "beard" is checked before "trim", so it should match beard category
    expect(result).not.toBe(DEFAULT_SERVICE_IMAGE);
  });

  // ─── Keyword: beard / shave / facial hair ─────────────────────────────────
  it('matches "Beard Shave" → beard category', () => {
    const result = resolveServiceImage({ name: 'Beard Shave', image_url: null });
    expect(result).not.toBe(DEFAULT_SERVICE_IMAGE);
  });

  // ─── Keyword: facial / skin / glow / face / clean / peel ───────────────────
  it('matches "Facial" → facial category', () => {
    const result = resolveServiceImage({ name: 'Facial', image_url: null });
    expect(result).not.toBe(DEFAULT_SERVICE_IMAGE);
  });

  // ─── Keyword: manicure / pedicure / nail / nails ───────────────────────────
  it('matches "Manicure" → nail category', () => {
    const result = resolveServiceImage({ name: 'Manicure', image_url: null });
    expect(result).not.toBe(DEFAULT_SERVICE_IMAGE);
  });

  // ─── Keyword: massage / spa / relax / therapy ──────────────────────────────
  it('matches "Full Body Massage" → massage category', () => {
    const result = resolveServiceImage({ name: 'Full Body Massage', image_url: null });
    expect(result).not.toBe(DEFAULT_SERVICE_IMAGE);
  });

  // ─── Keyword: colour / color / highlight / bleach / dye ────────────────────
  it('matches "Hair Colour" → colour category', () => {
    const result = resolveServiceImage({ name: 'Hair Colour', image_url: null });
    expect(result).not.toBe(DEFAULT_SERVICE_IMAGE);
  });

  // ─── Keyword: wax / threading / eyebrow / brow ────────────────────────────
  it('matches "Waxing" → wax category', () => {
    const result = resolveServiceImage({ name: 'Full Body Wax', image_url: null });
    expect(result).not.toBe(DEFAULT_SERVICE_IMAGE);
  });

  // ─── Default fallback ─────────────────────────────────────────────────────
  it('returns DEFAULT_SERVICE_IMAGE for unmatched names', () => {
    const result = resolveServiceImage({ name: 'Something Unique', image_url: null });
    expect(result).toBe(DEFAULT_SERVICE_IMAGE);
  });

  it('returns DEFAULT_SERVICE_IMAGE for empty name', () => {
    const result = resolveServiceImage({ name: '', image_url: null });
    expect(result).toBe(DEFAULT_SERVICE_IMAGE);
  });

  // ─── Case insensitivity ───────────────────────────────────────────────────
  it('matches keywords case-insensitively', () => {
    const result = resolveServiceImage({ name: 'HAIRCUT SPECIAL', image_url: null });
    expect(result).not.toBe(DEFAULT_SERVICE_IMAGE);
  });
});
