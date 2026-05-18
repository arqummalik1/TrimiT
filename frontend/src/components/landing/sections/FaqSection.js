import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CaretDown } from '@phosphor-icons/react';
import { HOMEPAGE_FAQ } from '../../../config/faq';

function FaqItem({ q, a, index }) {
  const [open, setOpen] = useState(index === 0);

  return (
    <div className="border-b border-stone-200 last:border-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 py-5 text-left"
        aria-expanded={open}
      >
        <span className="font-heading font-bold text-stone-900 pr-4">{q}</span>
        <CaretDown
          size={20}
          className={`shrink-0 text-orange-800 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <p className="text-stone-600 text-sm leading-relaxed pb-5">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FaqSection({ items = HOMEPAGE_FAQ, title = 'Salon booking in Jammu — FAQs' }) {
  return (
    <section className="py-16 sm:py-20 px-4 bg-white" aria-labelledby="faq-heading">
      <div className="max-w-3xl mx-auto">
        <h2 id="faq-heading" className="font-heading text-3xl font-bold text-stone-900 text-center mb-10">
          {title}
        </h2>
        <div>
          {items.map((item, i) => (
            <FaqItem key={item.q} q={item.q} a={item.a} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
