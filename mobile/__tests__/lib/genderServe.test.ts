import {
  discoverChipToApiFilter,
  resolveDiscoveryApiFilter,
  salonMatchesDiscoverFilter,
  filterServicesForMenuAudience,
  defaultDiscoverChip,
  salonNeedsMenuAudienceChips,
} from '../../src/lib/genderServe';
import type { Salon, Service, User } from '../../src/types';

describe('genderServe', () => {
  const maleUser: User = {
    id: '1',
    email: 'a@b.com',
    name: 'A',
    role: 'customer',
    gender: 'male',
    discovery_audience: 'auto',
    created_at: '',
  };

  const femaleUser: User = {
    ...maleUser,
    gender: 'female',
  };

  it('resolves API filter from user profile', () => {
    expect(resolveDiscoveryApiFilter(maleUser)).toBe('men');
    expect(resolveDiscoveryApiFilter(femaleUser)).toBe('women');
    expect(resolveDiscoveryApiFilter({ ...maleUser, discovery_audience: 'all' })).toBeUndefined();
  });

  it('maps discover chips to API filter', () => {
    expect(discoverChipToApiFilter('all', maleUser)).toBeUndefined();
    expect(discoverChipToApiFilter('men', femaleUser)).toBe('men');
    expect(discoverChipToApiFilter('for_you', maleUser)).toBe('men');
  });

  it('filters salons client-side as backup', () => {
    const menSalon = { gender_serve: 'men' as const };
    const womenSalon = { gender_serve: 'women' as const };
    expect(salonMatchesDiscoverFilter(menSalon, 'men')).toBe(true);
    expect(salonMatchesDiscoverFilter(womenSalon, 'men')).toBe(false);
    expect(salonMatchesDiscoverFilter({ gender_serve: 'unisex' }, 'women')).toBe(true);
  });

  it('filters unisex menu services by audience', () => {
    const services: Service[] = [
      { id: '1', salon_id: 's', name: 'Cut', price: 100, duration: 30, audience: 'men', created_at: '' },
      { id: '2', salon_id: 's', name: 'Facial', price: 200, duration: 45, audience: 'women', created_at: '' },
    ];
    const menOnly = filterServicesForMenuAudience(services, 'unisex', 'men');
    expect(menOnly).toHaveLength(1);
    expect(menOnly[0].name).toBe('Cut');
  });

  it('skips menu chips for dedicated salons', () => {
    expect(salonNeedsMenuAudienceChips('men')).toBe(false);
    expect(salonNeedsMenuAudienceChips('unisex')).toBe(true);
  });

  it('default discover chip respects preference', () => {
    expect(defaultDiscoverChip({ ...maleUser, discovery_audience: 'all' })).toBe('all');
    expect(defaultDiscoverChip(maleUser)).toBe('for_you');
  });
});
