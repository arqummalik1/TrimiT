import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Scissors, Sparkle, UsersThree, ArrowRight } from '@phosphor-icons/react';
import { MARKET_AUDIENCE_OPTIONS, audienceExplorePath } from '../../../config/marketAudience';
import { JAMMU_CITY } from '../../../config/jammu';

const ICONS = {
  cut: Scissors,
  sparkles: Sparkle,
  people: UsersThree,
};

export default function MarketAudienceSection() {
  return (
    <section
      className="py-20 sm:py-24 px-4 bg-stone-50"
      aria-labelledby="market-audience-heading"
    >
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="text-center mb-12 sm:mb-14"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="text-xs font-bold tracking-[0.2em] uppercase text-orange-800">
            One marketplace
          </span>
          <h2
            id="market-audience-heading"
            className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-stone-900 mt-3 mb-4"
          >
            Salons &amp; beauty parlours in {JAMMU_CITY.region}
          </h2>
          <p className="text-stone-500 text-lg max-w-2xl mx-auto leading-relaxed">
            TrimiT is built for every kind of grooming business — men&apos;s salons, women&apos;s
            beauty parlours, and unisex studios. Live in Jammu today, expanding to more cities across
            India.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-5 sm:gap-6">
          {MARKET_AUDIENCE_OPTIONS.map((option, index) => {
            const Icon = ICONS[option.icon];
            return (
              <motion.article
                key={option.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: index * 0.08, duration: 0.45 }}
                className="group"
              >
                <Link
                  to={audienceExplorePath(option)}
                  data-testid={`audience-card-${option.id}`}
                  className={`block h-full rounded-3xl bg-gradient-to-br ${option.gradient} p-6 sm:p-8 text-white border border-white/10 shadow-xl shadow-stone-900/10 hover:-translate-y-1 transition-transform duration-300`}
                >
                  <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center mb-6">
                    <Icon size={28} weight="duotone" className={option.accent} />
                  </div>
                  <h3 className="font-heading text-2xl font-bold mb-2">{option.title}</h3>
                  <p className="text-stone-300 text-sm leading-relaxed mb-6">{option.subtitle}</p>
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-orange-200 group-hover:gap-3 transition-all">
                    Browse in {JAMMU_CITY.label}
                    <ArrowRight size={18} weight="bold" />
                  </span>
                </Link>
              </motion.article>
            );
          })}
        </div>

        <motion.p
          className="text-center text-sm text-stone-500 mt-10 max-w-xl mx-auto"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          Not in Jammu yet? Join the waitlist when you sign up — we&apos;re rolling out city by city
          across India.
        </motion.p>
      </div>
    </section>
  );
}
