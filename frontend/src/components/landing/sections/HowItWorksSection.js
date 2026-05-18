import React from 'react';
import { motion } from 'framer-motion';
import BookingFlowAnimation from '../mockups/BookingFlowAnimation';

export default function HowItWorksSection() {
  return (
    <section className="py-20 sm:py-24 px-4 bg-white border-y border-stone-100" aria-labelledby="how-it-works-heading">
      <motion.div
        className="max-w-6xl mx-auto text-center mb-12"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        <span className="text-xs font-bold tracking-[0.2em] uppercase text-orange-800">
          How it works
        </span>
        <h2 id="how-it-works-heading" className="font-heading text-3xl sm:text-4xl font-bold text-stone-900 mt-3">
          Book in three simple steps
        </h2>
      </motion.div>
      <BookingFlowAnimation />
    </section>
  );
}
