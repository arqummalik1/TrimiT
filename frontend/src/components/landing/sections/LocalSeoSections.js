import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from '@phosphor-icons/react';
import { LOCAL_SEO_SECTIONS } from '../../../config/localSeoSections';
import { explorePath } from '../../../config/jammu';

export default function LocalSeoSections() {
  return (
    <section className="py-16 sm:py-24 px-4 bg-stone-50" aria-label="Salon categories in Jammu">
      <div className="max-w-6xl mx-auto space-y-16 sm:space-y-20">
        {LOCAL_SEO_SECTIONS.map((block, index) => (
          <motion.article
            key={block.id}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5 }}
            className={`grid lg:grid-cols-2 gap-8 items-center ${
              index % 2 === 1 ? 'lg:flex-row-reverse' : ''
            }`}
          >
            <div className={index % 2 === 1 ? 'lg:order-2' : ''}>
              <h2 className="font-heading text-2xl sm:text-3xl font-bold text-stone-900 mb-4">
                {block.heading}
              </h2>
              <p className="text-stone-600 leading-relaxed mb-6">{block.description}</p>
              <motion.div className="flex flex-wrap gap-3">
                <Link
                  to={explorePath({ q: block.exploreQuery })}
                  className="btn-primary inline-flex items-center gap-2 text-sm"
                >
                  Browse {block.id === 'women' ? 'beauty parlours' : block.id === 'mens' ? "men's salons" : 'businesses'}
                  <ArrowRight size={16} weight="bold" />
                </Link>
                <Link
                  to={block.seoPath}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-orange-800 border border-orange-200 hover:bg-orange-50"
                >
                  Learn more
                </Link>
              </motion.div>
            </div>
            <div
              className={`grid grid-cols-2 gap-3 ${index % 2 === 1 ? 'lg:order-1' : ''}`}
            >
              {block.cards.map((card, i) => (
                <Link
                  key={card}
                  to={explorePath({ q: card })}
                  className="rounded-2xl bg-white border border-stone-200 p-4 hover:shadow-lg hover:-translate-y-0.5 transition-all"
                >
                  <p className="font-heading font-bold text-stone-900 text-sm sm:text-base">
                    {card}
                  </p>
                  <p className="text-xs text-stone-500 mt-1">Jammu</p>
                </Link>
              ))}
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
