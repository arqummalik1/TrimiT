import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Calendar, ChartBar, Bell, Tag, Storefront, ListChecks, Bank, CheckCircle } from '@phosphor-icons/react';
import OwnerGrowthSection from '../components/landing/sections/OwnerGrowthSection';
import DashboardMockup from '../components/landing/mockups/DashboardMockup';
import FaqSection from '../components/landing/sections/FaqSection';
import { OWNER_TESTIMONIALS } from '../config/testimonials';
import { PROMO, isOfferActive } from '../config/promotions';
import { PAYMENTS_FEES } from '../content/paymentsHelp';

const OWNER_FAQ = [
  {
    q: 'Is it free to list my salon on TrimiT?',
    a: 'Yes — salon owners can create a profile and list services for free. Start receiving online bookings through your dashboard.',
  },
  {
    q: 'What can I manage in the owner dashboard?',
    a: 'Bookings, services, salon profile, schedules, and customer notifications — all in one place.',
  },
  {
    q: 'How do customers find my salon?',
    a: 'Customers searching for salon booking in Jammu & Kashmir and related services discover your profile on TrimiT and book available slots.',
  },
];

const FEATURES = [
  { icon: Calendar, title: 'Booking calendar', text: 'See and manage all appointments in one view.' },
  { icon: ListChecks, title: 'Service management', text: 'Add services, prices, and durations easily.' },
  { icon: Bell, title: 'Notifications', text: 'Get alerted when customers book or cancel.' },
  { icon: ChartBar, title: 'Analytics', text: 'Track bookings and revenue trends.' },
  { icon: Bank, title: 'Direct bank payouts', text: 'Online payments settle straight to your bank account.' },
  { icon: Tag, title: 'Offers', text: 'Highlight promotions on your profile.' },
  { icon: Storefront, title: 'Digital profile', text: 'Photos, hours, and location for customers.' },
];

export default function ForSalonsPage() {
  return (
    <div className="min-h-screen bg-stone-50">
      <section className="relative py-20 sm:py-28 px-4 overflow-hidden bg-gradient-to-br from-stone-900 to-orange-950 text-white">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="text-xs font-bold tracking-[0.2em] uppercase text-orange-300">
              For salon owners
            </span>
            <h1 className="font-heading text-4xl sm:text-5xl font-extrabold mt-4 mb-6 leading-tight">
              Take your salon online with TrimiT
            </h1>
            <p className="text-stone-300 text-lg leading-relaxed mb-8">
              Get more bookings, accept appointments 24/7, and manage your salon digitally. Join
              India&apos;s modern salon booking platform — list your salon for free in Jammu &amp; Kashmir.
              {isOfferActive() && (
                <span className="block mt-3 text-orange-300 font-semibold text-base">
                  🎉 Limited Offer: First 30 days completely free. Offer ends June 30.
                </span>
              )}
            </p>
            <Link
              to={PROMO.ctaPath}
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-orange-900 rounded-full font-bold hover:bg-orange-50"
            >
              {isOfferActive() ? PROMO.ctaLabel : 'List your salon free'}
              <ArrowRight size={20} weight="bold" />
            </Link>
          </motion.div>
          <DashboardMockup className="w-full max-w-md mx-auto" />
        </div>
      </section>

      <section className="py-20 px-4 bg-white">
        <motion.div className="max-w-6xl mx-auto">
          <h2 className="font-heading text-3xl font-bold text-stone-900 text-center mb-12">
            Everything to grow your salon business
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                className="rounded-2xl border border-stone-200 p-6 hover:shadow-lg transition-shadow"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <f.icon size={32} weight="duotone" className="text-orange-800 mb-4" />
                <h3 className="font-heading font-bold text-stone-900 mb-2">{f.title}</h3>
                <p className="text-stone-600 text-sm">{f.text}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      <OwnerGrowthSection compact />

      {/* Payments band — commission-based, free to join, paid to your bank */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-xs font-bold tracking-[0.2em] uppercase text-orange-700">
              Payments
            </span>
            <h2 className="font-heading text-3xl font-bold text-stone-900 mt-3 mb-3">
              Free to join. Get paid straight to your bank.
            </h2>
            <p className="text-stone-600 max-w-2xl mx-auto">
              No monthly subscription, no setup fees. We only earn when you do — a small
              commission on online payments. Everything else is yours.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                title: 'No monthly fees',
                text: 'List your salon and take bookings for free. No subscription, ever-present or hidden.',
              },
              {
                title: 'Money to your bank',
                text: 'Online payments settle directly into your registered bank account. TrimiT never holds your money.',
              },
              {
                title: `Only ~${PAYMENTS_FEES.totalPercent}% per online booking`,
                text: `${PAYMENTS_FEES.trimitPercent}% TrimiT + ${PAYMENTS_FEES.gatewayPercent}% payment gateway. You keep about ${PAYMENTS_FEES.netPercent}%. Shown clearly, no surprises.`,
              },
            ].map((c) => (
              <div key={c.title} className="rounded-2xl border border-stone-200 p-6">
                <CheckCircle size={28} weight="fill" className="text-green-600 mb-3" />
                <h3 className="font-heading font-bold text-stone-900 mb-2">{c.title}</h3>
                <p className="text-stone-600 text-sm leading-relaxed">{c.text}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link
              to="/help/payments"
              className="inline-flex items-center gap-1.5 text-orange-800 font-semibold hover:underline"
            >
              See how payments &amp; payouts work
              <ArrowRight size={18} weight="bold" />
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-stone-50">
        <div className="max-w-3xl mx-auto grid sm:grid-cols-2 gap-6">
          {OWNER_TESTIMONIALS.map((t) => (
            <blockquote
              key={t.name}
              className="rounded-2xl bg-white border border-stone-200 p-6"
            >
              <p className="text-stone-600 text-sm italic">&ldquo;{t.text}&rdquo;</p>
              <footer className="mt-4 font-heading font-bold text-stone-900 text-sm">
                {t.salon}
              </footer>
            </blockquote>
          ))}
        </div>
      </section>

      <FaqSection items={OWNER_FAQ} title="Questions from salon owners" />

      <section className="py-16 px-4 bg-orange-800 text-center">
        <h2 className="font-heading text-3xl font-bold text-white mb-6">
          Ready to get discovered in Jammu &amp; Kashmir?
        </h2>
        <Link
          to={PROMO.ctaPath}
          className="inline-flex items-center gap-2 px-8 py-4 bg-white text-orange-800 rounded-full font-bold"
        >
          {isOfferActive() ? PROMO.ctaLabel : 'Start free today'}
          <ArrowRight size={20} weight="bold" />
        </Link>
      </section>
    </div>
  );
}
