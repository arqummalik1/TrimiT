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
import {
  handleOwnerNotificationAction,
  toastForOwnerNotificationAction,
} from '../../src/lib/notificationActions';
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
    expect(result.handled).toBe(true);
    if (result.handled) {
      expect(result.ok).toBe(true);
    }
    expect(bookingRepository.updateBookingStatus).toHaveBeenCalledWith(bookingId, 'cancelled');
  });

  it('verifies payment on VERIFY_PAYMENT', async () => {
    const result = await handleOwnerNotificationAction(ACTION_VERIFY_PAYMENT, {
      booking_id: bookingId,
    });
    expect(result.handled).toBe(true);
    if (result.handled) {
      expect(result.ok).toBe(true);
    }
    expect(paymentRepository.verifyPayment).toHaveBeenCalledWith(bookingId);
  });

  it('rejects payment on REJECT_PAYMENT', async () => {
    const result = await handleOwnerNotificationAction(ACTION_REJECT_PAYMENT, {
      booking_id: bookingId,
    });
    expect(result.handled).toBe(true);
    if (result.handled) {
      expect(result.ok).toBe(true);
    }
    expect(paymentRepository.rejectPayment).toHaveBeenCalledWith(bookingId);
  });

  it('fails gracefully when booking id missing', async () => {
    const result = await handleOwnerNotificationAction(ACTION_ACCEPT_BOOKING, {
      type: 'new_booking',
    });
    expect(result.handled).toBe(true);
    if (result.handled) {
      expect(result.ok).toBe(false);
    }
  });
});

describe('toastForOwnerNotificationAction', () => {
  it('uses payment copy for verify/reject payment failures', () => {
    expect(toastForOwnerNotificationAction(ACTION_VERIFY_PAYMENT, false)).toEqual({
      message: 'Could not update payment from notification',
      type: 'error',
    });
    expect(toastForOwnerNotificationAction(ACTION_REJECT_PAYMENT, false)).toEqual({
      message: 'Could not update payment from notification',
      type: 'error',
    });
  });

  it('uses booking copy for accept/reject booking failures', () => {
    expect(toastForOwnerNotificationAction(ACTION_ACCEPT_BOOKING, false)).toEqual({
      message: 'Could not update booking from notification',
      type: 'error',
    });
    expect(toastForOwnerNotificationAction(ACTION_REJECT_BOOKING, false)).toEqual({
      message: 'Could not update booking from notification',
      type: 'error',
    });
  });

  it('uses specific success copy per action', () => {
    expect(toastForOwnerNotificationAction(ACTION_ACCEPT_BOOKING, true).message).toBe(
      'Booking accepted'
    );
    expect(toastForOwnerNotificationAction(ACTION_REJECT_BOOKING, true).message).toBe(
      'Booking rejected'
    );
    expect(toastForOwnerNotificationAction(ACTION_VERIFY_PAYMENT, true).message).toBe(
      'Payment verified'
    );
    expect(toastForOwnerNotificationAction(ACTION_REJECT_PAYMENT, true).message).toBe(
      'Payment rejected'
    );
  });
});

function NotificationsDefault(): string {
  return 'expo.modules.notifications.actions.DEFAULT';
}
