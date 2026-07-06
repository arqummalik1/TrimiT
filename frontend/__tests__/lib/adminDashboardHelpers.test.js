import { describe, expect, it } from 'vitest';
import {
  detailViewTitle,
  filterOwnersByView,
  salonServeLabel,
  statCardViewMap,
} from '../../src/lib/adminDashboardHelpers';

describe('adminDashboardHelpers', () => {
  const owners = [
    { owner_id: '1', subscription_status: 'active', is_trial: false },
    { owner_id: '2', subscription_status: 'trial', is_trial: true },
    { owner_id: '3', subscription_status: 'expired', is_trial: false },
    { owner_id: '4', subscription_status: 'past_due', is_trial: false },
  ];

  it('maps stat cards to detail views', () => {
    const map = statCardViewMap();
    expect(map.salons).toBe('salons');
    expect(map.trials).toBe('trials');
    expect(map.mrr).toBe('revenue');
  });

  it('filters owners for trials and active', () => {
    expect(filterOwnersByView(owners, 'trials')).toHaveLength(1);
    expect(filterOwnersByView(owners, 'active')).toHaveLength(1);
    expect(filterOwnersByView(owners, 'expired')).toHaveLength(2);
  });

  it('labels salon gender serve', () => {
    expect(salonServeLabel('women')).toBe('Beauty parlour');
    expect(salonServeLabel('unisex')).toBe('Unisex salon');
  });

  it('returns detail panel titles', () => {
    expect(detailViewTitle('bookings')).toBe('Bookings');
    expect(detailViewTitle('visitors')).toBe('Visitor Analytics');
  });
});
