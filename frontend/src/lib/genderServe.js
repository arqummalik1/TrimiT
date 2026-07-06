/** Salon gender serve + customer discovery — shared with mobile. */

export const CUSTOMER_GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

export const DISCOVER_CHIP_OPTIONS = [
  { value: 'for_you', label: 'For you' },
  { value: 'men', label: "Men's" },
  { value: 'women', label: 'Beauty parlour' },
  { value: 'all', label: 'All' },
];

export const SALON_SERVE_OPTIONS = [
  { value: 'men', label: "Men's salon", hint: 'Haircuts, beard, grooming' },
  { value: 'women', label: 'Beauty parlour', hint: 'Hair, facial, beauty' },
  { value: 'unisex', label: 'Unisex salon', hint: 'Both men & women services' },
];

/** Premium picker on first owner onboarding step (force-pick before create form). */
export const BUSINESS_TYPE_PICKER_OPTIONS = [
  { value: 'men', title: "Men's salon", subtitle: 'Haircuts, beard & grooming', icon: 'cut' },
  { value: 'women', title: 'Beauty parlour', subtitle: 'Hair, facial & beauty', icon: 'sparkles' },
  { value: 'unisex', title: 'Unisex salon', subtitle: 'Services for everyone', icon: 'people' },
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
  { value: 'women', label: 'Beauty parlours' },
  { value: 'all', label: 'Show all' },
];

export function salonTypeLabel(genderServe) {
  if (genderServe === 'men') return "Men's";
  if (genderServe === 'women') return 'Beauty parlour';
  return 'Unisex';
}

/** Owner-facing copy keyed by salons.gender_serve — same API, different labels. */
export function getVenueCopy(genderServe) {
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
        settingsNoVenueTitle: 'Set up your business',
        settingsNoVenueMessage:
          'Create your salon, beauty parlour, or unisex studio',
        settingsCreateCta: 'Get started',
        editDetailsTitle: 'Edit parlour details',
        chooseTypeTitle: 'What type of business?',
        chooseTypeSubtitle:
          'Choose one to continue. You can update this later in settings.',
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
        settingsNoVenueTitle: 'Set up your business',
        settingsNoVenueMessage:
          'Create your salon, beauty parlour, or unisex studio',
        settingsCreateCta: 'Get started',
        editDetailsTitle: 'Edit business details',
        chooseTypeTitle: 'What type of business?',
        chooseTypeSubtitle:
          'Choose one to continue. You can update this later in settings.',
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
        settingsNoVenueTitle: 'Set up your business',
        settingsNoVenueMessage:
          'Create your salon, beauty parlour, or unisex studio',
        settingsCreateCta: 'Get started',
        editDetailsTitle: 'Edit salon details',
        chooseTypeTitle: 'What type of business?',
        chooseTypeSubtitle:
          'Choose one to continue. You can update this later in settings.',
      };
  }
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
