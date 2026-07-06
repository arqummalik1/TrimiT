import {
  CalendarCheck,
  Scissors,
  Drop,
  Star,
  Sparkle,
  MapPin,
} from '@phosphor-icons/react';

export const BLOG_POSTS = [
  {
    slug: 'best-salon-booking-tips-jammu',
    title: '5 tips for booking salons in Jammu online',
    excerpt:
      'How to pick the right salon, compare slots, and get the best grooming experience in Jammu with TrimiT.',
    date: 'May 2026',
    datePublished: '2026-05-10',
    icon: <CalendarCheck size={48} weight="duotone" />,
    body: `Booking a salon in Jammu does not have to mean endless phone calls. With TrimiT you can compare salons by rating and distance, see live availability, and confirm your appointment in minutes.

**1. Search by service, not just salon name** — Try "beard trim" or "bridal makeup" to find specialists across Gandhinagar, Trikuta Nagar, and other areas.

**2. Check reviews** — Real customer ratings help you choose trusted professionals.

**3. Book off-peak** — Weekday mornings often have more open slots.

**4. Use the Android app** — Get reminders so you never miss an appointment.

**5. List your salon** — If you are an owner, join TrimiT free to get discovered by customers searching for salon booking in Jammu.`,
  },
  {
    slug: 'mens-grooming-guide-jammu',
    title: "Men's grooming in Jammu: what to book",
    excerpt:
      'Haircuts, beard shaping, and grooming packages — a quick guide for men\'s salons in Jammu.',
    date: 'May 2026',
    datePublished: '2026-05-15',
    icon: <Scissors size={48} weight="duotone" />,
    body: `Jammu has excellent men's salons for haircuts, beard grooming, and full grooming packages. On TrimiT you can filter by service and book men's salon appointments online.

Popular services include fades and classic cuts, beard trim and hot towel shave, and combo packages that save time. Look for salons with high ratings near your neighbourhood, and book 24/7 even when the shop is closed.`,
  },
  {
    slug: 'spa-wellness-jammu',
    title: 'Spa booking in Jammu: relax with TrimiT',
    excerpt:
      'Massages, facials, and wellness treatments — how to find spa services in Jammu.',
    date: 'May 2026',
    datePublished: '2026-05-20',
    icon: <Drop size={48} weight="duotone" />,
    body: `Spa and wellness centres in Jammu offer head massages, body treatments, and couple packages. TrimiT lets you browse spa services in Jammu, compare prices, and reserve your slot without waiting on hold.

Whether you need stress relief after work or a pre-event facial, search "spa" on TrimiT and book spa appointments in Jammu with instant confirmation.`,
    seoKeywords:
      'spa Jammu, spa booking Jammu, wellness salon Jammu, massage Jammu, TrimiT',
  },
  {
    slug: 'beauty-parlour-near-me-jammu',
    title: 'How to find a beauty parlour near me in Jammu',
    excerpt:
      'Tips for finding the best women\'s beauty parlours near you in Jammu — and booking online without calls.',
    date: 'July 2026',
    datePublished: '2026-07-01',
    icon: <MapPin size={48} weight="duotone" />,
    body: `Searching "beauty parlour near me" or "parlour near me" in Jammu? TrimiT makes it easy to discover women's beauty parlours across Gandhinagar, Trikuta Nagar, Channi Himmat, and the rest of the city.

**Use location sorting** — Allow location on TrimiT Explore to see parlours sorted by distance.

**Filter by service** — Search "facial", "threading", or "bridal" to narrow results.

**Read reviews** — Pick the best beauty parlour in Jammu using real customer ratings.

**Book online** — Parlour booking in Jammu takes under a minute with live slots and instant confirmation.

Whether you need a quick threading appointment or a full bridal package, TrimiT is the easiest way to find a parlour near you in Jammu.`,
    seoKeywords:
      'beauty parlour near me Jammu, parlour near me Jammu, best beauty parlours Jammu, parlour booking Jammu, women parlour Jammu',
  },
  {
    slug: 'salon-parlour-booking-jammu',
    title: 'Salon & parlour booking in Jammu: complete guide',
    excerpt:
      'Everything you need to know about online salon booking and beauty parlour booking in Jammu.',
    date: 'July 2026',
    datePublished: '2026-07-02',
    icon: <Sparkle size={48} weight="duotone" />,
    body: `Salon booking and parlour booking in Jammu no longer means calling five shops and hoping someone picks up. TrimiT brings men's salons, gents saloons, women's beauty parlours, and unisex studios onto one platform.

**Salon booking Jammu** — Browse men's and unisex listings, compare ratings, and reserve haircuts or grooming packages with live availability.

**Parlour booking Jammu** — Women's beauty parlours list facials, threading, waxing, and bridal services with transparent starting prices.

**Best saloons in Jammu** — Sort by rating to find top-rated saloons and salons before you visit.

**Pay at venue** — Many listings let you pay at the salon or parlour after your service.

TrimiT is built for Jammu & Kashmir first, with more cities coming across India. Download the Android app for reminders, or book on trimit.online anytime.`,
    seoKeywords:
      'salon booking Jammu, saloon booking Jammu, parlour booking Jammu, beauty parlour booking Jammu, best saloons Jammu, TrimiT',
  },
];

export function getPostBySlug(slug) {
  return BLOG_POSTS.find((p) => p.slug === slug);
}
