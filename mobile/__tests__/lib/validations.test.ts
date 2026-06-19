/**
 * Unit tests for src/lib/validations.ts
 * Covers: salonSchema, serviceSchema, promoSchema, reviewSchema, phoneRegex, timeRegex
 */
import {
  salonSchema,
  serviceSchema,
  promoSchema,
  reviewSchema,
  phoneRegex,
  timeRegex,
} from '../../src/lib/validations';

// ─── phoneRegex ──────────────────────────────────────────────────────────────

describe('phoneRegex', () => {
  it('accepts 10-digit Indian number starting with 6', () => {
    expect('6123456789').toMatch(phoneRegex);
  });

  it('accepts 10-digit number starting with 7', () => {
    expect('7123456789').toMatch(phoneRegex);
  });

  it('accepts 10-digit number starting with 8', () => {
    expect('8123456789').toMatch(phoneRegex);
  });

  it('accepts 10-digit number starting with 9', () => {
    expect('9123456789').toMatch(phoneRegex);
  });

  it('rejects 10-digit number starting with 5', () => {
    expect('5123456789').not.toMatch(phoneRegex);
  });

  it('rejects 9-digit numbers', () => {
    expect('912345678').not.toMatch(phoneRegex);
  });

  it('accepts with +91 prefix', () => {
    expect('+919876543210').toMatch(phoneRegex);
  });

  it('accepts with 91 prefix', () => {
    expect('919876543210').toMatch(phoneRegex);
  });

  it('rejects non-digit characters in number', () => {
    expect('912345678a').not.toMatch(phoneRegex);
  });
});

// ─── timeRegex ───────────────────────────────────────────────────────────────

describe('timeRegex', () => {
  it('accepts "00:00"', () => {
    expect('00:00').toMatch(timeRegex);
  });

  it('accepts "23:59"', () => {
    expect('23:59').toMatch(timeRegex);
  });

  it('accepts "9:30"', () => {
    expect('9:30').toMatch(timeRegex);
  });

  it('accepts "12:00"', () => {
    expect('12:00').toMatch(timeRegex);
  });

  it('rejects "24:00"', () => {
    expect('24:00').not.toMatch(timeRegex);
  });

  it('rejects "12:60"', () => {
    expect('12:60').not.toMatch(timeRegex);
  });

  it('rejects empty string', () => {
    expect('').not.toMatch(timeRegex);
  });

  it('rejects non-time strings', () => {
    expect('hello').not.toMatch(timeRegex);
  });
});

// ─── salonSchema ────────────────────────────────────────────────────────────

describe('salonSchema', () => {
  const validSalon = {
    name: 'Trimit Salon',
    address: '123 MG Road',
    city: 'Delhi',
    phone: '9876543210',
    latitude: 28.6139,
    longitude: 77.209,
    opening_time: '09:00',
    closing_time: '21:00',
  };

  it('accepts a valid salon object', () => {
    expect(salonSchema.safeParse(validSalon).success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = salonSchema.safeParse({ ...validSalon, name: '' });
    expect(result.success).toBe(false);
  });

  it('trims whitespace from name', () => {
    const result = salonSchema.safeParse({ ...validSalon, name: '  Trimit  ' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe('Trimit');
  });

  it('rejects invalid phone', () => {
    const result = salonSchema.safeParse({ ...validSalon, phone: '12345' });
    expect(result.success).toBe(false);
  });

  it('rejects latitude > 90', () => {
    const result = salonSchema.safeParse({ ...validSalon, latitude: 91 });
    expect(result.success).toBe(false);
  });

  it('rejects latitude < -90', () => {
    const result = salonSchema.safeParse({ ...validSalon, latitude: -91 });
    expect(result.success).toBe(false);
  });

  it('rejects longitude > 180', () => {
    const result = salonSchema.safeParse({ ...validSalon, longitude: 181 });
    expect(result.success).toBe(false);
  });

  it('rejects longitude < -180', () => {
    const result = salonSchema.safeParse({ ...validSalon, longitude: -181 });
    expect(result.success).toBe(false);
  });

  it('rejects invalid opening_time format', () => {
    const result = salonSchema.safeParse({ ...validSalon, opening_time: '9am' });
    expect(result.success).toBe(false);
  });

  it('rejects closing_time before opening_time', () => {
    const result = salonSchema.safeParse({
      ...validSalon,
      opening_time: '21:00',
      closing_time: '09:00',
    });
    expect(result.success).toBe(false);
  });

  it('accepts equal opening and closing times edge case... no: must be AFTER', () => {
    const result = salonSchema.safeParse({
      ...validSalon,
      opening_time: '10:00',
      closing_time: '10:00',
    });
    // The refine checks closeH * 60 + closeM > openH * 60 + openM
    // Equal times fail: 600 > 600 is false
    expect(result.success).toBe(false);
  });

  it('accepts salon with boundary lat/lng values', () => {
    const result = salonSchema.safeParse({
      ...validSalon,
      latitude: 90,
      longitude: 180,
    });
    expect(result.success).toBe(true);
  });
});

// ─── serviceSchema ──────────────────────────────────────────────────────────

describe('serviceSchema', () => {
  const validService = {
    name: 'Haircut',
    price: 200,
    duration: 30,
    is_on_offer: false,
  };

  it('accepts a valid service', () => {
    expect(serviceSchema.safeParse(validService).success).toBe(true);
  });

  it('sets is_on_offer to false by default', () => {
    const { is_on_offer, ...without } = validService;
    const result = serviceSchema.safeParse(without);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.is_on_offer).toBe(false);
  });

  it('rejects empty name', () => {
    const result = serviceSchema.safeParse({ ...validService, name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects zero price', () => {
    const result = serviceSchema.safeParse({ ...validService, price: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects negative price', () => {
    const result = serviceSchema.safeParse({ ...validService, price: -50 });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer duration', () => {
    const result = serviceSchema.safeParse({ ...validService, duration: 30.5 });
    expect(result.success).toBe(false);
  });

  it('rejects zero duration', () => {
    const result = serviceSchema.safeParse({ ...validService, duration: 0 });
    expect(result.success).toBe(false);
  });

  it('accepts a valid offer with discount_percentage', () => {
    const result = serviceSchema.safeParse({
      ...validService,
      is_on_offer: true,
      discount_percentage: 20,
    });
    expect(result.success).toBe(true);
  });

  it('rejects offer without discount_percentage', () => {
    const result = serviceSchema.safeParse({
      ...validService,
      is_on_offer: true,
      discount_percentage: null,
    });
    expect(result.success).toBe(false);
  });

  it('accepts discount_percentage range 1-100', () => {
    const result1 = serviceSchema.safeParse({ ...validService, is_on_offer: true, discount_percentage: 1 });
    const result2 = serviceSchema.safeParse({ ...validService, is_on_offer: true, discount_percentage: 100 });
    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
  });

  it('rejects discount_percentage > 100', () => {
    const result = serviceSchema.safeParse({ ...validService, is_on_offer: true, discount_percentage: 101 });
    expect(result.success).toBe(false);
  });
});

// ─── promoSchema ─────────────────────────────────────────────────────────────

describe('promoSchema', () => {
  const validPromo = {
    code: 'SAVE20',
    discount_type: 'percent' as const,
    discount_value: 20,
  };

  it('accepts a valid percent promo', () => {
    expect(promoSchema.safeParse(validPromo).success).toBe(true);
  });

  it('accepts a valid fixed promo', () => {
    const result = promoSchema.safeParse({
      code: 'FLAT100',
      discount_type: 'fixed',
      discount_value: 100,
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty code', () => {
    const result = promoSchema.safeParse({ ...validPromo, code: '' });
    expect(result.success).toBe(false);
  });

  it('rejects code with special characters (only alphanumeric, dash, underscore)', () => {
    const result = promoSchema.safeParse({ ...validPromo, code: 'SAVE@20' });
    expect(result.success).toBe(false);
  });

  it('accepts code with dashes and underscores', () => {
    const result = promoSchema.safeParse({ ...validPromo, code: 'SAVE_20-OFF' });
    expect(result.success).toBe(true);
  });

  it('rejects zero discount_value', () => {
    const result = promoSchema.safeParse({ ...validPromo, discount_value: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects percent discount > 100', () => {
    const result = promoSchema.safeParse({ ...validPromo, discount_type: 'percent', discount_value: 150 });
    expect(result.success).toBe(false);
  });

  it('accepts optional max_discount', () => {
    const result = promoSchema.safeParse({ ...validPromo, max_discount: 500 });
    expect(result.success).toBe(true);
  });

  it('accepts optional min_order_value = 0', () => {
    const result = promoSchema.safeParse({ ...validPromo, min_order_value: 0 });
    expect(result.success).toBe(true);
  });

  it('rejects negative min_order_value', () => {
    const result = promoSchema.safeParse({ ...validPromo, min_order_value: -10 });
    expect(result.success).toBe(false);
  });

  it('accepts valid expiry date format YYYY-MM-DD', () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const dateStr = futureDate.toISOString().split('T')[0];
    const result = promoSchema.safeParse({ ...validPromo, expires_at: dateStr });
    expect(result.success).toBe(true);
  });

  it('rejects past expiry date', () => {
    const result = promoSchema.safeParse({ ...validPromo, expires_at: '2020-01-01' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid expiry date format', () => {
    const result = promoSchema.safeParse({ ...validPromo, expires_at: 'Jan 1 2025' });
    expect(result.success).toBe(false);
  });

  it('accepts nullable max_uses', () => {
    const result = promoSchema.safeParse({ ...validPromo, max_uses: null });
    expect(result.success).toBe(true);
  });
});

// ─── reviewSchema ───────────────────────────────────────────────────────────

describe('reviewSchema', () => {
  it('accepts a valid rating with comment', () => {
    const result = reviewSchema.safeParse({ rating: 5, comment: 'Great service!' });
    expect(result.success).toBe(true);
  });

  it('accepts rating without comment', () => {
    const result = reviewSchema.safeParse({ rating: 4 });
    expect(result.success).toBe(true);
  });

  it('accepts null comment', () => {
    const result = reviewSchema.safeParse({ rating: 3, comment: null });
    expect(result.success).toBe(true);
  });

  it('rejects rating < 1', () => {
    const result = reviewSchema.safeParse({ rating: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects rating > 5', () => {
    const result = reviewSchema.safeParse({ rating: 6 });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer rating', () => {
    const result = reviewSchema.safeParse({ rating: 3.5 });
    expect(result.success).toBe(false);
  });

  it('rejects comment > 500 characters', () => {
    const result = reviewSchema.safeParse({ rating: 5, comment: 'x'.repeat(501) });
    expect(result.success).toBe(false);
  });

  it('accepts comment at exactly 500 characters', () => {
    const result = reviewSchema.safeParse({ rating: 5, comment: 'x'.repeat(500) });
    expect(result.success).toBe(true);
  });
});
