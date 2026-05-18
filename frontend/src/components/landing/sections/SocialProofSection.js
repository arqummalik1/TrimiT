import React from 'react';
import { motion } from 'framer-motion';
import { Star } from '@phosphor-icons/react';
import { CUSTOMER_TESTIMONIALS, OWNER_TESTIMONIALS } from '../../../config/testimonials';

function ReviewCard({ name, text, meta, rating }) {
  return (
    <motion.div
      className="snap-center shrink-0 w-[85vw] sm:w-auto sm:min-w-0 rounded-2xl bg-white border border-stone-200 p-6 shadow-sm hover:shadow-lg transition-shadow"
      whileHover={{ y: -4 }}
    >
      {rating && (
        <div className="flex gap-0.5 mb-3">
          {Array.from({ length: rating }).map((_, i) => (
            <Star key={i} size={16} weight="fill" className="text-amber-500" />
          ))}
        </div>
      )}
      <p className="text-stone-700 text-sm leading-relaxed mb-4">&ldquo;{text}&rdquo;</p>
      <p className="font-heading font-bold text-stone-900 text-sm">{name}</p>
      <p className="text-xs text-stone-500 mt-0.5">{meta}</p>
    </motion.div>
  );
}

export default function SocialProofSection() {
  return (
    <section className="py-16 sm:py-24 px-4 bg-stone-50" aria-labelledby="social-proof-heading">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-xs font-bold tracking-[0.2em] uppercase text-orange-800">
            Trusted in Jammu
          </span>
          <h2
            id="social-proof-heading"
            className="font-heading text-3xl sm:text-4xl font-bold text-stone-900 mt-3"
          >
            Loved by customers & salon owners
          </h2>
        </div>
        <h3 className="font-heading text-lg font-bold text-stone-800 mb-4">Customers</h3>
        <div className="flex gap-4 overflow-x-auto snap-x pb-4 mb-12 sm:grid sm:grid-cols-3 sm:overflow-visible">
          {CUSTOMER_TESTIMONIALS.map((t) => (
            <ReviewCard
              key={t.name}
              name={t.name}
              text={t.text}
              meta={`${t.service} · ${t.location}`}
              rating={t.rating}
            />
          ))}
        </div>
        <h3 className="font-heading text-lg font-bold text-stone-800 mb-4">Salon owners</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          {OWNER_TESTIMONIALS.map((t) => (
            <ReviewCard key={t.name} name={t.name} text={t.text} meta={t.salon} />
          ))}
        </div>
      </div>
    </section>
  );
}
