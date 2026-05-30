import { HOMEPAGE_FAQ } from './faq';

/** Programmatic SEO landing pages — path, meta, content */
export const SEO_PAGES = [
  {
    path: '/salons-in-jammu',
    title: 'Salons & Saloons in Jammu | Book Online — TrimiT',
    description:
      'Browse salons and hair saloons in Jammu and book haircuts, grooming, spa, and beauty services online. Verified listings with live slots on TrimiT.',
    keywords:
      'salons in Jammu, saloons in Jammu, salon booking Jammu, saloon booking Jammu, best salons Jammu, best saloons Jammu, salon near me Jammu, saloon near me Jammu, TrimiT, trim it',
    h1: 'Salons & Saloons in Jammu — book online',
    exploreQuery: '',
    intro:
      'Discover premium salons and saloons across Jammu and Kashmir on TrimiT. Compare ratings, services, and live appointment slots — from Gandhinagar to Trikuta Nagar. Salon/saloon booking in Jammu has never been easier.',
    faq: HOMEPAGE_FAQ.slice(0, 5),
    relatedPaths: ['/best-haircut-in-jammu', '/beard-trimming-jammu', '/spa-services-jammu'],
  },
  {
    path: '/best-haircut-in-jammu',
    title: 'Best Haircut & Hair Saloon in Jammu | Book Salons — TrimiT',
    description:
      "Find the best hair salons & saloons and haircuts in Jammu. Book men's and women's haircut appointments online with live availability.",
    keywords: 'best haircut Jammu, hair salon Jammu, hair saloon Jammu, haircut near me Jammu, saloon near me Jammu, book haircut online, book saloon online',
    h1: 'Best haircut & hair saloon in Jammu',
    exploreQuery: 'haircut',
    intro:
      "Looking for the best haircut or hair saloon in Jammu? TrimiT lists top hair salons and grooming saloons with transparent pricing, reviews, and instant booking. Whether you want a fade, trim, or colour, book your appointment in Jammu in minutes.",
    faq: [
      {
        q: 'How much does a haircut cost in Jammu?',
        a: 'Prices vary by salon and service. TrimiT shows starting prices on each salon profile before you book.',
      },
      {
        q: 'Can I book a same-day haircut in Jammu?',
        a: 'Yes — check live slots on TrimiT for same-day availability at salons/saloons near you.',
      },
    ],
    relatedPaths: ['/salons-in-jammu', '/mens-salon-jammu', '/beauty-parlours-jammu'],
  },
  {
    path: '/beard-trimming-jammu',
    title: "Beard Trimming Jammu | Men's Grooming Saloon — TrimiT",
    description:
      'Book beard trimming and grooming in Jammu. Expert barbers and gents saloons with online slots and reviews.',
    keywords: 'beard trimming Jammu, beard grooming Jammu, barber Jammu, saloon Jammu, gents saloon Jammu, men grooming Jammu',
    h1: 'Beard trimming & grooming saloon in Jammu',
    exploreQuery: 'beard',
    intro:
      "Get a sharp beard trim, shape, or hot-towel shave at men's grooming salons and barber saloons in Jammu. TrimiT connects you with barbers offering beard grooming in Jammu — book online 24/7.",
    faq: [],
    relatedPaths: ['/mens-salon-jammu', '/best-haircut-in-jammu'],
  },
  {
    path: '/spa-services-jammu',
    title: 'Spa Services Jammu | Book Spa & Massage Saloon — TrimiT',
    description:
      'Spa booking in Jammu — massages, wellness, and relaxation. Compare beauty salons & wellness saloons and book slots online.',
    keywords: 'spa Jammu, spa booking Jammu, spa services Jammu, massage Jammu, wellness saloon Jammu',
    h1: 'Spa & wellness services in Jammu',
    exploreQuery: 'spa',
    intro:
      "Book spa and wellness treatments in Jammu — from head massages to full body spa packages. TrimiT makes spa booking in Jammu simple with verified salons/saloons and instant confirmation.",
    faq: [],
    relatedPaths: ['/salons-in-jammu', '/beauty-parlours-jammu'],
  },
  {
    path: '/beauty-parlours-jammu',
    title: 'Beauty Parlours Jammu | Book Women Beauty Saloons — TrimiT',
    description:
      "Women's beauty parlours & beauty saloons in Jammu — facials, threading, waxing, and hair. Book online on TrimiT.",
    keywords: 'beauty parlour Jammu, women salon Jammu, beauty saloon Jammu, facial Jammu, beauty services Jammu',
    h1: 'Beauty parlours & women saloons in Jammu',
    exploreQuery: 'beauty parlour',
    intro:
      "Find women's beauty parlours and beauty saloons in Jammu for facials, threading, waxing, and styling. Read reviews, see prices, and book beauty parlour appointments in Jammu on TrimiT.",
    faq: [],
    relatedPaths: ['/bridal-makeup-jammu', '/best-haircut-in-jammu'],
  },
  {
    path: '/mens-salon-jammu',
    title: "Men's Salon & Gents Saloon Jammu | Grooming & Haircuts — TrimiT",
    description:
      "Men's salons & gents saloons in Jammu for haircuts, beard care, and grooming packages. Book online with TrimiT.",
    keywords: 'men salon Jammu, gents saloon Jammu, mens grooming Jammu, barber shop Jammu, barber saloon Jammu',
    h1: "Men's salon & gents saloon in Jammu",
    exploreQuery: 'men salon',
    intro:
      "Modern men's salons and gents saloons in Jammu for haircuts, beard grooming, and complete grooming packages. Book salon/saloon appointments online — no calls, no waiting.",
    faq: [],
    relatedPaths: ['/beard-trimming-jammu', '/best-haircut-in-jammu'],
  },
  {
    path: '/bridal-makeup-jammu',
    title: 'Bridal Makeup Jammu | Book Bridal Salons & Artists — TrimiT',
    description:
      'Bridal makeup services in Jammu — book trials and wedding day makeup artists or premium salons/saloons online on TrimiT.',
    keywords: 'bridal makeup Jammu, wedding makeup Jammu, bridal artist Jammu, bridal saloon Jammu',
    h1: 'Bridal makeup & styling in Jammu',
    exploreQuery: 'bridal makeup',
    intro:
      'Plan your wedding look with top bridal makeup artists and styling salons in Jammu. TrimiT helps you discover premium salons and saloons offering bridal makeup services in Jammu with reviews and online booking.',
    faq: [],
    relatedPaths: ['/beauty-parlours-jammu', '/spa-services-jammu'],
  },
];

export function getSeoPageByPath(pathname) {
  return SEO_PAGES.find((p) => p.path === pathname);
}

export const SEO_PAGE_PATHS = SEO_PAGES.map((p) => p.path);
