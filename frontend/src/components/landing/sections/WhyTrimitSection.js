import React from 'react';
import { motion } from 'framer-motion';
import BentoFeatureCard from '../BentoFeatureCard';
import { WHY_TRIMIT_FEATURES } from '../../../config/whyTrimitFeatures';

export default function WhyTrimitSection() {
  return (
    <section className="py-20 sm:py-24 px-4 bg-white" aria-labelledby="why-trimit-heading">
      <motion.div
        className="max-w-6xl mx-auto text-center mb-12 sm:mb-16"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <span className="text-xs font-bold tracking-[0.2em] uppercase text-orange-800">
          Why TrimiT
        </span>
        <h2
          id="why-trimit-heading"
          className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-stone-900 mt-3 mb-4"
        >
          India&apos;s grooming marketplace for Jammu &amp; Kashmir
        </h2>
        <p className="text-stone-500 text-lg max-w-2xl mx-auto">
          Discover men&apos;s salons, beauty parlours, and unisex studios — book with live slots and
          pay at the venue. Live in Jammu today, expanding across India.
        </p>
      </motion.div>
      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {WHY_TRIMIT_FEATURES.map((f, i) => (
          <BentoFeatureCard key={f.title} {...f} index={i} />
        ))}
      </div>
    </section>
  );
}
