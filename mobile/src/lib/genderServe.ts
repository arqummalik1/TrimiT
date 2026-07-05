/** Salon gender serve + customer discovery — labels, filters, helpers. */

import type { Salon, Service, User } from '../types';

export type SalonGenderServe = 'men' | 'women' | 'unisex';
export type ServiceAudience = 'men' | 'women' | 'both';
export type CustomerGender = 'male' | 'female';
export type DiscoveryAudience = 'auto' | 'men' | 'women' | 'all';
export type DiscoverChip = 'for_you' | 'men' | 'women' | 'all';
export type MenuAudienceFilter = 'men' | 'women' | 'all';

export const SALON_TYPE_LABELS: Record<SalonGenderServe, string> = {
  men: "Men's salon",
  women: 'Parlor',
  unisex: 'Unisex',
};

export const DISCOVER_CHIP_OPTIONS: { value: DiscoverChip; label: string }[] = [
  { value: 'for_you', label: 'For you' },
  { value: 'men', label: "Men's" },
  { value: 'women', label: 'Parlor' },
  { value: 'all', label: 'All' },
];

export const CUSTOMER_GENDER_OPTIONS: { value: CustomerGender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

export const SALON_SERVE_OPTIONS: { value: SalonGenderServe; label: string; hint: string }[] = [
  { value: 'men', label: "Men's salon", hint: 'Haircuts, beard, grooming' },
  { value: 'women', label: 'Parlor', hint: 'Hair, facial, beauty' },
  { value: 'unisex', label: 'Unisex', hint: 'Both men & women services' },
];

export const SERVICE_AUDIENCE_OPTIONS: { value: ServiceAudience; label: string }[] = [
  { value: 'men', label: 'Men' },
  { value: 'women', label: 'Women' },
  { value: 'both', label: 'Both' },
];

export const DISCOVERY_PREF_OPTIONS: { value: DiscoveryAudience; label: string }[] = [
  { value: 'auto', label: 'Match my profile' },
  { value: 'men', label: "Men's salons" },
  { value: 'women', label: 'Parlors' },
  { value: 'all', label: 'Show all' },
];

export const MENU_AUDIENCE_OPTIONS: { value: MenuAudienceFilter; label: string }[] = [
  { value: 'men', label: 'Men' },
  { value: 'women', label: 'Women' },
  { value: 'all', label: 'All' },
];

/** API query param for GET /salons — men | women | undefined (all). */
export function discoverChipToApiFilter(chip: DiscoverChip, user: User | null): string | undefined {
  if (chip === 'men') return 'men';
  if (chip === 'women') return 'women';
  if (chip === 'all') return undefined;
  return resolveDiscoveryApiFilter(user);
}

export function resolveDiscoveryApiFilter(user: User | null | undefined): string | undefined {
  const pref = user?.discovery_audience ?? 'auto';
  if (pref === 'all') return undefined;
  if (pref === 'men') return 'men';
  if (pref === 'women') return 'women';
  if (user?.gender === 'male') return 'men';
  if (user?.gender === 'female') return 'women';
  return undefined;
}

export function defaultDiscoverChip(user: User | null | undefined): DiscoverChip {
  const pref = user?.discovery_audience ?? 'auto';
  if (pref === 'all') return 'all';
  if (pref === 'men') return 'men';
  if (pref === 'women') return 'women';
  return 'for_you';
}

export function salonMatchesDiscoverFilter(
  salon: Pick<Salon, 'gender_serve'>,
  apiFilter: string | undefined,
): boolean {
  const serve = salon.gender_serve ?? 'unisex';
  if (!apiFilter) return true;
  if (apiFilter === 'men') return serve === 'men' || serve === 'unisex';
  if (apiFilter === 'women') return serve === 'women' || serve === 'unisex';
  return true;
}

/** Unisex salon menu — filter services before category grouping. */
export function filterServicesForMenuAudience(
  services: Service[],
  salonGenderServe: SalonGenderServe | undefined,
  menuAudience: MenuAudienceFilter,
): Service[] {
  const serve = salonGenderServe ?? 'unisex';
  if (serve !== 'unisex' || menuAudience === 'all') return services;
  return services.filter((svc) => {
    const aud = svc.audience ?? 'both';
    return aud === 'both' || aud === menuAudience;
  });
}

export function salonNeedsMenuAudienceChips(salonGenderServe?: SalonGenderServe): boolean {
  return salonGenderServe === 'unisex';
}
