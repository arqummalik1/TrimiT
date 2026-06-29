/**
 * Unit tests for src/navigation/params.ts
 * Covers: BookingParamsSchema, SalonDetailParamsSchema
 */
import {
  BookingParamsSchema,
  SalonDetailParamsSchema,
} from '../../src/navigation/params';

// ─── BookingParamsSchema ──────────────────────────────────────────────────────

describe('BookingParamsSchema', () => {
  it('accepts valid UUIDs', () => {
    const result = BookingParamsSchema.safeParse({
      salonId: '550e8400-e29b-41d4-a716-446655440000',
      serviceId: '660e8400-e29b-41d4-a716-446655440001',
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-UUID salonId', () => {
    const result = BookingParamsSchema.safeParse({
      salonId: 'not-a-uuid',
      serviceId: '660e8400-e29b-41d4-a716-446655440001',
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-UUID serviceId', () => {
    const result = BookingParamsSchema.safeParse({
      salonId: '550e8400-e29b-41d4-a716-446655440000',
      serviceId: 'abc',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing fields', () => {
    const result = BookingParamsSchema.safeParse({ salonId: '550e8400-e29b-41d4-a716-446655440000' });
    expect(result.success).toBe(false);
  });
});

// ─── SalonDetailParamsSchema ──────────────────────────────────────────────────

describe('SalonDetailParamsSchema', () => {
  it('accepts valid UUID salonId', () => {
    expect(
      SalonDetailParamsSchema.safeParse({ salonId: '550e8400-e29b-41d4-a716-446655440000' }).success
    ).toBe(true);
  });

  it('rejects non-UUID salonId', () => {
    expect(SalonDetailParamsSchema.safeParse({ salonId: '123' }).success).toBe(false);
  });

  it('rejects empty object', () => {
    expect(SalonDetailParamsSchema.safeParse({}).success).toBe(false);
  });
});
