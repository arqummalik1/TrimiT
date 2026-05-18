export const BLOG_POSTS = [
  {
    slug: 'best-salon-booking-tips-jammu',
    title: '5 tips for booking salons in Jammu online',
    excerpt:
      'How to pick the right salon, compare slots, and get the best grooming experience in Jammu with TrimiT.',
    date: 'May 2026',
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
    body: `Jammu has excellent men's salons for haircuts, beard grooming, and full grooming packages. On TrimiT you can filter by service and book men's salon appointments online.

Popular services include fades and classic cuts, beard trim and hot towel shave, and combo packages that save time. Look for salons with high ratings near your neighbourhood, and book 24/7 even when the shop is closed.`,
  },
  {
    slug: 'spa-wellness-jammu',
    title: 'Spa booking in Jammu: relax with TrimiT',
    excerpt:
      'Massages, facials, and wellness treatments — how to find spa services in Jammu.',
    date: 'May 2026',
    body: `Spa and wellness centres in Jammu offer head massages, body treatments, and couple packages. TrimiT lets you browse spa services in Jammu, compare prices, and reserve your slot without waiting on hold.

Whether you need stress relief after work or a pre-event facial, search "spa" on TrimiT and book spa appointments in Jammu with instant confirmation.`,
  },
];

export function getPostBySlug(slug) {
  return BLOG_POSTS.find((p) => p.slug === slug);
}
