import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkle, HandHeart, ArrowRight, Timer } from '@phosphor-icons/react';
import { PROMO, isOfferActive } from '../../../config/promotions';

const CARDS = [
  {
    icon: HandHeart,
    badge: 'For Customers',
    title: 'Always Free',
    desc: 'Download the TrimiT app and start booking salons instantly. No subscription, no fees — ever.',
    cta: 'Download App Free',
    href: '/explore',
    accent: 'bg-emerald-50 border-emerald-200',
    badgeColor: 'bg-emerald-100 text-emerald-800',
    iconColor: 'text-emerald-600',
  },
  {
    icon: Sparkle,
    badge: 'For Salon Owners',
    title: '30 Days Free Trial',
    desc: 'List your salon, start accepting bookings, and manage everything digitally — completely free for one month.',
    cta: 'Start Free Trial',
    href: '/signup?role=owner',
    accent: 'bg-orange-50 border-orange-300',
    badgeColor: 'bg-orange-100 text-orange-800',
    iconColor: 'text-orange-700',
    highlight: true,
  },
];

export default function OffersSection() {
  if (!isOfferActive()) return null;

  return (
    <section className="py-16 px-4 bg-white" aria-label="Current offers">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col items-center text-center mb-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-100 text-orange-800 text-xs font-bold tracking-widest uppercase mb-3">
            <Timer size={14} weight="fill" />
            Limited Time Offer · Valid till June 30
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-stone-900">
            The Zomato of Salons — is here
          </h2>
          <p className="text-stone-500 mt-3 max-w-xl text-base">
            TrimiT is revolutionizing how Jammu &amp; Kashmir discovers and books salons. Get in early — before seats are gone.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {CARDS.map((card, i) => (
            <motion.div
              key={card.title}
              className={`rounded-2xl border-2 p-8 flex flex-col gap-4 ${card.accent} ${card.highlight ? 'shadow-xl shadow-orange-900/10' : ''}`}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="flex items-start justify-between">
                <card.icon size={36} weight="duotone" className={card.iconColor} />
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${card.badgeColor}`}>
                  {card.badge}
                </span>
              </div>
              <div>
                <h3 className="font-heading text-2xl font-bold text-stone-900">{card.title}</h3>
                <p className="text-stone-600 text-sm mt-2 leading-relaxed">{card.desc}</p>
              </div>
              <Link
                to={card.href}
                className={`mt-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-all ${
                  card.highlight
                    ? 'bg-orange-800 text-white hover:bg-orange-900 shadow-md shadow-orange-900/25'
                    : 'bg-stone-900 text-white hover:bg-stone-800'
                }`}
              >
                {card.cta}
                <ArrowRight size={18} weight="bold" />
              </Link>
            </motion.div>
          ))}
        </div>

        <p className="text-center text-xs text-stone-400 mt-6">
          {PROMO.urgencyText}
        </p>
      </div>
    </section>
  );
}
