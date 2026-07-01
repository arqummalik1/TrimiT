/**
 * SalonAvailabilityToggle.js
 * Owner kill-switch for the web dashboard. Toggles accepting NEW bookings with
 * preset reopen windows. Existing bookings are never affected.
 */
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Moon, CheckCircle, CaretDown } from '@phosphor-icons/react';
import api from '../../lib/api';
import { useToastStore } from '../../store/toastStore';
import { getApiErrorMessage } from '../../lib/utils';
import { getSalonClosedState, getClosedLabel } from '../../lib/salonAvailability';

function atOpeningTime(daysFromNow, openingTime = '09:00') {
  const [h, m] = String(openingTime).split(':').map((n) => parseInt(n, 10));
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(Number.isFinite(h) ? h : 9, Number.isFinite(m) ? m : 0, 0, 0);
  return d.toISOString();
}

export default function SalonAvailabilityToggle({ salon }) {
  const queryClient = useQueryClient();
  const { error: showError, success } = useToastStore();
  const [menuOpen, setMenuOpen] = useState(false);

  const closedState = getSalonClosedState(salon);

  const mutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.patch(`/salons/${salon.id}/availability`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ownerSalon'] });
      setMenuOpen(false);
    },
    onError: (err) => showError(getApiErrorMessage(err, 'Could not update availability.')),
  });

  if (!salon) return null;

  const reopen = () =>
    mutation.mutate({ accepting_bookings: true }, { onSuccess: () => success('Your salon is open — accepting bookings') });

  const close = (closed_until, label) =>
    mutation.mutate(
      { accepting_bookings: false, closed_until },
      { onSuccess: () => success(label) }
    );

  if (closedState.closed) {
    return (
      <button
        type="button"
        onClick={reopen}
        disabled={mutation.isPending}
        className="inline-flex items-center gap-2 rounded-full border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
      >
        <span className="h-2 w-2 rounded-full bg-red-500" />
        {mutation.isPending ? 'Updating…' : `${getClosedLabel(closedState)} · Open now`}
      </button>
    );
  }

  const opening = salon.opening_time || '09:00';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        disabled={mutation.isPending}
        className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
      >
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        {mutation.isPending ? 'Updating…' : 'Open · Accepting bookings'}
        <CaretDown size={14} weight="bold" />
      </button>

      {menuOpen && (
        <div className="absolute right-0 z-20 mt-2 w-64 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl">
          <div className="border-b border-stone-100 px-4 py-3">
            <p className="text-sm font-semibold text-stone-900">Stop taking bookings</p>
            <p className="text-xs text-stone-500">Existing bookings stay confirmed.</p>
          </div>
          {[
            { label: 'Pause for 2 hours', until: new Date(Date.now() + 2 * 3600 * 1000).toISOString(), msg: 'Paused for 2 hours' },
            { label: 'Closed for today', until: atOpeningTime(1, opening), msg: 'Closed for today' },
            { label: 'Closed for 3 days', until: atOpeningTime(3, opening), msg: 'Closed for 3 days' },
            { label: 'Closed until I reopen', until: null, msg: 'Closed until reopened' },
          ].map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => close(opt.until, opt.msg)}
              className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-stone-700 transition hover:bg-stone-50"
            >
              <Moon size={16} className="text-orange-700" />
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
