/**
 * salonAvailability.ts — client-side mirror of the backend open/close logic.
 *
 * A salon is "closed" when the owner turned OFF new bookings AND any timed
 * reopen window has not yet passed. Evaluated lazily so the UI auto-reflects a
 * reopen the instant the time passes, matching the backend gate.
 */
import type { Salon } from '../types';

export interface ClosedState {
  closed: boolean;
  reopenAt: Date | null;
  reason: string | null;
}

export function getSalonClosedState(salon: Pick<Salon, 'accepting_bookings' | 'closed_until' | 'closed_reason'> | null | undefined): ClosedState {
  if (!salon) return { closed: false, reopenAt: null, reason: null };

  const accepting = salon.accepting_bookings;
  // Treat missing column (pre-migration rows) as open.
  if (accepting === undefined || accepting === null || accepting === true) {
    return { closed: false, reopenAt: null, reason: null };
  }

  const reopenAt = salon.closed_until ? new Date(salon.closed_until) : null;
  if (reopenAt && !Number.isNaN(reopenAt.getTime()) && Date.now() >= reopenAt.getTime()) {
    // Timed window elapsed → effectively open.
    return { closed: false, reopenAt: null, reason: null };
  }

  return {
    closed: true,
    reopenAt: reopenAt && !Number.isNaN(reopenAt.getTime()) ? reopenAt : null,
    reason: salon.closed_reason ?? null,
  };
}

/** Short human label e.g. "Closed · reopens 9:00 AM" or "Temporarily closed". */
export function getClosedLabel(state: ClosedState): string {
  if (!state.closed) return '';
  if (!state.reopenAt) return 'Temporarily closed';
  const now = new Date();
  const sameDay = state.reopenAt.toDateString() === now.toDateString();
  const time = state.reopenAt.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  });
  if (sameDay) return `Closed · reopens ${time}`;
  const date = state.reopenAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return `Closed · reopens ${date}, ${time}`;
}
