import React from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, CaretRight } from '@phosphor-icons/react';
import { getSeoPageByPath } from '../../config/seoPages';
import SalonCard from '../../components/salon/SalonCard';
import { usePublicSalons } from '../../hooks/usePublicSalons';
import FaqSection from '../../components/landing/sections/FaqSection';
import { explorePath } from '../../config/jammu';
import StickyMobileCta from '../../components/landing/StickyMobileCta';

export default function SeoCategoryPage() {
  const { pathname } = useLocation();
  const page = getSeoPageByPath(pathname);
  const { data: salons, isLoading } = usePublicSalons({
    search: page?.exploreQuery || '',
    limit: 6,
  });

  if (!page) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <section className="bg-gradient-to-b from-orange-50 to-stone-50 border-b border-stone-200">
        <motion.div className="max-w-6xl mx-auto px-4 py-10 sm:py-14">
          <nav
            className="hidden lg:flex items-center gap-1 text-sm text-stone-500 mb-6"
            aria-label="Breadcrumb"
          >
            <Link to="/" className="hover:text-orange-800">
              Home
            </Link>
            <CaretRight size={14} />
            <span className="text-stone-800">{page.h1}</span>
          </nav>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-stone-900 mb-4">
              {page.h1}
            </h1>
            <p className="text-stone-600 text-lg max-w-3xl leading-relaxed mb-6">{page.intro}</p>
            <Link
              to={explorePath({ q: page.exploreQuery })}
              className="btn-primary inline-flex items-center gap-2"
            >
              Browse all salons
              <ArrowRight size={18} weight="bold" />
            </Link>
          </motion.div>
          {page.relatedPaths?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-8">
              {page.relatedPaths.map((path) => (
                <Link
                  key={path}
                  to={path}
                  className="text-sm px-3 py-1.5 rounded-full bg-white border border-stone-200 text-stone-700 hover:border-orange-300 capitalize"
                >
                  {path.replace(/^\//, '').replace(/-/g, ' ')}
                </Link>
              ))}
            </div>
          )}
        </motion.div>
      </section>

      <section className="py-12 px-4 max-w-6xl mx-auto">
        <h2 className="font-heading text-2xl font-bold text-stone-900 mb-6">Available salons</h2>
        {isLoading ? (
          <motion.div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="aspect-[4/3] rounded-2xl bg-stone-200 animate-pulse" />
            ))}
          </motion.div>
        ) : salons?.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {salons.map((salon) => (
              <SalonCard key={salon.id} salon={salon} />
            ))}
          </div>
        ) : (
          <p className="text-stone-500">
            More salons joining soon.{' '}
            <Link to={explorePath()} className="text-orange-800 font-semibold">
              Explore all listings
            </Link>
          </p>
        )}
      </section>

      {page.faq?.length > 0 && <FaqSection items={page.faq} title={`${page.h1} — FAQ`} />}
      <StickyMobileCta />
    </>
  );
}
