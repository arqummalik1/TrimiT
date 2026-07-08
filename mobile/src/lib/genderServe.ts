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
  women: "Women's salon",
  unisex: 'Unisex salon',
};

export const DISCOVER_CHIP_OPTIONS: { value: DiscoverChip; label: string }[] = [
  { value: 'for_you', label: 'For you' },
  { value: 'men', label: 'Men' },
  { value: 'women', label: 'Women' },
  { value: 'all', label: 'All' },
];

export const CUSTOMER_GENDER_OPTIONS: { value: CustomerGender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

export const SALON_SERVE_OPTIONS: { value: SalonGenderServe; label: string; hint: string }[] = [
  { value: 'men', label: "Men's salon", hint: 'Haircuts, beard, grooming' },
  { value: 'women', label: 'Beauty parlour', hint: 'Hair, facial, beauty' },
  { value: 'unisex', label: 'Unisex salon', hint: 'Both men & women services' },
];

/** Premium picker on first owner onboarding step (force-pick before create form). */
export const BUSINESS_TYPE_PICKER_OPTIONS: {
  value: SalonGenderServe;
  title: string;
  subtitle: string;
  icon: 'cut' | 'sparkles' | 'people';
}[] = [
  { value: 'men', title: "Men's salon", subtitle: 'Haircuts, beard & grooming', icon: 'cut' },
  { value: 'women', title: 'Beauty parlour', subtitle: 'Hair, facial & beauty', icon: 'sparkles' },
  { value: 'unisex', title: 'Unisex salon', subtitle: 'Services for everyone', icon: 'people' },
];

export interface VenueCopy {
  entityName: string;
  customerBadge: string;
  createCta: string;
  editTitle: string;
  manageTitle: string;
  imagesSection: string;
  emptyDashboardTitle: string;
  emptyDashboardMessage: string;
  emptyDashboardCta: string;
  nameLabel: string;
  namePlaceholder: string;
  descriptionPlaceholder: string;
  pinLocationHint: string;
  successCreated: string;
  settingsNoVenueTitle: string;
  settingsNoVenueMessage: string;
  settingsCreateCta: string;
  editDetailsTitle: string;
  chooseTypeTitle: string;
  chooseTypeSubtitle: string;
}

export function salonTypeLabel(genderServe?: SalonGenderServe): string {
  if (genderServe === 'men') return 'Men';
  if (genderServe === 'women') return 'Women';
  return 'Unisex';
}

export function getVenueCopy(genderServe: SalonGenderServe): VenueCopy {
  switch (genderServe) {
    case 'women':
      return {
        entityName: 'Beauty parlour',
        customerBadge: 'Beauty parlour',
        createCta: 'Create your beauty parlour',
        editTitle: 'Edit beauty parlour',
        manageTitle: 'Manage parlour',
        imagesSection: 'Parlour photos',
        emptyDashboardTitle: 'Create your beauty parlour',
        emptyDashboardMessage:
          'Set up your beauty parlour profile, then add services so customers can book you.',
        emptyDashboardCta: 'Get started',
        nameLabel: 'Parlour name',
        namePlaceholder: 'Enter parlour name',
        descriptionPlaceholder: 'Describe your beauty parlour',
        pinLocationHint: 'Pin your exact parlour location on the map',
        successCreated: 'Your beauty parlour is live!',
        settingsNoVenueTitle: 'No beauty parlour yet',
        settingsNoVenueMessage: 'Create your beauty parlour to unlock all features',
        settingsCreateCta: 'Create your beauty parlour',
        editDetailsTitle: 'Edit parlour details',
        chooseTypeTitle: 'What type of business?',
        chooseTypeSubtitle: 'Pick the option that best describes your parlour or studio.',
      };
    case 'unisex':
      return {
        entityName: 'Unisex salon',
        customerBadge: 'Unisex',
        createCta: 'Create your unisex salon',
        editTitle: 'Edit unisex salon',
        manageTitle: 'Manage business',
        imagesSection: 'Business photos',
        emptyDashboardTitle: 'Create your unisex salon',
        emptyDashboardMessage:
          'Set up your business profile, then add services so customers can book you.',
        emptyDashboardCta: 'Get started',
        nameLabel: 'Business name',
        namePlaceholder: 'Enter business name',
        descriptionPlaceholder: 'Describe your salon',
        pinLocationHint: 'Pin your exact business location on the map',
        successCreated: 'Your unisex salon is live!',
        settingsNoVenueTitle: 'No business yet',
        settingsNoVenueMessage: 'Create your unisex salon to unlock all features',
        settingsCreateCta: 'Create your unisex salon',
        editDetailsTitle: 'Edit business details',
        chooseTypeTitle: 'What type of business?',
        chooseTypeSubtitle: 'Pick the option that best describes your salon or studio.',
      };
    case 'men':
    default:
      return {
        entityName: "Men's salon",
        customerBadge: "Men's",
        createCta: 'Create your salon',
        editTitle: 'Edit salon',
        manageTitle: 'Manage salon',
        imagesSection: 'Salon photos',
        emptyDashboardTitle: 'Create your salon',
        emptyDashboardMessage:
          'Set up your salon profile, then add services so customers can book you.',
        emptyDashboardCta: 'Get started',
        nameLabel: 'Salon name',
        namePlaceholder: 'Enter salon name',
        descriptionPlaceholder: 'Describe your salon',
        pinLocationHint: 'Pin your exact salon location on the map',
        successCreated: 'Your salon is live!',
        settingsNoVenueTitle: 'No salon yet',
        settingsNoVenueMessage: 'Create your salon to unlock all features',
        settingsCreateCta: 'Create your salon',
        editDetailsTitle: 'Edit salon details',
        chooseTypeTitle: 'What type of business?',
        chooseTypeSubtitle: 'Pick the option that best describes your salon or studio.',
      };
  }
}

export const SERVICE_AUDIENCE_OPTIONS: { value: ServiceAudience; label: string }[] = [
  { value: 'men', label: 'Men' },
  { value: 'women', label: 'Women' },
  { value: 'both', label: 'Both' },
];

export const DISCOVERY_PREF_OPTIONS: { value: DiscoveryAudience; label: string }[] = [
  { value: 'auto', label: 'Match my profile' },
  { value: 'men', label: 'Men' },
  { value: 'women', label: 'Women' },
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
  if (pref === 'men') return 'men';
  if (pref === 'women') return 'women';
  // `auto`, `all`, or unset → For you (gender-based relevance via discoverChipToApiFilter).
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
