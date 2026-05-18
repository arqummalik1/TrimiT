import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkle, Clock, ShieldCheck, Star } from '@phosphor-icons/react';
import { ServiceCardImage } from '../ServiceCardImage';
import { explorePath } from '../../../config/jammu';

const TRENDING = [
  { name: 'Haircut & styling', icon: Sparkle, illustration: 'haircut', query: 'haircut', ring: 'ring-orange-200/60' },
  { name: 'Spa & wellness', icon: Clock, illustration: 'spa', query: 'spa', ring: 'ring-stone-200/80' },
  { name: 'Beard grooming', icon: ShieldCheck, illustration: 'beard', query: 'beard', ring: 'ring-amber-200/60' },
  { name: 'Skin & facial', icon: Star, illustration: 'facial', query: 'facial', ring: 'ring-rose-200/50' },
];

export default function TrendingServicesSection() {
  return (
    <section className="py-16 sm:py-20 px-4 bg-stone-50" aria-labelledby="trending-services-heading">
      <motion.div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <span className="text-xs font-bold tracking-[0.2em] uppercase text-orange-800">
            Trending
          </span>
          <h2
            id="trending-services-heading"
            className="font-heading text-3xl sm:text-4xl font-bold text-stone-900 mt-3"
          >
            Popular grooming services
          </h2>
        </div>
        <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible sm:pb-0 sm:mx-0 sm:px-0">
          {TRENDING.map((s, i) => (
            <Link
              key={s.name}
              to={explorePath({ q: s.query })}
              className={`snap-center shrink-0 w-[72vw] sm:w-auto relative aspect-[4/5] rounded-3xl overflow-hidden ring-1 ${s.ring} group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-stone-200`}
            >
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="h-full"
              >
                <ServiceCardImage type={s.illustration} alt={s.name} />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-900/20 to-transparent pointer-events-none" />
                <div className="absolute top-3 left-3 w-10 h-10 rounded-xl bg-white/95 shadow-md flex items-center justify-center">
                  <s.icon size={20} weight="duotone" className="text-orange-800" />
                </div>
                <h3 className="absolute bottom-0 left-0 right-0 p-4 font-heading text-lg font-bold text-white">
                  {s.name}
                </h3>
              </motion.div>
            </Link>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
