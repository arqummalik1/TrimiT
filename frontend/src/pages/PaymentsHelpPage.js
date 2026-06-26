import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FlowArrow,
  Wallet,
  Warning,
  ArrowsClockwise,
  Bank,
  Receipt,
  ShieldCheck,
  CaretRight,
  Headset,
} from '@phosphor-icons/react';
import {
  PAYMENTS_TOPICS,
  PAYMENTS_FAQ,
  PAYMENTS_HELP_META,
} from '../content/paymentsHelp';
import FaqSection from '../components/landing/sections/FaqSection';
import { SUPPORT_EMAIL, SUPPORT_PHONE, SUPPORT_PHONE_DISPLAY } from '../config/contact';

const ICONS = {
  flow: FlowArrow,
  wallet: Wallet,
  warning: Warning,
  refund: ArrowsClockwise,
  bank: Bank,
  receipt: Receipt,
  shield: ShieldCheck,
};

export default function PaymentsHelpPage() {
  return (
    <div className="min-h-screen bg-stone-50">
      {/* Hero */}
      <section className="relative py-16 sm:py-20 px-4 bg-gradient-to-br from-stone-900 to-orange-950 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <span className="text-xs font-bold tracking-[0.2em] uppercase text-orange-300">
            Help Center
          </span>
          <h1 className="font-heading text-3xl sm:text-4xl font-extrabold mt-4 mb-4 leading-tight">
            {PAYMENTS_HELP_META.title}
          </h1>
          <p className="text-stone-300 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
            {PAYMENTS_HELP_META.subtitle}
          </p>
        </div>
      </section>

      {/* Quick jump nav */}
      <section className="px-4 -mt-8 relative z-10">
        <div className="max-w-4xl mx-auto rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <nav className="flex flex-wrap gap-2" aria-label="Payment topics">
            {PAYMENTS_TOPICS.map((t) => (
              <a
                key={t.id}
                href={`#${t.id}`}
                className="inline-flex items-center gap-1 rounded-full border border-stone-200 px-3 py-1.5 text-sm text-stone-700 hover:border-orange-300 hover:text-orange-800 transition-colors"
              >
                {t.title}
                <CaretRight size={12} weight="bold" />
              </a>
            ))}
          </nav>
        </div>
      </section>

      {/* Topics */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {PAYMENTS_TOPICS.map((t, i) => {
            const Icon = ICONS[t.icon] ?? Receipt;
            return (
              <motion.article
                key={t.id}
                id={t.id}
                className="scroll-mt-24 rounded-2xl border border-stone-200 bg-white p-6 sm:p-8"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: Math.min(i * 0.04, 0.2) }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100 text-orange-800">
                    <Icon size={24} weight="duotone" />
                  </span>
                  <h2 className="font-heading text-xl font-bold text-stone-900">{t.title}</h2>
                </div>
                <ul className="space-y-3">
                  {t.points.map((p, idx) => (
                    <li key={idx} className="flex gap-3 text-stone-600 text-sm sm:text-base leading-relaxed">
                      <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-400" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </motion.article>
            );
          })}
        </div>
      </section>

      {/* FAQ */}
      <FaqSection items={PAYMENTS_FAQ} title="Payment FAQs" />

      {/* Contact support */}
      <section className="py-16 px-4 bg-stone-900 text-center">
        <Headset size={36} weight="duotone" className="text-orange-300 mx-auto mb-4" />
        <h2 className="font-heading text-2xl font-bold text-white mb-3">
          Still need help with a payment?
        </h2>
        <p className="text-stone-400 max-w-xl mx-auto mb-6 text-sm sm:text-base">
          Share your booking date and the amount, and our team will trace it for you.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-stone-900 rounded-full font-bold hover:bg-orange-50 transition-colors"
          >
            Email {SUPPORT_EMAIL}
          </a>
          <a
            href={`tel:${SUPPORT_PHONE}`}
            className="inline-flex items-center gap-2 px-6 py-3 border border-stone-600 text-stone-200 rounded-full font-bold hover:border-orange-300 hover:text-orange-300 transition-colors"
          >
            Call {SUPPORT_PHONE_DISPLAY}
          </a>
        </div>
        <p className="mt-6 text-stone-500 text-sm">
          Salon owner?{' '}
          <Link to="/for-salons" className="text-orange-300 hover:underline">
            See how payouts work
          </Link>
        </p>
      </section>
    </div>
  );
}
