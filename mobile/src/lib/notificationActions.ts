/**
 * Owner interactive push actions (Accept/Reject booking, Verify/Reject payment).
 * Used when the owner taps notification action buttons while app is BG/killed.
 */

import { bookingRepository } from '../repositories/bookingRepository';
import { paymentRepository } from '../repositories/paymentRepository';
import { logger } from './logger';
import {
  ACTION_ACCEPT_BOOKING,
  ACTION_REJECT_BOOKING,
  ACTION_REJECT_PAYMENT,
  ACTION_VERIFY_PAYMENT,
} from './pushConstants';
import type { PushPayload } from './notificationNavigation';

export type NotificationActionResult =
  | { handled: false; reason: 'default_or_unknown' }
  | { handled: true; action: string; bookingId: string; ok: boolean; error?: string };

function resolveBookingId(data: PushPayload | Record<string, unknown> | undefined): string | null {
  if (!data) return null;
  const id =
    (typeof data.booking_id === 'string' && data.booking_id) ||
    (typeof data.bookingId === 'string' && data.bookingId) ||
    null;
  if (!id) return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id) ? id : null;
}

function isPaymentAction(action: string): boolean {
  return action === ACTION_VERIFY_PAYMENT || action === ACTION_REJECT_PAYMENT;
}

/**
 * Human toast for handled owner notification actions (success or failure).
 * Keeps booking vs payment failure copy accurate.
 */
export function toastForOwnerNotificationAction(
  action: string,
  ok: boolean
): { message: string; type: 'success' | 'error' } {
  if (ok) {
    switch (action) {
      case ACTION_ACCEPT_BOOKING:
        return { message: 'Booking accepted', type: 'success' };
      case ACTION_REJECT_BOOKING:
        return { message: 'Booking rejected', type: 'success' };
      case ACTION_VERIFY_PAYMENT:
        return { message: 'Payment verified', type: 'success' };
      case ACTION_REJECT_PAYMENT:
        return { message: 'Payment rejected', type: 'success' };
      default:
        return { message: 'Done', type: 'success' };
    }
  }

  if (isPaymentAction(action)) {
    return {
      message: 'Could not update payment from notification',
      type: 'error',
    };
  }

  return {
    message: 'Could not update booking from notification',
    type: 'error',
  };
}

/**
 * Run Accept/Reject/Verify from a notification actionIdentifier.
 * Default tap (opensApp / DEFAULT) returns handled: false so navigation can run.
 */
export async function handleOwnerNotificationAction(
  actionIdentifier: string | undefined | null,
  data: PushPayload | Record<string, unknown> | undefined
): Promise<NotificationActionResult> {
  const action = actionIdentifier ?? '';
  if (
    action !== ACTION_ACCEPT_BOOKING &&
    action !== ACTION_REJECT_BOOKING &&
    action !== ACTION_VERIFY_PAYMENT &&
    action !== ACTION_REJECT_PAYMENT
  ) {
    return { handled: false, reason: 'default_or_unknown' };
  }

  const bookingId = resolveBookingId(data);
  if (!bookingId) {
    logger.warn('[PushAction] Missing booking id for action', { action });
    return { handled: true, action, bookingId: '', ok: false, error: 'missing_booking_id' };
  }

  try {
    if (action === ACTION_ACCEPT_BOOKING) {
      await bookingRepository.updateBookingStatus(bookingId, 'confirmed');
    } else if (action === ACTION_REJECT_BOOKING) {
      await bookingRepository.updateBookingStatus(bookingId, 'cancelled');
    } else if (action === ACTION_VERIFY_PAYMENT) {
      await paymentRepository.verifyPayment(bookingId);
    } else if (action === ACTION_REJECT_PAYMENT) {
      await paymentRepository.rejectPayment(bookingId);
    }
    logger.info('[PushAction] completed', { action, bookingId });
    return { handled: true, action, bookingId, ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('[PushAction] failed', { action, bookingId, message });
    return { handled: true, action, bookingId, ok: false, error: message };
  }
}
