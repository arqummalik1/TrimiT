import { describe, it, expect } from 'vitest';
import {
  discoverChipToApiFilter,
  filterServicesForMenuAudience,
  salonMatchesDiscoverFilter,
  getVenueCopy,
  salonTypeLabel,
} from '../../src/lib/genderServe';

describe('genderServe (web)', () => {
  const maleUser = { gender: 'male', discovery_audience: 'auto' };

  it('maps discover chips to API filter', () => {
    expect(discoverChipToApiFilter('men', maleUser)).toBe('men');
    expect(discoverChipToApiFilter('all', maleUser)).toBeUndefined();
  });

  it('filters unisex menu services', () => {
    const services = [
      { id: '1', audience: 'men' },
      { id: '2', audience: 'women' },
    ];
    expect(filterServicesForMenuAudience(services, 'unisex', 'men')).toHaveLength(1);
  });

  it('matches salon discover filter', () => {
    expect(salonMatchesDiscoverFilter({ gender_serve: 'women' }, 'men')).toBe(false);
    expect(salonMatchesDiscoverFilter({ gender_serve: 'unisex' }, 'men')).toBe(true);
  });

  it('returns venue copy per gender_serve', () => {
    expect(getVenueCopy('women').customerBadge).toBe('Beauty parlour');
    expect(getVenueCopy('unisex').createCta).toBe('Create your unisex salon');
    expect(salonTypeLabel('women')).toBe('Beauty parlour');
  });
});
