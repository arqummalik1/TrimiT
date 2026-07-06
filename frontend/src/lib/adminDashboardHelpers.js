/** Admin dashboard drill-down helpers — filter owners/salons by stat card type. */

import { SALON_SERVE_OPTIONS } from './genderServe';

const EXPIRED_STATUSES = new Set(['expired', 'cancelled', 'past_due', 'payment_failed']);

export function salonServeLabel(genderServe) {
  const match = SALON_SERVE_OPTIONS.find((o) => o.value === genderServe);
  return match?.label ?? (genderServe ? String(genderServe) : '—');
}

export function filterOwnersByView(owners, view) {
  if (!Array.isArray(owners)) return [];
  switch (view) {
    case 'owners':
      return owners;
    case 'trials':
      return owners.filter((o) => o.is_trial || o.subscription_status === 'trial');
    case 'active':
      return owners.filter((o) => o.subscription_status === 'active');
    case 'expired':
      return owners.filter((o) => EXPIRED_STATUSES.has(o.subscription_status));
    default:
      return owners;
  }
}

export function detailViewTitle(view) {
  const titles = {
    owners: 'Salon Owners',
    customers: 'Customers',
    salons: 'Salons',
    bookings: 'Bookings',
    trials: 'Trials',
    active: 'Active Subscriptions',
    expired: 'Expired / Lapsed',
    revenue: 'Revenue Summary',
    visitors: 'Visitor Analytics',
  };
  return titles[view] ?? 'Details';
}

export function statCardViewMap() {
  return {
    owners: 'owners',
    customers: 'customers',
    salons: 'salons',
    bookings: 'bookings',
    mrr: 'revenue',
    arr: 'revenue',
    revenue: 'revenue',
    active: 'active',
    trials: 'trials',
    expired: 'expired',
    views: 'visitors',
    visitors: 'visitors',
  };
}
