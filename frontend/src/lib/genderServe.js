/** Salon gender serve + customer discovery — shared with mobile. */

export const CUSTOMER_GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

export const DISCOVER_CHIP_OPTIONS = [
  { value: 'for_you', label: 'For you' },
  { value: 'men', label: "Men's" },
  { value: 'women', label: 'Parlor' },
  { value: 'all', label: 'All' },
];

export const SALON_SERVE_OPTIONS = [
  { value: 'men', label: "Men's salon" },
  { value: 'women', label: 'Parlor' },
  { value: 'unisex', label: 'Unisex' },
];

export const SERVICE_AUDIENCE_OPTIONS = [
  { value: 'men', label: 'Men' },
  { value: 'women', label: 'Women' },
  { value: 'both', label: 'Both' },
];

export const MENU_AUDIENCE_OPTIONS = [
  { value: 'men', label: 'Men' },
  { value: 'women', label: 'Women' },
  { value: 'all', label: 'All' },
];

export const DISCOVERY_PREF_OPTIONS = [
  { value: 'auto', label: 'Match my profile' },
  { value: 'men', label: "Men's salons" },
  { value: 'women', label: 'Parlors' },
  { value: 'all', label: 'Show all' },
];

export function salonTypeLabel(genderServe) {
  if (genderServe === 'men') return "Men's";
  if (genderServe === 'women') return 'Parlor';
  return 'Unisex';
}

export function discoverChipToApiFilter(chip, user) {
  if (chip === 'men') return 'men';
  if (chip === 'women') return 'women';
  if (chip === 'all') return undefined;
  return resolveDiscoveryApiFilter(user);
}

export function resolveDiscoveryApiFilter(user) {
  const pref = user?.discovery_audience ?? 'auto';
  if (pref === 'all') return undefined;
  if (pref === 'men') return 'men';
  if (pref === 'women') return 'women';
  if (user?.gender === 'male') return 'men';
  if (user?.gender === 'female') return 'women';
  return undefined;
}

export function defaultDiscoverChip(user) {
  const pref = user?.discovery_audience ?? 'auto';
  if (pref === 'all') return 'all';
  if (pref === 'men') return 'men';
  if (pref === 'women') return 'women';
  return 'for_you';
}

export function salonMatchesDiscoverFilter(salon, apiFilter) {
  const serve = salon?.gender_serve ?? 'unisex';
  if (!apiFilter) return true;
  if (apiFilter === 'men') return serve === 'men' || serve === 'unisex';
  if (apiFilter === 'women') return serve === 'women' || serve === 'unisex';
  return true;
}

export function filterServicesForMenuAudience(services, salonGenderServe, menuAudience) {
  const serve = salonGenderServe ?? 'unisex';
  if (serve !== 'unisex' || menuAudience === 'all') return services;
  return services.filter((svc) => {
    const aud = svc.audience ?? 'both';
    return aud === 'both' || aud === menuAudience;
  });
}

export function salonNeedsMenuAudienceChips(salonGenderServe) {
  return salonGenderServe === 'unisex';
}
