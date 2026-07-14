/**
 * Owner notification action handlers (Accept/Reject / Verify).
 */
jest.mock('../../src/repositories/bookingRepository', () => ({
  bookingRepository: {
    updateBookingStatus: jest.fn(() => Promise.resolve({})),
  },
}));

jest.mock('../../src/repositories/paymentRepository', () => ({
  paymentRepository: {
    verifyPayment: jest.fn(() => Promise.resolve({})),
    rejectPayment: jest.fn(() => Promise.resolve({})),
  },
}));

jest.mock('../../src/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { bookingRepository } from '../../src/repositories/bookingRepository';
import { paymentRepository } from '../../src/repositories/paymentRepository';
import { handleOwnerNotificationAction } from '../../src/lib/notificationActions';
import {
  ACTION_ACCEPT_BOOKING,
  ACTION_REJECT_BOOKING,
  ACTION_VERIFY_PAYMENT,
  ACTION_REJECT_PAYMENT,
} from '../../src/lib/pushConstants';

const bookingId = '11111111-1111-4111-8111-111111111111';

describe('handleOwnerNotificationAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ignores default tap so navigation can run', async () => {
    const result = await handleOwnerNotificationAction(
      NotificationsDefault(),
      { booking_id: bookingId, type: 'new_booking' }
    );
    expect(result.handled).toBe(false);
    expect(bookingRepository.updateBookingStatus).not.toHaveBeenCalled();
  });

  it('accepts booking on ACCEPT_BOOKING', async () => {
    const result = await handleOwnerNotificationAction(ACTION_ACCEPT_BOOKING, {
      booking_id: bookingId,
      type: 'new_booking',
    });
    expect(result).toEqual({ handled: true, action: ACTION_ACCEPT_BOOKING, bookingId, ok: true });
    expect(bookingRepository.updateBookingStatus).toHaveBeenCalledWith(bookingId, 'confirmed');
  });

  it('rejects booking on REJECT_BOOKING', async () => {
    const result = await handleOwnerNotificationAction(ACTION_REJECT_BOOKING, {
      bookingId,
    });
    expect(result.ok).toBe(true);
    expect(bookingRepository.updateBookingStatus).toHaveBeenCalledWith(bookingId, 'cancelled');
  });

  it('verifies payment on VERIFY_PAYMENT', async () => {
    const result = await handleOwnerNotificationAction(ACTION_VERIFY_PAYMENT, {
      booking_id: bookingId,
    });
    expect(result.ok).toBe(true);
    expect(paymentRepository.verifyPayment).toHaveBeenCalledWith(bookingId);
  });

  it('rejects payment on REJECT_PAYMENT', async () => {
    const result = await handleOwnerNotificationAction(ACTION_REJECT_PAYMENT, {
      booking_id: bookingId,
    });
    expect(result.ok).toBe(true);
    expect(paymentRepository.rejectPayment).toHaveBeenCalledWith(bookingId);
  });

  it('fails gracefully when booking id missing', async () => {
    const result = await handleOwnerNotificationAction(ACTION_ACCEPT_BOOKING, {
      type: 'new_booking',
    });
    expect(result.handled).toBe(true);
    expect(result.ok).toBe(false);
  });
});

function NotificationsDefault(): string {
  return 'expo.modules.notifications.actions.DEFAULT';
}
