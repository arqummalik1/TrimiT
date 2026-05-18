import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Tag } from '@phosphor-icons/react';
import { explorePath } from '../../../config/jammu';

const OFFERS = [
  { title: 'First visit offers', desc: 'New salons in Jammu with introductory pricing' },
  { title: 'Combo grooming', desc: 'Haircut + beard packages at partner salons' },
  { title: 'Weekday slots', desc: 'Off-peak appointments with better availability' },
];

export default function OffersSection() {
  return (
    <section className="py-14 px-4 bg-gradient-to-b from-orange-50/80 to-stone-50" aria-label="Offers">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-2 mb-8">
          <Tag size={24} weight="duotone" className="text-orange-800" />
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-stone-900">
            Offers & discounts
          </h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {OFFERS.map((o, i) => (
            <Link
              key={o.title}
              to={explorePath()}
              className="rounded-2xl bg-white border border-orange-200/60 p-6 hover:shadow-lg transition-all"
            >
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
              >
                <span className="inline-block px-2 py-0.5 rounded-full bg-gradient-to-r from-orange-600 to-red-600 text-white text-xs font-bold mb-3">
                  Offer
                </span>
                <h3 className="font-heading font-bold text-stone-900">{o.title}</h3>
                <p className="text-sm text-stone-500 mt-2">{o.desc}</p>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
