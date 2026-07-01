/**
 * salonAvailability.js — web mirror of the backend open/close logic.
 *
 * A salon is "closed" when the owner turned OFF new bookings AND any timed
 * reopen window has not yet passed. Evaluated lazily so the UI auto-reflects a
 * reopen the instant the time passes.
 */

export function getSalonClosedState(salon) {
  if (!salon) return { closed: false, reopenAt: null, reason: null };

  const accepting = salon.accepting_bookings;
  // Treat missing column (pre-migration rows) as open.
  if (accepting === undefined || accepting === null || accepting === true) {
    return { closed: false, reopenAt: null, reason: null };
  }

  const reopenAt = salon.closed_until ? new Date(salon.closed_until) : null;
  if (reopenAt && !Number.isNaN(reopenAt.getTime()) && Date.now() >= reopenAt.getTime()) {
    return { closed: false, reopenAt: null, reason: null };
  }

  return {
    closed: true,
    reopenAt: reopenAt && !Number.isNaN(reopenAt.getTime()) ? reopenAt : null,
    reason: salon.closed_reason ?? null,
  };
}

export function getClosedLabel(state) {
  if (!state || !state.closed) return '';
  if (!state.reopenAt) return 'Temporarily closed';
  const now = new Date();
  const sameDay = state.reopenAt.toDateString() === now.toDateString();
  const time = state.reopenAt.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  if (sameDay) return `Closed · reopens ${time}`;
  const date = state.reopenAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return `Closed · reopens ${date}, ${time}`;
}
