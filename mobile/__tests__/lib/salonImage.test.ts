/**
 * Unit tests for src/lib/salonImage.ts
 * Covers: normalizeSalonImages, normalizeSalon, getSalonThumbnailUri,
 *         getSalonCarouselUris, resolveSalonImageSource, resolveSalonCarouselSources
 */
import {
  normalizeSalonImages,
  normalizeSalon,
  getSalonThumbnailUri,
  getSalonCarouselUris,
  resolveSalonImageSource,
  resolveSalonCarouselSources,
} from '../../src/lib/salonImage';

// ─── normalizeSalonImages ────────────────────────────────────────────────────

describe('normalizeSalonImages', () => {
  it('returns empty array for null', () => {
    expect(normalizeSalonImages(null)).toEqual([]);
  });

  it('returns empty array for undefined', () => {
    expect(normalizeSalonImages(undefined)).toEqual([]);
  });

  it('filters out non-string items from array', () => {
    const result = normalizeSalonImages(['https://a.com/1.jpg', 123, null, 'https://a.com/2.jpg']);
    expect(result).toEqual(['https://a.com/1.jpg', 'https://a.com/2.jpg']);
  });

  it('filters out empty strings and whitespace', () => {
    const result = normalizeSalonImages(['  ', '', 'https://a.com/1.jpg']);
    expect(result).toEqual(['https://a.com/1.jpg']);
  });

  it('filters out non-HTTP URLs', () => {
    const result = normalizeSalonImages(['ftp://bad.com/img.jpg', 'https://good.com/img.jpg']);
    expect(result).toEqual(['https://good.com/img.jpg']);
  });

  it('accepts both http and https URLs', () => {
    const result = normalizeSalonImages(['http://a.com/1.jpg', 'https://b.com/2.jpg']);
    expect(result).toEqual(['http://a.com/1.jpg', 'https://b.com/2.jpg']);
  });

  it('trims whitespace from URLs', () => {
    const result = normalizeSalonImages(['  https://a.com/1.jpg  ']);
    expect(result).toEqual(['https://a.com/1.jpg']);
  });

  it('parses JSON array from string', () => {
    const result = normalizeSalonImages('["https://a.com/1.jpg","https://a.com/2.jpg"]');
    expect(result).toEqual(['https://a.com/1.jpg', 'https://a.com/2.jpg']);
  });

  it('returns single-element array for a plain HTTPS string', () => {
    const result = normalizeSalonImages('https://a.com/1.jpg');
    expect(result).toEqual(['https://a.com/1.jpg']);
  });

  it('returns empty array for non-JSON string without protocol', () => {
    const result = normalizeSalonImages('not-a-url');
    expect(result).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    expect(normalizeSalonImages('')).toEqual([]);
  });

  it('returns empty array for invalid JSON string', () => {
    const result = normalizeSalonImages('[invalid-json');
    expect(result).toEqual([]);
  });

  it('returns empty array for empty array input', () => {
    expect(normalizeSalonImages([])).toEqual([]);
  });
});

// ─── normalizeSalon ─────────────────────────────────────────────────────────

describe('normalizeSalon', () => {
  it('normalizes salon with images array', () => {
    const salon = { id: '1', name: 'Test', images: ['https://a.com/1.jpg'] } as any;
    const result = normalizeSalon(salon);
    expect(result.images).toEqual(['https://a.com/1.jpg']);
    expect(result.image_url).toBe('https://a.com/1.jpg');
  });

  it('falls back to image_url when images is empty', () => {
    const salon = { id: '1', name: 'Test', images: [], image_url: 'https://a.com/fallback.jpg' } as any;
    const result = normalizeSalon(salon);
    expect(result.images).toEqual(['https://a.com/fallback.jpg']);
    expect(result.image_url).toBe('https://a.com/fallback.jpg');
  });

  it('prefers images array over image_url when both present', () => {
    const salon = {
      id: '1',
      name: 'Test',
      images: ['https://a.com/from-array.jpg'],
      image_url: 'https://a.com/from-url.jpg',
    } as any;
    const result = normalizeSalon(salon);
    expect(result.images).toEqual(['https://a.com/from-array.jpg']);
    expect(result.image_url).toBe('https://a.com/from-array.jpg');
  });

  it('returns empty images and undefined image_url when none provided', () => {
    const salon = { id: '1', name: 'Test' } as any;
    const result = normalizeSalon(salon);
    expect(result.images).toEqual([]);
    expect(result.image_url).toBeUndefined();
  });
});

// ─── getSalonThumbnailUri ────────────────────────────────────────────────────

describe('getSalonThumbnailUri', () => {
  it('returns first image URL when available', () => {
    const salon = { images: ['https://a.com/1.jpg'] } as any;
    expect(getSalonThumbnailUri(salon)).toBe('https://a.com/1.jpg');
  });

  it('returns null when no images', () => {
    expect(getSalonThumbnailUri({} as any)).toBeNull();
  });
});

// ─── getSalonCarouselUris ────────────────────────────────────────────────────

describe('getSalonCarouselUris', () => {
  it('returns all normalized image URIs', () => {
    const salon = { images: ['https://a.com/1.jpg', 'https://a.com/2.jpg'] } as any;
    expect(getSalonCarouselUris(salon)).toEqual(['https://a.com/1.jpg', 'https://a.com/2.jpg']);
  });

  it('returns empty array for no images', () => {
    expect(getSalonCarouselUris({} as any)).toEqual([]);
  });
});

// ─── resolveSalonImageSource ─────────────────────────────────────────────────

describe('resolveSalonImageSource', () => {
  it('returns { uri } object when salon has image', () => {
    const salon = { images: ['https://a.com/1.jpg'] } as any;
    const source = resolveSalonImageSource(salon);
    expect(source).toEqual({ uri: 'https://a.com/1.jpg' });
  });

  it('returns placeholder (number) when no image', () => {
    const source = resolveSalonImageSource({} as any);
    expect(typeof source).toBe('number');
  });
});

// ─── resolveSalonCarouselSources ────────────────────────────────────────────

describe('resolveSalonCarouselSources', () => {
  it('returns array of { uri } objects for multiple images', () => {
    const salon = { images: ['https://a.com/1.jpg', 'https://a.com/2.jpg'] } as any;
    const sources = resolveSalonCarouselSources(salon);
    expect(sources).toEqual([{ uri: 'https://a.com/1.jpg' }, { uri: 'https://a.com/2.jpg' }]);
  });

  it('returns single placeholder when no images', () => {
    const sources = resolveSalonCarouselSources({} as any);
    expect(sources.length).toBe(1);
    expect(typeof sources[0]).toBe('number');
  });
});
