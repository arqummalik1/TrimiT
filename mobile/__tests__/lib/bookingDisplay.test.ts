/**
 * Unit tests for src/lib/bookingDisplay.ts
 * Covers: getEmbeddedService, getServiceDisplayName, getBookingServiceImageUri
 */
import type { Booking, Service } from '../../src/types';
import {
  getEmbeddedService,
  getServiceDisplayName,
  getBookingServiceImageUri,
} from '../../src/lib/bookingDisplay';

// ─── getEmbeddedService ─────────────────────────────────────────────────────

describe('getEmbeddedService', () => {
  const mockService: Service = {
    id: 'svc-1',
    salon_id: 'salon-1',
    name: 'Haircut',
    price: 200,
    duration: 30,
    created_at: '2025-01-01',
  };

  it('returns service when booking.services is an array with items', () => {
    const booking = { services: [mockService] } as unknown as Booking;
    const result = getEmbeddedService(booking);
    expect(result).toEqual(mockService);
  });

  it('returns first service from array even with multiple items', () => {
    const secondService = { ...mockService, id: 'svc-2', name: 'Shave' };
    const booking = { services: [mockService, secondService] } as unknown as Booking;
    const result = getEmbeddedService(booking);
    expect(result).toEqual(mockService);
  });

  it('returns undefined when booking.services is empty array', () => {
    const booking = { services: [] } as unknown as Booking;
    expect(getEmbeddedService(booking)).toBeUndefined();
  });

  it('returns service when booking.services is a single object', () => {
    const booking = { services: mockService } as unknown as Booking;
    const result = getEmbeddedService(booking);
    expect(result).toEqual(mockService);
  });

  it('returns undefined when booking.services is null', () => {
    const booking = { services: null } as unknown as Booking;
    expect(getEmbeddedService(booking)).toBeUndefined();
  });

  it('returns undefined when booking.services is a string', () => {
    const booking = { services: 'not-an-object' } as unknown as Booking;
    expect(getEmbeddedService(booking)).toBeUndefined();
  });

  it('falls back to salon.services when service_id matches', () => {
    const booking = {
      service_id: 'svc-1',
      salons: {
        services: [mockService],
      },
      services: null,
    } as unknown as Booking;
    const result = getEmbeddedService(booking);
    expect(result).toEqual(mockService);
  });

  it('does not match salon service when service_id differs', () => {
    const booking = {
      service_id: 'svc-other',
      salons: {
        services: [mockService],
      },
      services: null,
    } as unknown as Booking;
    expect(getEmbeddedService(booking)).toBeUndefined();
  });
});

// ─── getServiceDisplayName ──────────────────────────────────────────────────

describe('getServiceDisplayName', () => {
  it('returns service name when embedded service exists', () => {
    const booking = {
      services: [{ id: 'svc-1', name: 'Haircut' }],
    } as unknown as Booking;
    expect(getServiceDisplayName(booking)).toBe('Haircut');
  });

  it('returns "Service" fallback when no embedded service', () => {
    const booking = {} as Booking;
    expect(getServiceDisplayName(booking)).toBe('Service');
  });
});

// ─── getBookingServiceImageUri ──────────────────────────────────────────────

describe('getBookingServiceImageUri', () => {
  it('returns service image_url when service has one', () => {
    const booking = {
      services: [{ name: 'Haircut', image_url: 'https://img.com/hair.jpg' }],
    } as unknown as Booking;
    const uri = getBookingServiceImageUri(booking);
    expect(uri).toBe('https://img.com/hair.jpg');
  });

  it('falls back to salon image when service has no image', () => {
    const booking = {
      services: [{ name: 'Beard Trim', image_url: null }],
      salons: { images: ['https://img.com/salon.jpg'] },
    } as unknown as Booking;
    const uri = getBookingServiceImageUri(booking);
    expect(uri).toBe('https://img.com/salon.jpg');
  });

  it('falls back to salon.image_url when no images array', () => {
    const booking = {
      services: [{ name: 'Beard Trim', image_url: null }],
      salons: { image_url: 'https://img.com/salon2.jpg', images: [] },
    } as unknown as Booking;
    const uri = getBookingServiceImageUri(booking);
    expect(uri).toBe('https://img.com/salon2.jpg');
  });

  it('returns default category image when nothing else available', () => {
    const booking = {
      services: [{ name: 'Haircut', image_url: null }],
      salons: { images: [], image_url: null },
    } as unknown as Booking;
    const uri = getBookingServiceImageUri(booking);
    expect(uri).toBeTruthy(); // should resolve via resolveServiceImage keyword match
    expect(uri).toContain('https://');
  });
});
