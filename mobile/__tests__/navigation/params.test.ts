/**
 * Unit tests for src/navigation/params.ts
 * Covers: BookingParamsSchema, PaymentParamsSchema, SalonDetailParamsSchema
 */
import {
  BookingParamsSchema,
  PaymentParamsSchema,
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

// ─── PaymentParamsSchema ─────────────────────────────────────────────────────

describe('PaymentParamsSchema', () => {
  const valid = {
    bookingId: '550e8400-e29b-41d4-a716-446655440000',
    amount: 500,
    salonName: 'Trimit Salon',
    serviceName: 'Haircut',
    bookingDate: '2025-06-15',
    timeSlot: '10:00',
  };

  it('accepts valid payment params', () => {
    expect(PaymentParamsSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects zero amount', () => {
    expect(PaymentParamsSchema.safeParse({ ...valid, amount: 0 }).success).toBe(false);
  });

  it('rejects negative amount', () => {
    expect(PaymentParamsSchema.safeParse({ ...valid, amount: -100 }).success).toBe(false);
  });

  it('rejects missing salonName', () => {
    const { salonName, ...rest } = valid;
    expect(PaymentParamsSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects non-UUID bookingId', () => {
    expect(PaymentParamsSchema.safeParse({ ...valid, bookingId: 'abc' }).success).toBe(false);
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
