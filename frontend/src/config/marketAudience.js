import { explorePath } from './jammu';

/** Homepage + explore audience chips — mirrors mobile discover filters. */
export const MARKET_AUDIENCE_OPTIONS = [
  {
    id: 'men',
    title: "Men's salons",
    subtitle: 'Haircuts, beard & grooming',
    exploreGender: 'men',
    icon: 'cut',
    gradient: 'from-stone-800 to-stone-900',
    accent: 'text-orange-300',
  },
  {
    id: 'women',
    title: 'Beauty parlours',
    subtitle: 'Hair, facial & beauty',
    exploreGender: 'women',
    icon: 'sparkles',
    gradient: 'from-orange-900 to-orange-950',
    accent: 'text-orange-200',
  },
  {
    id: 'unisex',
    title: 'Unisex salons',
    subtitle: 'Services for everyone',
    exploreGender: null,
    exploreQuery: 'unisex',
    icon: 'people',
    gradient: 'from-stone-900 to-orange-950',
    accent: 'text-emerald-300',
  },
];

export function audienceExplorePath(option) {
  return explorePath({
    gender_serve: option.exploreGender || undefined,
    q: option.exploreQuery || '',
  });
}
