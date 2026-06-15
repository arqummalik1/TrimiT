/**
 * Unit tests for bookingRepository — the network gateway used by BookingScreen /
 * MyBookingsScreen (MVVM: views never call apiClient directly).
 *
 * Both collaborators are mocked at the module boundary:
 *  - bookingService (wraps apiClient for booking CRUD)
 *  - apiClient (used directly for slots / reserve / create / staff)
 *
 * The repository has three distinct error contracts that these tests pin down:
 *  - getRecentBookings / getSalonBookings: SWALLOW errors, return [] (non-critical reads)
 *  - updateBookingStatus: RE-THROW (caller must know the write failed)
 *  - getSlots / reserveSlot / createBooking: pass through (no catch)
 */

jest.mock('../src/services/bookingService', () => ({
  bookingService: {
    getBookings: jest.fn(),
    updateBookingStatus: jest.fn(),
    getSalonBookings: jest.fn(),
  },
}));

jest.mock('../src/services/apiClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

import { bookingRepository } from '../src/repositories/bookingRepository';
import { bookingService } from '../src/services/bookingService';
import apiClient from '../src/services/apiClient';

const mockedService = bookingService as jest.Mocked<typeof bookingService>;
const mockedApi = apiClient as jest.Mocked<typeof apiClient>;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

describe('bookingRepository.getRecentBookings', () => {
  it('sorts by created_at descending and limits the result', async () => {
    mockedService.getBookings.mockResolvedValue([
      { id: 'old', created_at: '2026-01-01T00:00:00Z' },
      { id: 'new', created_at: '2026-06-01T00:00:00Z' },
      { id: 'mid', created_at: '2026-03-01T00:00:00Z' },
    ] as any);

    const result = await bookingRepository.getRecentBookings(2);

    expect(result.map((b) => b.id)).toEqual(['new', 'mid']);
  });

  it('defaults the limit to 5', async () => {
    const many = Array.from({ length: 8 }, (_, i) => ({
      id: String(i),
      created_at: `2026-01-0${i + 1}T00:00:00Z`,
    }));
    mockedService.getBookings.mockResolvedValue(many as any);

    const result = await bookingRepository.getRecentBookings();

    expect(result).toHaveLength(5);
  });

  it('swallows errors and returns an empty array', async () => {
    mockedService.getBookings.mockRejectedValue(new Error('network down'));

    const result = await bookingRepository.getRecentBookings();

    expect(result).toEqual([]);
  });
});

describe('bookingRepository.updateBookingStatus', () => {
  it('delegates to the service and returns the updated booking', async () => {
    const updated = { id: 'b1', status: 'cancelled' };
    mockedService.updateBookingStatus.mockResolvedValue(updated as any);

    const result = await bookingRepository.updateBookingStatus('b1', 'cancelled');

    expect(mockedService.updateBookingStatus).toHaveBeenCalledWith('b1', 'cancelled');
    expect(result).toEqual(updated);
  });

  it('re-throws on failure (write errors must not be hidden)', async () => {
    mockedService.updateBookingStatus.mockRejectedValue(new Error('403'));

    await expect(
      bookingRepository.updateBookingStatus('b1', 'cancelled'),
    ).rejects.toThrow('403');
  });
});

describe('bookingRepository.cancelBooking', () => {
  it('cancels by setting status to "cancelled"', async () => {
    mockedService.updateBookingStatus.mockResolvedValue({ id: 'b1' } as any);

    await bookingRepository.cancelBooking('b1');

    expect(mockedService.updateBookingStatus).toHaveBeenCalledWith('b1', 'cancelled');
  });
});

describe('bookingRepository.getSlots', () => {
  it('GETs /bookings/slots with params and unwraps response.data', async () => {
    mockedApi.get.mockResolvedValue({ data: { slots: ['09:00', '09:30'] } } as any);

    const params = { salon_id: 's1', booking_date: '2026-06-20', service_id: 'svc1' };
    const result = await bookingRepository.getSlots(params);

    expect(mockedApi.get).toHaveBeenCalledWith('/bookings/slots', { params });
    expect(result).toEqual({ slots: ['09:00', '09:30'] });
  });
});

describe('bookingRepository.reserveSlot', () => {
  it('POSTs /bookings/reserve and forwards options (e.g. timeout)', async () => {
    mockedApi.post.mockResolvedValue({ data: { hold_id: 'h1', expires_at: 'x' } } as any);

    const payload = {
      salon_id: 's1',
      service_id: 'svc1',
      booking_date: '2026-06-20',
      time_slot: '09:00',
    };
    const result = await bookingRepository.reserveSlot(payload, { timeout: 5000 });

    expect(mockedApi.post).toHaveBeenCalledWith('/bookings/reserve', payload, {
      timeout: 5000,
    });
    expect(result).toEqual({ hold_id: 'h1', expires_at: 'x' });
  });
});

describe('bookingRepository.createBooking', () => {
  it('POSTs /bookings/ with the payload and idempotency headers', async () => {
    mockedApi.post.mockResolvedValue({ data: { id: 'b-new' } } as any);

    const payload = { salon_id: 's1' };
    const options = { headers: { 'Idempotency-Key': 'k1' } };
    const result = await bookingRepository.createBooking(payload, options);

    expect(mockedApi.post).toHaveBeenCalledWith('/bookings/', payload, options);
    expect(result).toEqual({ id: 'b-new' });
  });
});

describe('bookingRepository.getSalonBookings', () => {
  it('returns the service result on success', async () => {
    mockedService.getSalonBookings.mockResolvedValue([{ id: 'b1' }] as any);

    const result = await bookingRepository.getSalonBookings('s1', { status: 'pending' });

    expect(mockedService.getSalonBookings).toHaveBeenCalledWith('s1', {
      status: 'pending',
    });
    expect(result).toEqual([{ id: 'b1' }]);
  });

  it('swallows errors and returns an empty array', async () => {
    mockedService.getSalonBookings.mockRejectedValue(new Error('500'));

    const result = await bookingRepository.getSalonBookings('s1');

    expect(result).toEqual([]);
  });
});
